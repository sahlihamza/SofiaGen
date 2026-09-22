# Print Labels (SFG-155)

Packing Label and Packing Manifest generation for the Orders module: a Store
Owner selects one or more orders and prints the delivery paperwork that goes on
the parcel and into the carrier's hands.

Depends on SFG-154: the tracking number printed and encoded in the barcode is
the real one from `Shipment.trackingNumber`, never the legacy locally-generated
`Order.trackingId` (that one is printed as an internal reference only).

## Endpoints

All are mounted on the existing `/api/orders` router, so they inherit its
`isAuth → loadUser → resolveAuthorizationContext → requireStoreAccess` chain,
plus the new `Orders.print_label` permission.

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| POST | `/api/orders/labels` | `{ orderIds: [...], format?, download? }` | `application/pdf` — one page per order |
| POST | `/api/orders/labels/manifest` | `{ orderIds: [...], download? }` | `application/pdf` — one A4 recap table |
| POST | `/api/orders/labels/printed` | `{ orderIds: [...] }` | JSON — label rows moved to `printed` |
| GET | `/api/orders/labels/status` | `?orderIds=id1,id2` | JSON — label state per order |
| GET | `/api/orders/:id/label` | `?format=&download=1` | `application/pdf` — single label |

`format` is `a4` (default) or `label_10x15` (100×150 mm thermal sheet). When it
is omitted the store's `labelSettings.format` is used. Adding a third format is
one entry in `PAGE_FORMATS` + `STYLES` in `src/service/LabelGenerationService.js`.

Maximum 100 orders per request.

## Permission

`Orders.print_label` → code `orders.print.label` (the RBAC normalizer turns `_`
into `.`). It is a store-scoped permission, so every "all store permissions"
role — Store Owner, CEO, Manager — picks it up automatically. Deploy needs:

```bash
npm run seed-permissions     # inserts the new permission
npm run resync-store-roles   # grants it to the existing system roles
```

## Multi-store isolation

The store is taken from `req.authContext.storeId` (the membership the caller is
authenticated into), never from the request. Every read — orders, shipments,
COD rows, labels — is filtered on it, so an order id belonging to another store
answers exactly like a made-up one: `404`, with an identical message. A mixed
selection containing one foreign order fails as a whole and writes nothing.

Sending `storeId` in the body does not switch stores: the authorization context
resolves the caller's permissions in that store, and with no membership there
the request is refused with `403`.

## Label lifecycle

`pending → label_generated → printed`, stored in `order_labels`
(`src/models/OrderLabel.js`), one row per order.

It is deliberately separate from `Order.status`: **generating or printing a
label never sets an order to `Shipped`**. Handing the parcel to the carrier
stays a distinct action in the Orders screen. Regenerating a label that was
already printed keeps it `printed`; `/labels/printed` refuses (`409`) an order
whose label has never been generated.

## Carrier templates

Nothing carrier-specific is hardcoded. `CarrierProvider.labelTemplate` carries
`logoUrl`, `brandColor`, `routingText` and `footerNote`; a provider without one
(internal fleet included) gets the generic layout, falling back to the
provider's own `logoUrl`/`brandColor`. `routingText` is what prints the carrier's
internal routing line — e.g. First Delivery's `Centrale >> ---- Dispatch ---- >>
Centrale`.

Only `data:image/...` logos are embedded. Fetching a remote logo would put an
outbound HTTP call on the path of a PDF the browser is already waiting on.

## Decisions on the ticket's open questions

| Case | Behaviour |
| --- | --- |
| Order with no `Shipment` (no tracking) | Prints a **draft**: `BON DE LIVRAISON N° NON ATTRIBUÉ`, a `BROUILLON` banner, no barcode. Never blocks — printing a barcode for a number no carrier issued is worse than printing none. |
| Order with no carrier | Same draft path; the header reads `Non assigné` and the generic template is used. |
| Missing phone / address | Printed as `N/A`; never an error. |
| Non-COD order | The "montant à encaisser" line is hidden entirely, not printed as 0. |
| Refunded order | Still printable (it is the return case), with a `COMMANDE REMBOURSÉE` banner and no amount to collect. |
| Mixed carriers in one selection | Each label uses its own template; the manifest header says `Plusieurs transporteurs (n)` and the per-row Transporteur column carries the truth. |
| More item lines than the sheet holds | The label continues on a following page headed `<réf> — suite (n/total)`. |
| Very long address | Truncated with an ellipsis at the width of its box — nothing ever overflows the frame. |
| Page order | The order the ids were sent in (the selection order), de-duplicated, first occurrence wins. Never MongoDB's natural order. |

## COD amount

A `CodCollection` row for the order is authoritative (`amountExpected`).
Without one, an order whose payment method looks like cash/COD and whose
`paymentStatus` is not `paid`/`refunded` is treated as COD for `order.total`.
The manifest's total is the sum over the selection, and its parcel count is the
number of selected orders that actually have a shipment.

## Data model additions

- `Store.taxId` — "Matricule Fiscal / CIN", legally required on a Tunisian bon
  de livraison (circulaire n° 2019-8 du 25/02/2019). Printed when configured.
- `Store.phone`, `Store.email` — sender contact block (both were already being
  `populate()`d by invoiceController against fields that did not exist).
- `Store.labelSettings.format` — the store's default print format.
- `CarrierProvider.labelTemplate` — see above.
- `OrderLabel` — the label lifecycle collection.

## Dependencies

`bwip-js` (Code 128 barcode → PNG buffer) is the only new package. PDF
generation reuses `pdfkit`, already used by InvoiceService, analyticsExportService
and AuditService.

## Tests

```bash
npx jest tests/unit/services/labelGenerationService.test.js \
         tests/unit/controllers/orderLabelController.test.js --runInBand
```

The controller suite mounts the real router behind the real guard chain, so the
403/404 cases are proven end to end rather than asserted on the middleware in
isolation.
