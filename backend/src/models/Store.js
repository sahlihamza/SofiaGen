const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      validate: {
        validator: (v) => !v || /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(v),
        message: "Slug format is invalid (lowercase alphanumeric and hyphens only)",
      },
    },
    subdomain: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      validate: {
        validator: (v) => !v || /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(v),
        message: "Subdomain format is invalid (lowercase alphanumeric and hyphens only, 1-63 chars)",
      },
    },
    domain: { type: String, required: false, trim: true, lowercase: true },
    customDomain: { type: String, required: false, trim: true, lowercase: true, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending", "deleted"],
      default: "pending",
    },
    logo: { type: String, required: false },
    address: { type: String, required: false },
    // Contact identity of the merchant, printed on every outgoing document
    // (delivery labels, invoices). invoiceController already populated
    // "name email address phone" off this model  the two fields simply did
    // not exist, so they always came back undefined.
    phone: { type: String, required: false, default: "", trim: true },
    email: { type: String, required: false, default: "", trim: true },
    // SFG-155  "Matricule Fiscal / CIN". Tunisian law (circulaire de la
    // présidence du gouvernement né 2019-8 du 25/02/2019) makes it mandatory
    // on a bon de livraison, so the packing label prints it under the sender
    // block whenever the store has configured one.
    taxId: { type: String, required: false, default: "", trim: true },
    category: { type: String, required: false, trim: true },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: false,
      default: null,
    },
    planName: { type: String, required: false },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trial", "past_due", "canceled", "expired", "pending"],
      default: "pending",
    },
    trialEndsAt: { type: Date, required: false },
    currentPeriodEnd: { type: Date, required: false },
    nextBillingDate: { type: Date, required: false },
    quotaUsage: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
    currentSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: false,
      default: null,
    },
    // A store can have one active subscription at a time, linked to one plan.
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    // isActive is a virtual derived from status.
    // Source of truth for store state is `status` enum.
    // Virtual kept for backward compatibility with existing queries.
    // isSelected marks the single "storefront-active" store used by
    // public-facing services (getActiveStore, websiteVisibilityService,
    // emailSettingsService) that operate outside a user session context.
    // This is intentionally kept separate from user.currentStoreId, which is
    // the per-user "currently viewed store" in the admin dashboard.
    // Invariant: at most one store per ownerId may have isSelected: true.
    // The storeService enforces this during creation and updates.
    isSelected: { type: Boolean, default: false },
    // store_settings.products.reviews from the ticket  per-store so each
    // tenant in this SaaS controls its own review policy.
    reviewSettings: {
      enabled: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: true },
      verifiedOwnersOnly: { type: Boolean, default: false },
      allowGuestReviews: { type: Boolean, default: false },
      showRating: { type: Boolean, default: true },
      showCount: { type: Boolean, default: true },
      maxImages: { type: Number, default: 5 },
    },
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
      required: false,
      default: null,
    },
    provisioningStatus: {
      type: String,
      enum: ["pending", "complete", "partial_failure"],
      default: "pending",
    },
    // SFG-155  printing defaults for the Orders > Print Labels action. The
    // caller may still override the format per request; this is what the
    // back-office falls back to when it does not. `label_10x15` is the
    // 100x150mm thermal/label-printer sheet, `a4` the office printer one.
    labelSettings: {
      format: { type: String, enum: ["a4", "label_10x15"], default: "a4" },
    },
    // Store-scoped maintenance mode (distinct from platform maintenance).
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "", maxlength: 500 },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    deletedAt: { type: Date, required: false, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
    suspendedAt: { type: Date, required: false, default: null },
    suspensionReason: { type: String, required: false, default: null },
    deletionReason: { type: String, required: false, default: null },
    statusBeforeDeletion: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

storeSchema.index({ status: 1 });
storeSchema.index({ ownerId: 1 });
storeSchema.index({ planId: 1 });
storeSchema.index({ createdAt: -1 });
storeSchema.index({ deletedAt: 1 });
storeSchema.index({ ownerId: 1, isSelected: 1 }, { unique: true, partialFilterExpression: { isSelected: true } });

storeSchema.virtual("isActive").get(function () {
  return this.status === "active" || this.status === "trial" || this.status === "pending";
});

storeSchema.virtual("isActive").set(function (value) {
  if (value === true) {
    this.status = "active";
  } else if (value === false) {
    this.status = "suspended";
  }
});

storeSchema.set("toObject", { virtuals: true });
storeSchema.set("toJSON", { virtuals: true });

const Store = mongoose.model("Store", storeSchema);
module.exports = Store;