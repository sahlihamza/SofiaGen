const mongoose = require("mongoose");

// Junction table for the many-to-many relation between User and Store.
// One document grants a single user access to a single store.
const userStoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "invited", "suspended"],
      default: "active",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// A user can be linked to a given store only once.
userStoreSchema.index({ userId: 1, storeId: 1 }, { unique: true });
userStoreSchema.index({ storeId: 1, roleId: 1 });

const UserStore = mongoose.model("UserStore", userStoreSchema);

module.exports = UserStore;
