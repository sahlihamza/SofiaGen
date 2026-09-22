import requests from "./httpService";

// CRUD for PostCategory (blog categories, parent/child hierarchy).
// Backend mounted at /api/post-categories/.
const PostCategoryServices = {
  getAllPostCategories: async ({ search = "", page = "", limit = "" } = {}) => {
    return requests.get(
      `/post-categories?search=${search ?? ""}&page=${page ?? ""}&limit=${limit ?? ""}`
    );
  },

  getPostCategoryTree: async () => {
    return requests.get("/post-categories?tree=true");
  },

  getPostCategoryById: async (id) => {
    return requests.get(`/post-categories/${id}`);
  },

  addPostCategory: async (body) => {
    return requests.post("/post-categories", body);
  },

  updatePostCategory: async (id, body) => {
    return requests.put(`/post-categories/${id}`, body);
  },

  deletePostCategory: async (id) => {
    return requests.delete(`/post-categories/${id}`);
  },

  deleteManyPostCategories: async (ids) => {
    return requests.patch("/post-categories/delete/many", { ids });
  },
};

export default PostCategoryServices;
