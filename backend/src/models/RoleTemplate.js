const mongoose = require("mongoose");

const roleTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom du modèle est obligatoire"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    scope: {
      type: String,
      required: true,
      default: "store",
      enum: ["platform", "store"],
    },
    isPredefined: {
      type: Boolean,
      default: false,
    },
    actionFilters: {
      type: [String],
      default: [],
    },
    permissionCodes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

roleTemplateSchema.index({ scope: 1 });
roleTemplateSchema.index({ slug: 1 });

const RoleTemplate = mongoose.model("RoleTemplate", roleTemplateSchema);

module.exports = RoleTemplate;
