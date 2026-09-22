const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom de l'équipe est obligatoire"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: false,
    },
    code: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    department: {
      type: String,
      required: false,
      trim: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    memberCount: {
      type: Number,
      default: 0,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

teamSchema.index({ storeId: 1, name: 1 }, { unique: true });
teamSchema.index({ slug: 1 });
teamSchema.index({ department: 1 });

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
