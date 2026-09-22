const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, required: false },
    metaDescription: { type: String, required: false },
    canonicalUrl: { type: String, required: false },
    ogImage: { type: String, required: false },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Le titre est obligatoire"],
    },
    slug: {
      type: String,
      required: false,
    },
    excerpt: {
      type: String,
      required: false,
    },
    content: {
      type: String,
      required: false,
      default: "",
    },
    featuredImage: {
      type: String,
      required: false,
    },
    gallery: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "private", "archived"],
      default: "draft",
    },
    visibility: {
      type: String,
      enum: ["public", "private", "password"],
      default: "public",
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    publishedAt: {
      type: Date,
      required: false,
    },
    scheduledAt: {
      type: Date,
      required: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    readingTime: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    sticky: {
      type: Boolean,
      default: false,
    },
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "PostCategory",
      default: [],
    },
    tags: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "PostTag",
      default: [],
    },
    seo: {
      type: seoSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ storeId: 1, slug: 1 }, { unique: true });
postSchema.index({ storeId: 1, status: 1 });
postSchema.index({ storeId: 1, publishedAt: -1 });
postSchema.index({ storeId: 1, authorId: 1 });
postSchema.index({ storeId: 1, featured: 1 });
postSchema.index({ storeId: 1, sticky: 1 });

postSchema.plugin(storeScopedPlugin);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
