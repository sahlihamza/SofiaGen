const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const postTagSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Le nom est obligatoire"],
    },
    slug: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      required: false,
      default: "#10B981",
    },
    postCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

postTagSchema.index({ storeId: 1, slug: 1 }, { unique: true });

postTagSchema.plugin(storeScopedPlugin);

const PostTag = mongoose.model("PostTag", postTagSchema);

module.exports = PostTag;
