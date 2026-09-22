const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const postCommentSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostComment",
      required: false,
      default: null,
    },
    authorName: {
      type: String,
      required: [true, "Le nom de l'auteur est obligatoire"],
    },
    authorEmail: {
      type: String,
      required: [true, "L'email de l'auteur est obligatoire"],
    },
    content: {
      type: String,
      required: [true, "Le contenu est obligatoire"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "spam", "trash"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

postCommentSchema.index({ storeId: 1, postId: 1 });
postCommentSchema.index({ storeId: 1, status: 1 });
postCommentSchema.index({ postId: 1, createdAt: 1 });

postCommentSchema.plugin(storeScopedPlugin);

const PostComment = mongoose.model("PostComment", postCommentSchema);

module.exports = PostComment;
