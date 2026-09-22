const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const couponSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    code: {
      type: String,
      required: [true, "Le code du coupon est obligatoire"],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    discountType: {
      type: String,
      enum: [
        "percentage",
        "fixed_cart",
        "fixed_product",
        "buy_x_get_y",
        "free_gift",
        "shipping_discount",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    allowFreeShipping: {
      type: Boolean,
      default: false,
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled", "expired", "archived"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
    usageLimit: {
      type: Number,
      default: null,
    },
    usageLimitPerCustomer: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    autoApply: {
      type: Boolean,
      default: false,
    },
    stackable: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // SFG-73 Phase 8: set once the corresponding notification has been sent,
    // so the expiry job (setInterval, checked every cycle) never notifies
    // twice for the same coupon. Both default to null/unset for existing
    // coupons  harmless, just means they're still eligible to be notified.
    expiryNotifiedAt: {
      type: Date,
      default: null,
    },
    expiringSoonNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    enforceStoreId: false,
  }
);

couponSchema.index({ storeId: 1, code: 1 }, { unique: true });
couponSchema.index({ storeId: 1, status: 1 });
couponSchema.index({ storeId: 1, deletedAt: 1 });
// Story 18
couponSchema.index({ storeId: 1, startDate: 1 });
couponSchema.index({ storeId: 1, endDate: 1 });
couponSchema.index({ storeId: 1, autoApply: 1 });

couponSchema.plugin(storeScopedPlugin);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
