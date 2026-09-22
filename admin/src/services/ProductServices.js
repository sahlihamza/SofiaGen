import requests from "./httpService";

const ProductServices = {
  getAllProducts: async ({ page, limit, category, productName, price, storeId, sortBy = "newest", status }) => {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    if (category) params.set("category", category);
    if (productName) params.set("productName", productName);
    if (price) params.set("price", price);
    if (storeId) params.set("storeId", storeId);
    if (sortBy) params.set("sortBy", sortBy);
    if (status) params.set("status", status);

    return requests.get(`/products?${params.toString()}`);
  },

  getProductById: async (id) => {
    if (!id) return null;

    try {
      return await requests.get(`/products/${id}`);
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        return requests.post(`/products/${id}`);
      }
      throw err;
    }
  },

  addProduct: async (body) => {
    return requests.post("/products/add", body);
  },

  addAllProducts: async (body) => {
    return requests.post("/products/all", body);
  },

  updateProduct: async (id, body) => {
    return requests.patch(`/products/${id}`, body);
  },

  updateManyProducts: async (body) => {
    return requests.patch("products/update/many", body);
  },

  updateStatus: async (id, body) => {
    return requests.put(`/products/status/${id}`, body);
  },

  deleteProduct: async (id) => {
    return requests.delete(`/products/${id}`);
  },

  deleteManyProducts: async (body) => {
    return requests.patch("/products/delete/many", body);
  },

  getRelatedProducts: async (productId, limit = 4) => {
    return requests.get(`/products/related/${productId}?limit=${limit}`);
  },

  getBestSellers: async ({ storeId, period = "30d", limit = 12 } = {}) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (period) params.set("period", period);
    if (limit) params.set("limit", limit);
    return requests.get(`/products/best-sellers?${params.toString()}`);
  },

  getFeaturedProducts: async ({ storeId, limit = 8 } = {}) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (limit) params.set("limit", limit);
    return requests.get(`/products/featured?${params.toString()}`);
  },

  getPriceRange: async (storeId) => {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    return requests.get(`/products/price-range?${params.toString()}`);
  },

  getShowingStoreProducts: async ({ productName, storeId }) => {
    const params = new URLSearchParams();
    if (productName) params.set("productName", productName);
    if (storeId) params.set("storeId", storeId);
    return requests.get(`/products/store?${params.toString()}`);
  },

  searchProducts: async ({ productName, category, status, storeId } = {}) => {
    const params = new URLSearchParams();
    if (productName) params.set("productName", productName);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (storeId) params.set("storeId", storeId);
    return requests.get(`/products/search?${params.toString()}`);
  },
};

export default ProductServices;
