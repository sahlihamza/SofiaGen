import requests from "./httpService";

// CRUD + moderation for PostComment. Backend mounted at /api/post-comments/.
const PostCommentServices = {
  getAllPostComments: async ({ postId = "", status = "", search = "", page = "", limit = "" } = {}) => {
    return requests.get(
      `/post-comments?postId=${postId ?? ""}&status=${status ?? ""}&search=${search ?? ""}&page=${page ?? ""}&limit=${limit ?? ""}`
    );
  },

  getPostCommentById: async (id) => {
    return requests.get(`/post-comments/${id}`);
  },

  addPostComment: async (body) => {
    return requests.post("/post-comments", body);
  },

  updatePostComment: async (id, body) => {
    return requests.put(`/post-comments/${id}`, body);
  },

  moderatePostComment: async (id, status) => {
    return requests.put(`/post-comments/${id}/status`, { status });
  },

  deletePostComment: async (id) => {
    return requests.delete(`/post-comments/${id}`);
  },
};

export default PostCommentServices;
