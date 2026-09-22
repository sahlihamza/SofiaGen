const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom du rôle est obligatoire"],
      trim: true,
      select: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: false,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    permissions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Permission",
      default: [],
    },
    scope: {
      type: String,
      required: true,
      default: "store",
      enum: ["platform", "store"],
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    userCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

roleSchema.index({ storeId: 1, name: 1 }, { unique: true });
roleSchema.index({ storeId: 1, slug: 1 }, { unique: true });
roleSchema.index({ scope: 1, storeId: 1 });

const Role = mongoose.model("Role", roleSchema);
module.exports = Role;