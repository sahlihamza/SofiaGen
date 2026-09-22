import axios from "axios";

const API_BASE = "/api/custom-icons";

export const iconService = {
  async list({ storeId, search = "", tags = [], favoritesOnly = false, page = 1, limit = 50 } = {}) {
    const params = new URLSearchParams({ storeId, search, page, limit, favoritesOnly: String(favoritesOnly) });
    if (tags.length) params.set("tags", tags.join(","));
    const { data } = await axios.get(`${API_BASE}?${params.toString()}`);
    return data;
  },

  async get(storeId, name) {
    const { data } = await axios.get(`${API_BASE}/${encodeURIComponent(name)}?storeId=${storeId}`);
    return data;
  },

  async create({ storeId, name, svgContent, filename, mimeType, size, tags }) {
    const { data } = await axios.post(API_BASE, { storeId, name, svgContent, filename, mimeType, size, tags });
    return data;
  },

  async batchCreate({ storeId, icons }) {
    const { data } = await axios.post(`${API_BASE}/batch`, { storeId, icons });
    return data;
  },

  async toggleFavorite(storeId, name) {
    const { data } = await axios.patch(`${API_BASE}/${encodeURIComponent(name)}/favorite?storeId=${storeId}`);
    return data;
  },

  async remove(storeId, name) {
    const { data } = await axios.delete(`${API_BASE}/${encodeURIComponent(name)}?storeId=${storeId}`);
    return data;
  },

  async batchRemove(storeId, names) {
    const { data } = await axios.delete(`${API_BASE}/batch?storeId=${storeId}`, { data: { names } });
    return data;
  },

  async uploadZip(file) {
    const form = new FormData();
    form.append("iconsZip", file);
    const { data } = await axios.post("/api/icon-upload/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
