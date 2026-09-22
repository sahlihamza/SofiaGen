# Internal Notes — Technical Documentation

> **Audience**: backend + admin developers
> **Scope**: V1 — internal annotation system attached to any resource
> **Status**: ✅ Implemented (DoD checklist in §10)

---

## 1. Purpose

A transversal comments / memos layer for the back-office. Notes are visible
**only to internal staff**, never to the end customer (no storefront,
no customer-side reads).

The same panel can be mounted on any resource page (order, customer, product,
ticket, shipment, invoice, store) thanks to a polymorphic `entityType` /
`entityId` pair.

## 2. Architecture

```
┌─────────────────────┐  fetch/patch   ┌────────────────────────┐
│  NotesPanel (admin) │ ─────────────► │  /api/notes/* routes    │
└─────────────────────┘                └────────────┬───────────┘
                                                    │
                                          isAuth, loadUser,
                                          resolveAuthorizationContext
                                                    │
                                ┌───────────────────▼────────────────────┐
                                │  NoteService                            │
                                │  - validation / sanitization            │
                                │  - per-store scoping (NEVER reads       │
                                │    a note by id alone — always by      │
                                │    {_id, storeId, deletedAt: null})     │
                                │  - audit log emission                   │
                                └───────────────────┬────────────────────┘
                                                    │
                                ┌───────────────────▼────────────────────┐
                                │  Mongoose Note model                    │
                                │  - polymorphic entityType / entityId   │
                                │  - authorId / storeId enforced server- │
                                │    side (stripped from input)           │
                                │  - 4 indexes for hot access paths       │
                                └────────────────────────────────────────┘
```

## 3. Data model

`backend/src/models/Note.js`

| Field         | Type                              | Notes                                                                 |
| ------------- | --------------------------------- | --------------------------------------------------------------------- |
| `storeId`     | `ObjectId` (ref `Store`)          | **required**. First-level tenant scope. Never accepted from client.   |
| `authorId`    | `ObjectId` (ref `User`)           | **required**. Always set from `req.authContext.userId`.                |
| `entityType`  | enum (7 values)                   | `order` `customer` `product` `ticket` `shipment` `invoice` `store`.  |
| `entityId`    | `ObjectId`                        | **required**. Target resource.                                        |
| `content`     | string, 1–5000 chars              | Trimmed. Required.                                                     |
| `visibility`  | enum (currently only `internal`)  | Reserved for future `private`/`system`.                              |
| `pinned`      | boolean                           | Pinned notes appear first.                                             |
| `archived`    | boolean                           | Mirror of soft-delete (kept for clarity).                             |
| `deletedAt`   | Date \| null                      | Soft delete. List queries exclude records where `deletedAt !== null`.  |
| `createdAt`   | Date (auto)                       |                                                                       |
| `updatedAt`   | Date (auto)                       |                                                                       |

### Indexes (MongoDB)

| Name                              | Keys                                              | Why                                           |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| `store_entity_pinned_created`     | `{storeId, entityType, entityId, pinned:-1, createdAt:-1}` | Hot read: NotesPanel fetch for one resource. |
| `store_author_created`            | `{storeId, authorId, createdAt:-1}`              | "Notes by author" view, audit trail.          |
| `store_created`                   | `{storeId, createdAt:-1}`                         | Dashboard counters, global lists.             |
| `store_archived_deleted`          | `{storeId, archived, deletedAt}`                  | Soft-delete filters.                          |

## 4. RBAC permissions

Added to `backend/src/config/rbac/permissions.js`:

| Code             | Action | Risk  | Scope  | Description                                  |
| ---------------- | ------ | ----- | ------ | -------------------------------------------- |
| `notes.view`     | view   | low   | store  | List / read notes                            |
| `notes.create`   | create | medium| store  | Add a note                                    |
| `notes.update`   | update | medium| store  | Edit own or any note                          |
| `notes.delete`   | delete | high  | store  | Soft-delete a note                            |
| `notes.pin`      | pin    | medium| store  | Toggle the `pinned` flag                      |

> The system roles are **not** automatically granted these. New permissions
> propagate to existing roles only when an admin re-runs the RBAC seed or
> manually attaches the new codes to a role.

## 5. API surface

Mounted at `app.use("/api/notes/", isAuth, loadUser, resolveAuthorizationContext, noteRoutes)`.

| Method | Path                | Permission     | Description                              |
| ------ | ------------------- | -------------- | ---------------------------------------- |
| GET    | `/api/notes`        | `notes.view`   | List with filters + pagination           |
| POST   | `/api/notes`        | `notes.create` | Create                                   |
| GET    | `/api/notes/:id`    | `notes.view`   | Fetch one                                |
| PATCH  | `/api/notes/:id`    | `notes.update` | Update content / pinned                  |
| DELETE | `/api/notes/:id`    | `notes.delete` | Soft-delete                              |
| PATCH  | `/api/notes/:id/pin`| `notes.pin`    | Toggle pinned (single-purpose endpoint)   |

### Query params for `GET /api/notes`

| Param         | Type                         | Notes                                       |
| ------------- | ---------------------------- | ------------------------------------------- |
| `entityType`  | enum                         | One of 7 values.                           |
| `entityId`    | 24-hex                       | **Required** for resource-scoped views.    |
| `page`        | integer (default 1)          | 1-indexed.                                  |
| `limit`       | integer (default 20, max 100)| Clamped server-side.                       |
| `authorId`    | 24-hex                       | Optional filter.                            |
| `pinned`      | `"true"` \| `"false"`        | Optional filter.                            |
| `createdFrom` | ISO date                     | Inclusive lower bound on `createdAt`.       |
| `createdTo`   | ISO date                     | Inclusive upper bound on `createdAt`.       |
| `search`      | string (≥ 2 chars)           | Case-insensitive substring on `content`. Regex chars are escaped. |

### Response shape

```json
{
  "ok": true,
  "data": [
    {
      "_id": "65f1...",
      "storeId": "65c0...",
      "authorId": { "_id": "65c0...", "name": "Yassine", "email": "..." },
      "entityType": "order",
      "entityId": "65d0...",
      "content": "Client préfère WhatsApp",
      "visibility": "internal",
      "pinned": true,
      "archived": false,
      "deletedAt": null,
      "createdAt": "2026-08-29T10:00:00.000Z",
      "updatedAt": "2026-08-29T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### Errors

All errors return `{ ok: false, code, message }`. The `code` is a stable
identifier, the `message` is human-readable (translatable client-side).

| HTTP | Code                      | When                                             |
| ---- | ------------------------- | ------------------------------------------------ |
| 400  | `NOTE_NO_ACTIVE_STORE`    | No `storeId` in the auth context.                |
| 403  | `NOTE_PERMISSION_DENIED`  | User lacks the required permission.              |
| 403  | `NOTE_FORBIDDEN`          | Generic deny.                                    |
| 404  | `NOTE_NOT_FOUND`           | Note does not exist for the active store. (Also returned for cross-store id probes — we never distinguish 404 from 403 to avoid leaking existence.) |
| 422  | `NOTE_VALIDATION`         | Bad payload (missing content, bad ObjectId, etc.)|
| 500  | `NOTE_INTERNAL`           | Unexpected.                                      |

## 6. Multi-tenant security

**Hard rule**: a note is always read with `{_id, storeId, deletedAt: null}`.
Never by `_id` alone.

Verified by:
- `tests/notes.test.js` — `Multi-tenant isolation` describe block: a user from store A cannot list/get/update/delete a note owned by store B.
- Cross-store id probes return 404 (not 403) so attackers cannot infer note existence.

`authorId` and `storeId` are **stripped from the request body** by
`sanitizeInput()` before they ever reach the model — the backend is the
sole authority for these fields.

## 7. Audit integration

Every state-changing operation emits an `AuditService.logAction({...})` call:

| Action            | Module  | Severity | Metadata                                       |
| ----------------- | ------- | -------- | ---------------------------------------------- |
| `note.created`    | `Notes` | low      | `{ noteEntityType, noteEntityId, pinned }`     |
| `note.updated`    | `Notes` | low      | `{ ..., content: bool, pinned: bool }`         |
| `note.deleted`    | `Notes` | medium   | `{ noteEntityType, noteEntityId, pinned }`     |
| `note.pinned`     | `Notes` | low      | `{ ..., wasPinned }`                           |
| `note.unpinned`   | `Notes` | low      | `{ ..., wasPinned }`                           |

## 8. Frontend component

`admin/src/components/notes/NotesPanel.jsx` (default export) + `services/notesService.js`.

### Usage

```jsx
import NotesPanel from "@/components/notes";

<NotesPanel
  entityType="order"
  entityId={order._id}
  permissions={{
    view: true,
    create: can("notes.create"),
    update: can("notes.update"),
    delete: can("notes.delete"),
    pin: can("notes.pin"),
  }}
  onChange={({ type, note }) => {
    if (type === "create") analytics.track("note_created", { entityType, entityId });
  }}
/>
```

The component:
- Hides the "+ Add" button if `permissions.create` is false.
- Hides Edit / Delete / Pin action buttons per permission.
- Skips the API call entirely if the user lacks the required permission.
- Surfaces 403 (missing view) with a friendly "permission denied" state.
- Handles loading / empty / error / pagination UI.
- Modal respects `Esc` to close.
- Optional `onChange` callback for analytics integration.

### Service

`admin/src/services/notesService.js` is a thin axios wrapper around
`/api/notes` that uses the existing `httpService.js` (which auto-attaches the
`Authorization` and `company` headers from the active store). The only
allowed inputs are `content`, `entityType`, `entityId`, `pinned`. There is
no way to send `authorId` or `storeId` from the client.

### i18n

Keys are namespaced under `notes.*` in `admin/src/utils/translation/{en,fr,es}.json`.
EN/FR/ES translations are provided. The pre-existing `"Notes": "Notes"`
top-level label is **not** a conflict — it is a separate menu label.

## 9. Tests

`backend/tests/notes.test.js` — Jest + supertest-style integration tests
that require a running MongoDB. If no DB is reachable, the suite **skips**
rather than failing (so the rest of CI keeps working).

Coverage:

- Model schema (rejection of missing fields, unknown entityType, > 5000 chars).
- `create` — happy path, client-forged authorId/storeId rejected, missing content, invalid entityType, missing permission.
- `list` — entityType + entityId filter, archived exclusion, pinned-first ordering, pagination, limit clamp at 100.
- `update` — content update, authorId immutability, 404 on missing.
- `softDelete` — sets `deletedAt` + `archived`, hides from subsequent list calls.
- `setPinned` — toggle, non-boolean rejection.
- **Multi-tenant isolation** — store A cannot read/update/delete a note from store B.
- **Permission gating** — view/create/update/delete/pin each require their own permission code.
- **Audit integration** — every mutation emits the right `action` on `AuditService.logAction`.
- **Edge cases** — search escapes regex chars; search < 2 chars is ignored.

Run:
```bash
MONGO_URI_NOTES=mongodb://localhost:27017/sofiagen_test_notes npx jest tests/notes.test.js
```

## 10. Definition of Done

- [x] `notes` collection created
- [x] `Store → Note` relation via `storeId` (denormalised, indexed)
- [x] `Author → Note` relation via `authorId` (denormalised)
- [x] `Entity → Note` polymorphic relation via `(entityType, entityId)` pair
- [x] CRUD backend functional
- [x] Pagination implemented (default 20, max 100, capped server-side)
- [x] RBAC permissions integrated (5 new codes, audited by `notes.*` group)
- [x] Multi-tenant isolation validated (test block)
- [x] `NotesPanel` reusable component (admin) — handles loading / empty / error / permission / pagination
- [x] Add / edit / soft-delete / pin functional
- [x] Audit logs integrated for every mutation
- [x] MongoDB indexes created (4 compound indexes)
- [x] `node --check` clean on every backend file
- [x] Jest tests for the service layer
- [x] Documentation

## 11. Roadmap (V2+)

The model and routes are designed to be extended without migration:

| V1 (shipped)                | V2 (planned)                  | V3 (vision)              |
| --------------------------- | ----------------------------- | ------------------------ |
| CRUD + pin                  | `@mentions` + notifications  | AI summary per resource  |
| Soft delete                 | Hard delete (admin only)      | Suggested actions        |
| Permission gating           | Permission on per-entityType  | Action extraction        |
| Regex search                | Full-text search (Mongo atlas) | Semantic search          |
| Soft audit                  | Comments on notes             | Note summarisation       |

`entityType` enum is open — new resource types (e.g. `marketing_campaign`,
`customer_segment`) can be added by extending the Mongoose schema and
auditing downstream consumers (the NotesPanel will require no change).
