import requests from "./httpService";

// CRUD for PostTag (blog tags). Backend mounted at /api/post-tags/.
const PostTagServices = {
  getAllPostTags: async ({ search = "", page = "", limit = "", sort = "" } = {}) => {
    return requests.get(
      `/post-tags?search=${search ?? ""}&page=${page ?? ""}&limit=${limit ?? ""}&sort=${sort ?? ""}`
    );
  },

  getPostTagById: async (id) => {
    return requests.get(`/post-tags/${id}`);
  },

  addPostTag: async (body) => {
    return requests.post("/post-tags", body);
  },

  updatePostTag: async (id, body) => {
    return requests.put(`/post-tags/${id}`, body);
  },

  deletePostTag: async (id) => {
    return requests.delete(`/post-tags/${id}`);
  },

  deleteManyPostTags: async (ids) => {
    return requests.patch("/post-tags/delete/many", { ids });
  },
};

export default PostTagServices;
