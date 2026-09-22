import requests from "./httpService";

/**
 * Thin wrapper around /api/notes for the back-office UI.
 *
 * Keep this the only place in the admin app that knows the URL shape — every

 * consumer (NotesPanel, dashboards, audits, etc.) imports these functions so
 * a future API rename only touches this file.
 *
 * All functions throw on non-2xx responses; the caller is responsible for
 * mapping `err.status` / `err.code` to UI states.
 */

const BASE = "/notes";

export const ENTITY_TYPES = [
  "order",
  "customer",
  "product",
  "ticket",
  "shipment",
  "invoice",
  "store",
];

/**
 * List notes for a specific (entityType, entityId), newest first, pinned
 * on top. Backend already scopes by storeId from the auth context.
 */
export async function listNotes({
  entityType,
  entityId,
  page = 1,
  limit = 20,
  authorId,
  pinned,
  search,
  createdFrom,
  createdTo,
} = {}) {
  return requests.get(BASE, {
    entityType,
    entityId,
    page,
    limit,
    authorId,
    pinned,
    search,
    createdFrom,
    createdTo,
  });
}

export async function createNote({ content, entityType, entityId, pinned = false }) {
  return requests.post(BASE, { content, entityType, entityId, pinned });
}

export async function updateNote(id, payload) {
  return requests.patch(`${BASE}/${id}`, payload);
}

export async function deleteNote(id) {
  return requests.delete(`${BASE}/${id}`);
}

export async function pinNote(id, pinned) {
  // The PATCH /:id/pin endpoint keeps the rest of the note untouched.
  return requests.patch(`${BASE}/${id}/pin`, { pinned });
}
