const mongoose = require("mongoose");
const {
  STATUS,
  ALL_ACCEPTED_STATUSES,
  OCCUPYING_STATUSES,
  expandForQuery,
} = require("../utils/subscriptionStatus");

const subscriptionSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planVersion: {
      type: Number,
      required: false,
      default: 1,
    },
    planVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanVersion",
      required: false,
      default: null,
      index: true,
    },
    planPriceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanPrice",
      required: false,
      default: null,
    },
    planSnapshot: {
      name: { type: String, required: false },
      slug: { type: String, required: false },
      description: { type: String, required: false },
      badge: { type: String, required: false },
      color: { type: String, required: false },
      icon: { type: String, required: false },
      pricing: {
        monthly: { type: Number, required: false },
        yearly: { type: Number, required: false },
        currency: { type: String, required: false },
        taxIncluded: { type: Boolean, default: false },
        trialDays: { type: Number, default: 0 },
      },
      features: {
        type: Map,
        of: Boolean,
        default: new Map(),
      },
      limits: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map(),
      },
      featureRefs: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlanFeature",
          required: false,
        },
      ],
      quotaRefs: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlanQuota",
          required: false,
        },
      ],
    },
    currentPlanName: {
      type: String,
      required: false,
    },
    startedAt: {
      type: Date,
      required: false,
    },
    endedAt: {
      type: Date,
      required: false,
    },
    currentPeriodStart: {
      type: Date,
      required: false,
    },
    currentPeriodEnd: {
      type: Date,
      required: false,
    },
    trialPeriod: {
      type: Boolean,
      default: false,
    },
    trialEndsAt: { type: Date, required: false },
    status: {
      type: String,
      enum: ALL_ACCEPTED_STATUSES,
      default: STATUS.PENDING,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    priceSnapshot: {
      monthly: { type: Number, required: false },
      yearly: { type: Number, required: false },
      currency: { type: String, required: false },
      taxIncluded: { type: Boolean, default: false },
    },
    isAutoRenew: { type: Boolean, default: true },

    // Multi-currency
    currency: { type: String, required: false, default: "USD" },
    basePriceInCurrency: { type: Number, required: false },

    // Trial
    trialStartDate: { type: Date, required: false },
    trialEndDate: { type: Date, required: false },

    // Billing cycle day (1-31)
    billingCycleDay: { type: Number, min: 1, max: 31, required: false },

    // Current plan tracking
    currentPlan: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
      effectiveFrom: { type: Date },
    },

    // Pending plan (for upgrade/downgrade in progress)
    pendingPlan: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
      effectiveFrom: { type: Date },
      reason: { type: String, enum: ["upgrade", "downgrade"] },
    },

    // Billing address (for tax calculation)
    billingAddress: {
      country: { type: String, required: false },
      city: { type: String, required: false },
      postalCode: { type: String, required: false },
    },

    // Applied coupons/discounts
    appliedCoupons: [
      {
        couponId: { type: mongoose.Schema.Types.ObjectId, ref: "PlatformCoupon" },
        code: { type: String },
        discountType: { type: String, enum: ["flat", "fixed", "percentage"] },
        discountValue: { type: Number },
        discountAmount: { type: Number },
        appliedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        maxUses: { type: Number },
        usedCount: { type: Number, default: 0 },
        duration: {
          type: String,
          enum: ["once", "repeating", "forever"],
          default: "once",
        },
        periodsRemaining: { type: Number, default: null },
        redemptionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlatformCouponRedemption",
        },
      },
    ],

    // Over-quota handling
    overQuotaItems: [
      {
        quotaTypeId: { type: mongoose.Schema.Types.ObjectId },
        quotaTypeCode: { type: String },
        current: { type: Number },
        newLimit: { type: Number },
        status: {
          type: String,
          enum: ["blocked", "grace_period", "degraded"],
          default: "grace_period",
        },
        graceUntil: { type: Date },
        notifiedAt: { type: Date },
      },
    ],

    // Payment failures & retry
    chargeFailures: { type: Number, default: 0 },
    chargeRetryDate: { type: Date, required: false },
    lastChargeFailureReason: { type: String, required: false },

    unitPrice: { type: Number, required: false, default: null },
    tax: { type: Number, required: false, default: 0 },
    discount: { type: Number, required: false, default: 0 },
    finalPrice: { type: Number, required: false, default: null },

    graceEndsAt: { type: Date, required: false, default: null },
    gracePeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GracePeriod",
      required: false,
      default: null,
    },

    // Cancellation
    cancelledAt: { type: Date, required: false },
    cancelReason: { type: String, required: false },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    scheduledCancellationAt: { type: Date, required: false, default: null },

    // Downgrade pre-validation result
    downgradeBlocked: {
      type: Boolean,
      default: false,
    },
    downgradeBlockReason: { type: String, required: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ storeId: 1, planId: 1 });
subscriptionSchema.index({ storeId: 1, status: 1 });
subscriptionSchema.index({ status: 1, graceEndsAt: 1 });
subscriptionSchema.index(
  { storeId: 1 },
  {
    unique: true,
    name: "one_occupying_subscription_per_store",
    partialFilterExpression: {
      status: { $in: expandForQuery(OCCUPYING_STATUSES) },
    },
  }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
