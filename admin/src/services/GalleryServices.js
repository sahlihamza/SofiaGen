import requests from "./httpService";

const GalleryServices = {
  getAll: async ({ storeId, category, tag, layout, sortBy = "newest", page = 1, limit = 12 } = {}) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (layout) params.set("layout", layout);
    if (sortBy) params.set("sortBy", sortBy);
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    return requests.get(`/galleries?${params.toString()}`);
  },

  getById: async (id) => {
    if (!id) return null;
    return requests.get(`/galleries/${id}`);
  },

  getByCategory: async (storeId, category, limit = 12) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (category) params.set("category", category);
    if (limit) params.set("limit", limit);
    return requests.get(`/galleries/category/${storeId}/${category}?${params.toString()}`);
  },

  create: async (body) => {
    return requests.post("/galleries", body);
  },

  update: async (id, body) => {
    return requests.put(`/galleries/${id}`, body);
  },

  delete: async (id) => {
    return requests.delete(`/galleries/${id}`);
  },

  addImage: async (galleryId, imageData) => {
    return requests.post(`/galleries/${galleryId}/images`, imageData);
  },

  removeImage: async (galleryId, imageId) => {
    return requests.delete(`/galleries/${galleryId}/images/${imageId}`);
  },

  reorder: async (galleryId, imageIds) => {
    return requests.patch(`/galleries/${galleryId}/reorder`, { imageIds });
  },
};

export default GalleryServices;
