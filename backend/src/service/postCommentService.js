const PostComment = require("../models/PostComment");
const Post = require("../models/Post");

class PostCommentService {
  async getAllComments({ storeId, postId, status, search, page, limit } = {}) {
    const queryObject = { storeId };

    if (postId) queryObject.postId = postId;
    if (status) queryObject.status = status;
    if (search) {
      queryObject.$or = [
        { authorName: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const totalDoc = await PostComment.countDocuments(queryObject);
    const comments = await PostComment.find(queryObject)
      .populate("postId", "title slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    return { comments, totalDoc, limits, pages };
  }

  async getCommentById(id) {
    return await PostComment.findById(id).populate("postId", "title slug");
  }

  async addComment(storeId, data) {
    const post = await Post.findById(data.postId);
    if (!post) {
      const error = new Error("Article introuvable");
      error.code = "POST_NOT_FOUND";
      throw error;
    }
    if (!post.allowComments) {
      const error = new Error("Les commentaires sont désactivés pour cet article");
      error.code = "COMMENTS_DISABLED";
      throw error;
    }

    const comment = new PostComment({
      storeId,
      postId: data.postId,
      customerId: data.customerId,
      parentId: data.parentId || null,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      content: data.content,
      // Admin-authored replies go straight to approved; public submissions
      // start pending so they show up in the moderation queue.
      status: data.status === "approved" ? "approved" : "pending",
    });

    const saved = await comment.save();
    await this.syncCommentCount(data.postId);
    return saved;
  }

  async updateCommentStatus(id, status) {
    const comment = await PostComment.findByIdAndUpdate(id, { status }, { new: true });
    if (comment) await this.syncCommentCount(comment.postId);
    return comment;
  }

  async updateComment(id, data) {
    return await PostComment.findByIdAndUpdate(
      id,
      { content: data.content },
      { new: true, runValidators: true }
    );
  }

  async deleteComment(id) {
    const comment = await PostComment.findByIdAndDelete(id);
    if (comment) await this.syncCommentCount(comment.postId);
    return comment;
  }

  // A post's visible commentCount only reflects approved comments (pending
  // ones aren't shown publicly yet, spam/trash never were).
  async syncCommentCount(postId) {
    const count = await PostComment.countDocuments({ postId, status: "approved" });
    await Post.findByIdAndUpdate(postId, { commentCount: count });
    return count;
  }
}

module.exports = new PostCommentService();
