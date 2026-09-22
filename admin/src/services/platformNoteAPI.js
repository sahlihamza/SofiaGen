import requests from "./httpService";

/**
 * Platform Notes — super-admin memos NOT attached to a tenant resource.

 *
 * Same shape as the store-scoped `/api/notes` client, but routed to
 * `/api/platform/notes` so the backend switches to the platform
 * permission set (platform.notes.*) and skips the store filter.
 */
const BASE = "/platform/notes";

const unwrap = async (p) => {
  const res = await p;
  return res?.data;
};

export const platformNoteAPI = {
  async list(params = {}) {
    return unwrap(requests.get(BASE, { params }));
  },
  async getById(id) {
    return unwrap(requests.get(`${BASE}/${id}`));
  },
  async create(payload) {
    return unwrap(requests.post(BASE, payload));
  },
  async update(id, payload) {
    return unwrap(requests.patch(`${BASE}/${id}`, payload));
  },
  async softDelete(id) {
    return unwrap(requests.delete(`${BASE}/${id}`));
  },
  async setPinned(id, pinned) {
    return unwrap(requests.patch(`${BASE}/${id}/pin`, { pinned }));
  },
};

export default platformNoteAPI;