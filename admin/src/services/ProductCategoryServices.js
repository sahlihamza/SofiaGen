import requests from "./httpService";

const ProductCategoryServices = {
  // only active categories (returns an array)
  getShowingCategories: async () => {
    return requests.get("/product-category/show");
  },

  // active categories ranked by product count, each with a `count` field
  getMostUsedCategories: async () => {
    return requests.get("/product-category/most-used");
  },

  // paginated list ({ categories, totalDoc, ... })
  getAllCategories: async () => {
    return requests.get("/product-category");
  },

  getCategoryById: async (id) => {
    return requests.get(`/product-category/${id}`);
  },

  // body: { name, slug?, parentId? }  parentId null creates a root category
  addCategory: async (body) => {
    return requests.post("/product-category/add", body);
  },

  // partial update; responds with { data, message }
  updateCategory: async (id, body) => {
    return requests.put(`/product-category/${id}`, body);
  },

  // body: { status: "active" | "inactive" }
  updateStatus: async (id, body) => {
    return requests.put(`/product-category/status/${id}`, body);
  },

  // children are re-parented one level up rather than orphaned  see the
  // backend service, deleting a branch never detaches its subtree
  deleteCategory: async (id) => {
    return requests.delete(`/product-category/${id}`);
  },

  // body: { ids: [...] }
  deleteManyCategories: async (body) => {
    return requests.patch("/product-category/delete/many", body);
  },

  addAllCategories: async (body) => {
    return requests.post("/product-category/all", body);
  },
};

export default ProductCategoryServices;
