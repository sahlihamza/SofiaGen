import requests from "./httpService";

// CRUD for ProductTag entities (many-to-many with Product through
// ProductTagRelation). Backend mounted at /api/product-tags/.
const ProductTagServices = {
  // GET /api/product-tags/ -> { tags, totalDoc, limits, pages }
  // Passing no limit returns every tag (backend treats limit 0 as "all").
  // status: "active" | "inactive" filters by the tag status.
  // sort: "name_asc" | "name_desc" | "date_asc" | "date_desc"
  getAllProductTags: async ({
    name = "",
    status = "",
    page = "",
    limit = "",
    sort = "",
  } = {}) => {
    // name/status/etc. may arrive as `null` (e.g. SidebarContext's searchText
    // default), which the `= ""` default doesn't catch since default params
    // only trigger on `undefined`. Coerce to "" so we never send the literal
    // string "null" as a search filter (see BrandServices for the same fix).
    return requests.get(
      `/product-tags?name=${name ?? ""}&status=${status ?? ""}&page=${page ?? ""}&limit=${limit ?? ""}&sort=${sort ?? ""}`
    );
  },

  addProductTag: async (body) => {
    return requests.post("/product-tags/add", body);
  },

  addAllProductTags: async (body) => {
    return requests.post("/product-tags/add/all", body);
  },

  getProductTagById: async (id) => {
    return requests.get(`/product-tags/${id}`);
  },

  updateProductTag: async (id, body) => {
    return requests.put(`/product-tags/${id}`, body);
  },

  deleteProductTag: async (id) => {
    return requests.delete(`/product-tags/${id}`);
  },

  // PATCH /api/product-tags/delete/many  body: { ids: [...] }
  deleteManyProductTags: async (body) => {
    return requests.patch("/product-tags/delete/many", body);
  },
};

export default ProductTagServices;
