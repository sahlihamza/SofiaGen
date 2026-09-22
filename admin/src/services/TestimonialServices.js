import requests from "./httpService";

const TestimonialServices = {
  getAll: async ({ storeId, category, rating, isApproved = "true", isFeatured, locale, sortBy = "newest", page = 1, limit = 12, search = "" } = {}) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (category) params.set("category", category);
    if (rating) params.set("rating", rating);
    if (isApproved !== undefined) params.set("isApproved", String(isApproved));
    if (isFeatured !== undefined) params.set("isFeatured", String(isFeatured));
    if (locale) params.set("locale", locale);
    if (sortBy) params.set("sortBy", sortBy);
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    if (search) params.set("search", search);
    return requests.get(`/testimonials?${params.toString()}`);
  },

  getById: async (id) => {
    if (!id) return null;
    return requests.get(`/testimonials/${id}`);
  },

  create: async (body) => {
    return requests.post("/testimonials", body);
  },

  update: async (id, body) => {
    return requests.put(`/testimonials/${id}`, body);
  },

  delete: async (id) => {
    return requests.delete(`/testimonials/${id}`);
  },

  getFeatured: async (storeId, limit = 6) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (limit) params.set("limit", limit);
    return requests.get(`/testimonials/featured/${storeId}?${params.toString()}`);
  },

  getRandom: async (storeId, limit = 6) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (limit) params.set("limit", limit);
    return requests.get(`/testimonials/random/${storeId}?${params.toString()}`);
  },

  getByRating: async (storeId, minRating = 4, limit = 10) => {
    return TestimonialServices.getAll({ storeId, rating: minRating, limit, sortBy: "rating-high" });
  },

  /**
   * Génére un/des témoignage(s) via GLM-5.2 (backend /testimonials/ai/generate).
   * Le serveur retombe sur un mock si aucune clé IA n'est configuré.
   */
  generateAI: async ({ context = "", category = "", count = 1, locale = "fr" } = {}) => {
    return requests.post("/testimonials/ai/generate", { context, category, count, locale });
  },

  getStats: async (storeId) => {
    return requests.get(`/testimonials/stats/${storeId}`);
  },

  patchStatus: async (id, isApproved) => {
    return requests.patch(`/testimonials/${id}/status`, { isApproved });
  },

  bulkDelete: async (ids) => {
    return requests.post("/testimonials/bulk/delete", { ids });
  },

  bulkStatus: async (ids, isApproved) => {
    return requests.post("/testimonials/bulk/status", { ids, isApproved });
  },
};

export default TestimonialServices;
