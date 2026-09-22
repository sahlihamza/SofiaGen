const mongoose = require("mongoose");
const OrderItem = require("../models/OrderItem");
const { allocate } = require("./orderItemService");

// Editing an order after it was placed.
//
// The checkout owns the amounts of a *new* order (catalogue prices, coupon
// engine, tax service, shipping zones). None of that applies here: a back-office
// correction is deliberate  a wrong quantity, a gesture on the price, a line
// that was never shipped  so the amounts the admin types are what the order
// becomes. What this service refuses to do is let the client tell it the
// totals: those are always recomputed from the lines, with the same formulas
// checkoutService used, so an edited order stays arithmetically sound.

const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const num = (value) => Number(value) || 0;

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

// checkoutService writes
//   total = subTotal  discount + shipping + (pricesIncludeTax ? 0 : tax)
// but the order does not keep `pricesIncludeTax`, so where the VAT sits is read
// back off the amounts that were actually charged: whichever of the two
// formulas reproduces `total` is the one this store uses. A tax-free order
// answers "on top", which costs nothing since its VAT is 0 either way.
const taxIsAddedOnTop = (order) => {
  const base = round2(
    num(order.subTotal) - num(order.discount) + num(order.shippingCost)
  );
  const withTax = round2(base + num(order.tax));

  return (
    Math.abs(num(order.total) - withTax) <= Math.abs(num(order.total) - base)
  );
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Validates and normalises the lines the back-office sent.
 *
 * `productId` is mandatory: order_items is the relational view every report
 * reads and the column is required there, so a line that cannot be attached to
 * a product would silently vanish from it and leave the two representations of
 * the same order disagreeing. Failing loudly is the lesser evil.
 */
const normaliseLines = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, "Une commande doit contenir au moins un produit.");
  }

  return items.map((item, index) => {
    const position = index + 1;

    if (!isObjectId(item?.productId)) {
      throw httpError(
        400,
        `Ligne ${position} : produit inconnu, sélectionnez-le  nouveau.`
      );
    }

    const productName = String(item?.productName || "").trim();
    if (!productName) {
      throw httpError(400, `Ligne ${position} : le nom du produit est vide.`);
    }

    const quantity = Math.floor(Number(item?.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw httpError(
        400,
        ` ${productName}  : la quantité doit être au moins 1.`
      );
    }

    const unitPrice = round2(item?.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw httpError(400, ` ${productName}  : prix unitaire invalide.`);
    }

    const lineTotal = round2(unitPrice * quantity);
    // A line with no reduction is the normal case, so an absent one is 0
    // rather than an error  unlike the price, which must be stated.
    const discount = round2(item?.discount ?? 0);
    if (!Number.isFinite(discount) || discount < 0) {
      throw httpError(400, ` ${productName}  : réduction invalide.`);
    }
    if (discount > lineTotal) {
      throw httpError(
        400,
        ` ${productName}  : la réduction dépasse le total de la ligne.`
      );
    }

    return {
      productId: item.productId,
      variationId: isObjectId(item?.variationId) ? item.variationId : null,
      productName,
      sku: String(item?.sku || "").trim(),
      quantity,
      unitPrice,
      discount,
      lineTotal,
      total: round2(lineTotal - discount),
    };
  });
};

/**
 * The order-level amounts implied by the lines.
 *
 * `subTotal` stays what it has always been  the lines before any reduction 
 * and the order's `discount` is the sum of the line reductions, which is the
 * invariant orderItemService already maintains ( item.discount === discount).
 * So there is exactly one place a reduction is entered: the line.
 *
 * The VAT is *scaled*, not recomputed: an order does not remember which lines
 * were exempt, whether the shipping fee was taxable, nor whether the catalogue
 * prices already contained the tax. Moving it with the taxable base preserves
 * all three, where `base  taxRate` would quietly overwrite them.
 */
const computeAmounts = (order, lines, shippingCost) => {
  const subTotal = round2(
    lines.reduce((sum, line) => sum + line.lineTotal, 0)
  );
  const discount = round2(
    lines.reduce((sum, line) => sum + line.discount, 0)
  );

  const previousBase = round2(
    num(order.subTotal) - num(order.discount) + num(order.shippingCost)
  );
  const base = Math.max(0, round2(subTotal - discount + shippingCost));

  const tax =
    previousBase > 0 ? Math.max(0, round2((num(order.tax) * base) / previousBase)) : 0;

  const total = Math.max(
    0,
    round2(base + (taxIsAddedOnTop(order) ? tax : 0))
  );

  return { subTotal, discount, tax, total };
};

// The shape the invoice PDF, the e-mail templates and the best-seller
// aggregation read (`$unwind: "$cart"`), rebuilt from the edited lines so the
// embedded copy never lags behind order_items.
const toCartLines = (lines) =>
  lines.map((line) => ({
    id: String(line.productId),
    productId: String(line.productId),
    variationId: line.variationId ? String(line.variationId) : null,
    title: line.productName,
    sku: line.sku,
    price: line.unitPrice,
    quantity: line.quantity,
    itemTotal: line.lineTotal,
  }));

// order_items rows, with the VAT spread over the lines the same way
// orderItemService does at checkout: proportionally to what each line is worth
// after its reduction, and never counting the share the shipping fee carries.
const toOrderItems = (orderId, lines, { tax, shippingCost, base }) => {
  const itemsTax =
    base > 0
      ? round2((tax * Math.max(0, base - shippingCost)) / base)
      : 0;

  const taxes = allocate(
    itemsTax,
    lines.map((line) => line.total)
  );

  return lines.map((line, index) => ({
    orderId,
    productId: line.productId,
    variationId: line.variationId,
    productName: line.productName,
    sku: line.sku,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount: line.discount,
    tax: taxes[index],
    total: line.total,
  }));
};

// Only the address fields the order snapshot holds. Anything else the client
// sends  an _id, a stray flag  is dropped rather than written.
const ADDRESS_FIELDS = [
  "name",
  "email",
  "contact",
  "phone",
  "company",
  "address",
  "city",
  "state",
  "country",
  "zipCode",
];

const toAddress = (info = {}) =>
  ADDRESS_FIELDS.reduce((address, field) => {
    address[field] = String(info?.[field] ?? "").trim();
    return address;
  }, {});

/**
 * Applies a back-office edit to `order` (a loaded document, not saved here) and
 * returns the order_items rows that replace the current ones.
 *
 * @param {object} order - the Order document being edited
 * @param {object} payload - what the back-office sent
 * @returns {{items: Array}}
 */
const applyEdit = (order, payload = {}) => {
  const lines = normaliseLines(payload.items);

  const shippingCost = round2(payload.shippingCost);
  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    throw httpError(400, "Frais de livraison invalides.");
  }

  const paymentMethod = String(payload.paymentMethod || "").trim();
  if (!paymentMethod) {
    throw httpError(400, "Le mode de paiement est obligatoire.");
  }

  // Called before the document is mutated: the VAT is scaled against the
  // amounts that were actually charged.
  const { subTotal, discount, tax, total } = computeAmounts(
    order,
    lines,
    shippingCost
  );

  const base = Math.max(0, round2(subTotal - discount + shippingCost));
  const items = toOrderItems(order._id, lines, { tax, shippingCost, base });

  const shipping = toAddress(
    payload.user_info === undefined ? order.user_info : payload.user_info
  );
  const billing = toAddress(
    payload.billing_info === undefined
      ? order.billing_info || order.user_info
      : payload.billing_info
  );

  order.cart = toCartLines(lines);
  order.subTotal = subTotal;
  order.discount = discount;
  // Kept in step with `discount`: the two have always held the same amount.
  order.discountAmount = discount;
  order.shippingCost = shippingCost;
  order.tax = tax;
  order.total = total;
  order.paymentMethod = paymentMethod;
  order.user_info = shipping;
  order.billing_info = billing;
  order.billingSameAsShipping = ADDRESS_FIELDS.every(
    (field) => shipping[field] === billing[field]
  );

  return { items };
};

/**
 * Replaces an order's lines. order_items rows are immutable by design, so an
 * edit is a delete-then-insert rather than an update  the previous rows
 * described a state of the order that no longer exists.
 */
const replaceItems = async (orderId, items) => {
  await OrderItem.deleteMany({ orderId });
  if (items.length === 0) return [];
  return OrderItem.insertMany(items);
};

module.exports = {
  applyEdit,
  replaceItems,
  // exported for tests
  normaliseLines,
  computeAmounts,
  taxIsAddedOnTop,
  round2,
};
