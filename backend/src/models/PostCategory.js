const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const postCategorySchema = new mongoose.Schema(
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
    description: {
      type: String,
      required: false,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostCategory",
      required: false,
      default: null,
    },
    image: {
      type: String,
      required: false,
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

postCategorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
postCategorySchema.index({ storeId: 1, parentId: 1 });

postCategorySchema.plugin(storeScopedPlugin);

const PostCategory = mongoose.model("PostCategory", postCategorySchema);

module.exports = PostCategory;
