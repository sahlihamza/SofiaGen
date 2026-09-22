import requests from "./httpService";

// CRUD + workflow actions for Post (blog articles). Backend mounted at /api/posts/.
const PostServices = {
  getAllPosts: async ({
    search = "",
    status = "",
    category = "",
    tag = "",
    author = "",
    featured = "",
    sticky = "",
    dateFrom = "",
    dateTo = "",
    page = "",
    limit = "",
    sort = "",
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries({
      search,
      status,
      category,
      tag,
      author,
      featured,
      sticky,
      dateFrom,
      dateTo,
      page,
      limit,
      sort,
    }).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.set(key, value);
      }
    });
    return requests.get(`/posts?${params.toString()}`);
  },

  getPostById: async (id) => {
    return requests.get(`/posts/${id}`);
  },

  addPost: async (body) => {
    return requests.post("/posts", body);
  },

  updatePost: async (id, body) => {
    return requests.put(`/posts/${id}`, body);
  },

  deletePost: async (id) => {
    return requests.delete(`/posts/${id}`);
  },

  deleteManyPosts: async (ids) => {
    return requests.patch("/posts/delete/many", { ids });
  },

  publishPost: async (id) => {
    return requests.put(`/posts/${id}/publish`);
  },

  unpublishPost: async (id) => {
    return requests.put(`/posts/${id}/unpublish`);
  },

  archivePost: async (id) => {
    return requests.put(`/posts/${id}/archive`);
  },

  duplicatePost: async (id) => {
    return requests.post(`/posts/${id}/duplicate`);
  },

  bulkUpdateStatus: async (ids, status) => {
    return requests.put("/posts/bulk/status", { ids, status });
  },

  bulkChangeCategory: async (ids, categoryId) => {
    return requests.put("/posts/bulk/category", { ids, categoryId });
  },

  bulkAddTag: async (ids, tagId) => {
    return requests.put("/posts/bulk/tag", { ids, tagId });
  },
};

export default PostServices;
