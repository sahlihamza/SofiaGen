import requests from "./httpService";

// Matches backend routes/productReviewRoutes.js (mounted at /api/product-reviews/).
const ProductReviewServices = {
  getAllProductReviews: async ({
    product = "",
    status = "",
    rating = "",
    verifiedPurchase = "",
    search = "",
    page = "",
    limit = "",
    sort = "",
  } = {}) => {
    return requests.get(
      `/product-reviews?product=${product}&status=${status}&rating=${rating}&verifiedPurchase=${verifiedPurchase}&search=${search}&page=${page}&limit=${limit}&sort=${sort}`
    );
  },

  getProductReviewById: async (id) => requests.get(`/product-reviews/${id}`),

  addProductReview: async (body) => requests.post("/product-reviews", body),

  updateProductReview: async (id, body) => requests.put(`/product-reviews/${id}`, body),

  deleteProductReview: async (id) => requests.delete(`/product-reviews/${id}`),

  deleteManyProductReviews: async (ids) =>
    requests.patch("/product-reviews/delete/many", { ids }),

  approveProductReview: async (id) => requests.put(`/product-reviews/${id}/approve`),

  rejectProductReview: async (id) => requests.put(`/product-reviews/${id}/reject`),

  markAsSpamProductReview: async (id) => requests.put(`/product-reviews/${id}/spam`),

  replyProductReview: async (id, message) =>
    requests.post(`/product-reviews/${id}/reply`, { message }),

  deleteReviewReply: async (id) => requests.delete(`/product-reviews/${id}/reply`),

  setReviewMedia: async (id, media) => requests.put(`/product-reviews/${id}/media`, { media }),

  deleteReviewMedia: async (mediaId) => requests.delete(`/product-reviews/media/${mediaId}`),

  getReviewReports: async (id) => requests.get(`/product-reviews/${id}/reports`),

  clearReviewReports: async (id) => requests.delete(`/product-reviews/${id}/reports`),

  getReviewSettings: async () => requests.get("/product-reviews/settings/store"),

  updateReviewSettings: async (settings) => requests.put("/product-reviews/settings/store", settings),

  bulkUpdateStatus: async (ids, status) =>
    requests.put("/product-reviews/bulk/status", { ids, status }),
};

export default ProductReviewServices;
