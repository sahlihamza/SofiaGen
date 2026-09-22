# Système de notifications — documentation technique

## Architecture

```
Business event (controller/service)
      │  emitEvent("order.created", { storeId, entityId, metadata, actorId, actionUrl })
      ▼
eventBus (src/lib/eventBus.js — Node EventEmitter)
      │
      ▼
NotificationEventHandler (src/service/NotificationEventHandler.js)
      │  EVENT_CONFIG[event] → { entityType, category, priority, scope, roles? }
      │  resolveRecipients(scope, storeId/userId, roles) → [userId, ...]
      ▼
NotificationService.notify() (src/service/notificationService.js)
      │  loads NotificationTemplate, resolves per-recipient channels
      │  (preferences + critical-category enforcement), renders fr/en/ar,
      │  writes Notification + NotificationDelivery + NotificationLog
      ▼
NotificationDispatcher (src/service/NotificationDispatcher.js)
      ├── InAppChannel  → socket.io push (src/lib/socket.js) + DB row (sent immediately)
      ├── EmailChannel  → EmailProvider (src/lib/EmailProvider.js), RTL-aware
      └── PushChannel   → not implemented yet (Phase 3), throws so the delivery
                           row records a "failed" attempt instead of silently
                           pretending to succeed
```

Email/push deliveries are recorded `pending` and picked up asynchronously by
`src/jobs/notificationDeliveryJob.js` (retry, exponential backoff, max 3
attempts) — nothing in the HTTP request path waits on a network call.

## Who gets notified, for what (plain-language summary)

- **Super Admin / `platform_admin`** — store lifecycle: created, updated,
  suspended, activated, deleted. Also system errors and security alerts
  (`system.error`, `security.alert`) — declared but not triggered by
  anything yet, see "Not wired" below.
- **A store's staff, by role** (`scope: "store"` + `roles` in `EVENT_CONFIG`)
  — orders, payments, invoices, subscription, low/out-of-stock, new
  customers/reviews, new team members. Only the roles listed for that event
  get it (e.g. payments → `adminstore` + `Accountant`, not every cashier);
  no `roles` list means every staff member of the store.
- **One specific staff member** (`scope: "user"`) — their own security
  events only: successful login, failed login attempt, password changed.
  Never broadcast to the rest of the store.
- **A customer** (`recipientModel: "Customer"`, triggered by direct
  `notify()` calls, not `EVENT_CONFIG`) — their order was confirmed, their
  order's status changed, their review got approved. Nothing else reaches
  customers today (no payment/invoice/admin-only events).

## Adding a new event

1. Add an entry to `EVENT_CONFIG` in `NotificationEventHandler.js`:
   ```js
   "invoice.overdue": { entityType: "invoice", category: "invoices", scope: "store", priority: "high", roles: ["adminstore", "Accountant"] },
   ```
   - `scope: "platform"` → Super Admin + `userType: "platform_admin"`.
   - `scope: "store"` → every staff user of `payload.storeId` (or only the
     listed `roles`, matched case-insensitively against `Role.name`).
   - `scope: "user"` → only `payload.userId` (self-notifications: security,
     password changes).
2. Add template content (fr/en/ar title + message + variables + default
   channels) to `TEMPLATE_CONTENT` in
   `src/script/seedNotificationTemplates.js`, then re-run:
   ```bash
   node src/script/seedNotificationTemplates.js
   ```
3. Call `emitEvent("your.event", { storeId, entityId, actorId, metadata, actionUrl })`
   at the point in the controller/service where the business action actually
   happens. Never call it synchronously in a way that blocks the response —
   `emitEvent` itself is fire-and-forget, but avoid awaiting slow work before
   it in the same request/response cycle.

A Super Admin can also disable/reconfigure a template's channels at runtime
via `/api/platform/notification-templates` without touching code.

## Recipient resolution and multi-store isolation

- Store-scope recipients are the union of `User.storeIds` and the
  `UserStore` junction table (the codebase populates these inconsistently
  depending on which code path created the user — `getStoreStaffIds` merges
  both rather than trusting one).
- Every personal-inbox endpoint (`/api/notifications/*`) filters strictly on
  `recipientId: req.user._id`. A user can never read/update/delete another
  user's notification even with a known id — there is no `storeId`-based
  bypass, ownership is the only check that matters for those routes.
- Platform-wide endpoints (`/api/platform/notifications`,
  `/api/platform/notification-templates`) require the `notifications.manage`
  / `notifications.view` permission codes (Super Admin bypasses as usual via
  `requirePermission`).

## Preferences

`NotificationPreference` stores `{ userId, storeId, preferences: Map<category, {in_app, email, push}> }`.
`security` (see `CRITICAL_CATEGORIES` in `src/models/NotificationPreference.js`)
can never be muted on `in_app`/`email` — enforced both when resolving
channels to send (`computeChannels` in `notificationService.js`, pure/unit
tested) and when a user saves their preferences
(`notificationPreferenceController.updatePreferences` force-overwrites those
two channels back to `true`).

## Deduplication

Auto-generated key: `event:entityId:recipientId:⌊now/5min⌋`. The 5-minute
bucket exists specifically so a **recurring** event on the same entity (e.g.
`subscription.renewed` fired every billing cycle for the same
`subscriptionId`) isn't permanently blocked after its first occurrence —
only true replays within the same short window (webhook retries, double
submits) are deduplicated. Pass an explicit `deduplicationKey` when a caller
needs exact-once semantics over a longer window (see
`subscriptionExpiryJob.js`'s day-bucketed key for `subscription.expiring`).

## Real-time

`src/lib/socket.js` — one Socket.IO room per recipient: `user:<id>` for
staff/admin, `customer:<id>` for storefront customers (two prefixes, not one
shared namespace, since `User` and `Customer` are separate collections). The
client (admin's `useNotification` hook, store's `useCustomerNotification`
hook) connects, emits `join` with its own room name, and listens for
`notification.created` (`{ notification, unreadCount }`).

## Two audiences: staff (`User`) and customers (`Customer`)

`Notification.recipientModel` / `NotificationDelivery.recipientModel`
(`"User"` | `"Customer"`, `refPath`) say which collection `recipientId`
points to. `NotificationService.notify({ recipients, recipientModel, ... })`
loads from the right model, resolves locale from either shape
(`user.preferences.language` or `customer.language`), and picks the right
socket room. Customers have no preferences UI yet, so `resolveChannelsForRecipient`
skips the `NotificationPreference` lookup entirely for them and just uses
whatever channels the template enables.

Customer-facing events are **not** in `NotificationEventHandler.EVENT_CONFIG`
— they're triggered by a direct `notificationService.notify({ recipients: [customerId], recipientModel: "Customer", ... })`
call at the exact point the staff-facing event also fires (different
audience needs different message content, so they're separate template
codes, not a re-use of the staff one):
- `customer.order_confirmed` — `checkoutService.js`, right after checkout,
  skipped for guests (no account to notify in-app).
- `customer.order_status_updated` — `orderController.updateOrder`, alongside
  the staff `order.cancelled`/`order.completed`/`order.updated` event.
- `customer.review_approved` — `productReviewService.notifyReviewApproved`,
  alongside the legacy `Notification.create({ customerId, ... })` call (kept
  for back-compat with anything still reading that field directly).

**Customer API**: `/api/customer/notifications` (list, unread-count,
mark-read, mark-all-read, delete), guarded by
`middleware/customerAuth.js`'s `requireCustomer` (sets `req.customer`, a
different auth scheme than staff's `isAuth`/`loadUser` — same JWT secret,
different collection, do not mix them up). Store frontend:
`store/src/hooks/useCustomerNotification.js` (socket + REST) and a bell in
`store/src/layout/navbar/Navbar.js`, full list at `/user/notifications`.

## What's wired vs. templated-only

Every event in `EVENT_CONFIG` (plus the 3 customer-facing ones above) has a
template and works if you call `NotificationService.notify()` or
`emitEvent()` for it manually. Real `emitEvent()`/`notify()` call sites exist
today for:

store.\* (create/update/suspend/activate/delete) · user.created/invited/updated ·
order.created/updated/cancelled/completed · payment.paid/failed/refunded ·
invoice.created/paid/overdue · subscription.created/renewed/cancelled/expiring/expired ·
product.created/updated/low_stock/out_of_stock · customer.created/updated ·
review.created/approved/rejected · security.new_login/failed_login/password_changed ·
customer.order_confirmed/order_status_updated/review_approved (customer audience)

**Not wired** (documented, not silently dropped):
- `ticket.*` — no support/ticketing subsystem exists in this codebase.
- `security.new_device`, `security.alert`, `system.error` — no device
  fingerprinting or centralized error-reporting hook exists to trigger them.
- `payment.refunded` uses a new **manual** refund action
  (`POST /api/payments/:id/refund`, permission `payments.refund`) since this
  project has no real payment-gateway refund integration (only the "manual"
  gateway is actually implemented) — it's a status transition + notification,
  not a real Stripe/PayPal refund call.

## Jobs (opt-in via `.env`, off by default)

- `ENABLE_NOTIFICATION_DELIVERY_JOB=true` — retries pending email/push
  deliveries, archives expired notifications (`expiresAt` passed).
- `ENABLE_SUBSCRIPTION_EXPIRY_JOB=true` — warns 7 days before
  `currentPeriodEnd`, expires subscriptions past it, marks invoices past
  `dueDate` as `overdue`.

## Known gaps / honest limitations

- **Push (Phase 3) and SMS/WhatsApp (Phase 4)** are scaffolded
  (`NotificationDispatcher.channels.push` exists, throws
  "not implemented yet") but not built — per the spec's own phased rollout.
- **Customer-facing notifications**: implemented for 3 real triggers (order
  confirmation, order status change, review approved) — see the section
  above. Preferences and critical-category enforcement are staff-only for
  now (customers just get whatever the template enables); extending
  `NotificationPreference` to customers would mean adding a `recipientModel`
  there too, not done here.
- **Automated tests**: `src/service/notificationService.test.js` covers pure
  logic (template rendering/escaping, event↔template completeness,
  preference/critical-category resolution) with Node's built-in test runner,
  matching every sibling `*.test.js` file's convention in this repo.
  Running any of them (mine or pre-existing ones) via `npm test` currently
  fails with `ReferenceError: test is not defined` — this is a **pre-existing,
  repo-wide** environment issue, not something introduced here (verified: every
  existing `*.test.js` file fails identically). Separately, `jest.config.js`
  and `tests/setup.js`/`teardown.js` point at a real MongoDB
  (`mongodb://localhost:27017/sofiagen_test`, confirmed reachable) for
  integration-style tests, but `jest`/`supertest` are not installed and
  `tests/unit/health.test.js` imports `../src/index` as an Express app even
  though `index.js` doesn't export one — that whole harness was scaffolded
  and never finished. Making cross-store-isolation/permission-403 style
  integration tests actually runnable means fixing that test infrastructure
  first; it's a pre-existing gap, not specific to notifications, and wasn't
  fixed here to avoid destabilizing an unrelated part of the project.
