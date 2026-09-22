const mongoose = require("mongoose");
const PlatformCoupon = require("../models/PlatformCoupon");
const PlatformCouponRedemption = require("../models/PlatformCouponRedemption");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");

class CouponApplicationError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.name = "CouponApplicationError";
    this.code = code;
    this.status = status;
  }
}

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

let transactionSupport = null;

const supportsTransactions = async () => {
  if (transactionSupport !== null) return transactionSupport;
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupport = Boolean(info.setName) || info.msg === "isdbgrid";
  } catch (err) {
    logger.warn(`platformCouponApplication: transaction probe failed: ${err.message}`);
    transactionSupport = false;
  }
  return transactionSupport;
};

const computeDiscountAmount = (coupon, baseAmount) => {
  const base = Number(baseAmount) || 0;
  if (base <= 0) return 0;

  const raw =
    coupon.discountType === "percentage"
      ? (base * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);

  return round2(Math.min(Math.max(raw, 0), base));
};

const resolveBaseAmount = (subscription, invoice) => {
  if (invoice) return Number(invoice.baseAmount) || 0;
  if (subscription.basePriceInCurrency != null) {
    return Number(subscription.basePriceInCurrency) || 0;
  }
  const snapshot = subscription.priceSnapshot || {};
  const cycle = subscription.billingCycle === "yearly" ? "yearly" : "monthly";
  return Number(snapshot[cycle]) || 0;
};

const findBillableInvoice = async (subscriptionId, session) => {
  return Invoice.findOne({
    subscriptionId,
    status: { $in: ["draft", "sent", "overdue"] },
  })
    .sort({ createdAt: -1 })
    .session(session || null);
};

const recalculateInvoiceTotals = (invoice) => {
  const base = Number(invoice.baseAmount) || 0;
  const totalDiscount = (invoice.discounts || []).reduce(
    (sum, d) => sum + (Number(d.discountAmount) || 0),
    0
  );
  const subtotal = round2(Math.max(base - totalDiscount, 0));
  const taxRate = Number(invoice.taxRate) || 0;
  const tax = round2(subtotal * taxRate);

  invoice.subtotal = subtotal;
  invoice.tax = tax;
  invoice.total = round2(subtotal + tax);
  return invoice;
};

const periodsForDuration = (coupon) => {
  if (coupon.duration === "forever") return null;
  if (coupon.duration === "repeating") return Number(coupon.durationInPeriods) || 1;
  return 1;
};

const assertEligible = async ({ coupon, subscription, session }) => {
  const now = new Date();

  if (!coupon || coupon.deletedAt) {
    throw new CouponApplicationError("COUPON_NOT_FOUND", "Coupon plateforme introuvable", 404);
  }

  if (coupon.status !== "active") {
    throw new CouponApplicationError("COUPON_INACTIVE", "Ce coupon n'est pas actif");
  }

  if (coupon.startDate && now < coupon.startDate) {
    throw new CouponApplicationError("COUPON_NOT_STARTED", "Ce coupon n'est pas encore valide");
  }

  if (coupon.endDate && now > coupon.endDate) {
    throw new CouponApplicationError("COUPON_EXPIRED", "Ce coupon a expiré");
  }

  if (Array.isArray(coupon.planIds) && coupon.planIds.length > 0) {
    const planId = subscription.planId;
    const allowed = coupon.planIds.some((id) => String(id) === String(planId));
    if (!allowed) {
      throw new CouponApplicationError(
        "COUPON_PLAN_NOT_ELIGIBLE",
        "Ce coupon n'est pas valable pour ce plan"
      );
    }
  }

  if (coupon.firstSubscriptionOnly) {
    const previous = await Subscription.countDocuments({
      storeId: subscription.storeId,
      _id: { $ne: subscription._id },
    }).session(session || null);
    if (previous > 0) {
      throw new CouponApplicationError(
        "COUPON_FIRST_SUBSCRIPTION_ONLY",
        "Ce coupon est rûrervé  un premier abonnement"
      );
    }
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new CouponApplicationError(
      "COUPON_USAGE_LIMIT_REACHED",
      "La limite d'utilisation de ce coupon est atteinte"
    );
  }

  if (coupon.usageLimitPerCustomer != null) {
    const used = await PlatformCouponRedemption.countDocuments({
      couponId: coupon._id,
      storeId: subscription.storeId,
      status: "applied",
    }).session(session || null);
    if (used >= coupon.usageLimitPerCustomer) {
      throw new CouponApplicationError(
        "COUPON_CUSTOMER_LIMIT_REACHED",
        "Ce store a déjà utilisé ce coupon le nombre de fois autorisé"
      );
    }
  }

  const already = await PlatformCouponRedemption.findOne({
    couponId: coupon._id,
    subscriptionId: subscription._id,
    status: "applied",
  }).session(session || null);
  if (already) {
    throw new CouponApplicationError(
      "COUPON_ALREADY_APPLIED",
      "Ce coupon est déjà appliqué  cet abonnement",
      409
    );
  }
};

const claimUsageSlot = async (coupon, session) => {
  const filter = { _id: coupon._id, deletedAt: null, status: "active" };
  if (coupon.usageLimit != null) {
    filter.usedCount = { $lt: coupon.usageLimit };
  }

  return PlatformCoupon.findOneAndUpdate(
    filter,
    { $inc: { usedCount: 1 } },
    { new: true, session: session || null }
  );
};

const releaseUsageSlot = async (couponId) => {
  try {
    await PlatformCoupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
  } catch (err) {
    logger.error(
      `platformCouponApplication: failed to release usage slot for ${couponId}: ${err.message}`
    );
  }
};

class PlatformCouponApplicationService {
  async loadCouponByCode(code, session) {
    if (!code || typeof code !== "string") {
      throw new CouponApplicationError("COUPON_CODE_REQUIRED", "Le code du coupon est obligatoire", 400);
    }
    return PlatformCoupon.findOne({
      code: code.trim().toUpperCase(),
      deletedAt: null,
    }).session(session || null);
  }

  async preview({ code, subscriptionId }) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new CouponApplicationError("SUBSCRIPTION_NOT_FOUND", "Abonnement introuvable", 404);
    }

    const coupon = await this.loadCouponByCode(code);
    await assertEligible({ coupon, subscription });

    const invoice = await findBillableInvoice(subscription._id);
    const baseAmount = resolveBaseAmount(subscription, invoice);
    const discountAmount = computeDiscountAmount(coupon, baseAmount);

    return {
      eligible: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      duration: coupon.duration,
      durationInPeriods: coupon.durationInPeriods,
      baseAmount: round2(baseAmount),
      discountAmount,
      payableAmount: round2(Math.max(baseAmount - discountAmount, 0)),
      currency: subscription.currency || invoice?.currency || "USD",
      invoiceId: invoice ? invoice._id : null,
    };
  }

  async apply({ code, subscriptionId, actorId = null }) {
    const useTransaction = await supportsTransactions();
    const session = useTransaction ? await mongoose.startSession() : null;
    if (session) session.startTransaction();

    let claimedCouponId = null;
    let redemptionId = null;

    try {
      const subscription = await Subscription.findById(subscriptionId).session(session || null);
      if (!subscription) {
        throw new CouponApplicationError("SUBSCRIPTION_NOT_FOUND", "Abonnement introuvable", 404);
      }

      const coupon = await this.loadCouponByCode(code, session);
      await assertEligible({ coupon, subscription, session });

      const claimed = await claimUsageSlot(coupon, session);
      if (!claimed) {
        throw new CouponApplicationError(
          "COUPON_USAGE_LIMIT_REACHED",
          "La limite d'utilisation de ce coupon est atteinte"
        );
      }
      claimedCouponId = coupon._id;

      const invoice = await findBillableInvoice(subscription._id, session);
      const baseAmount = resolveBaseAmount(subscription, invoice);
      const discountAmount = computeDiscountAmount(coupon, baseAmount);
      const currency = subscription.currency || invoice?.currency || "USD";
      const periodsRemaining = periodsForDuration(coupon);

      let redemption;
      try {
        const created = await PlatformCouponRedemption.create(
          [
            {
              couponId: coupon._id,
              code: coupon.code,
              storeId: subscription.storeId,
              subscriptionId: subscription._id,
              invoiceId: invoice ? invoice._id : null,
              planId: subscription.planId,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discountAmount,
              baseAmount: round2(baseAmount),
              currency,
              duration: coupon.duration,
              periodsRemaining,
              appliedBy: actorId,
            },
          ],
          session ? { session } : {}
        );
        redemption = created[0];
        redemptionId = redemption._id;
      } catch (err) {
        if (err.code === 11000) {
          throw new CouponApplicationError(
            "COUPON_ALREADY_APPLIED",
            "Ce coupon est déjà appliqué  cet abonnement",
            409
          );
        }
        throw err;
      }

      if (coupon.usageLimitPerCustomer != null) {
        const earlier = await PlatformCouponRedemption.countDocuments({
          couponId: coupon._id,
          storeId: subscription.storeId,
          status: "applied",
          _id: { $lt: redemption._id },
        }).session(session || null);

        if (earlier >= coupon.usageLimitPerCustomer) {
          throw new CouponApplicationError(
            "COUPON_CUSTOMER_LIMIT_REACHED",
            "Ce store a déjà utilisé ce coupon le nombre de fois autorisé"
          );
        }
      }

      subscription.appliedCoupons.push({
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        appliedAt: new Date(),
        expiresAt: coupon.endDate || undefined,
        duration: coupon.duration,
        periodsRemaining,
        redemptionId: redemption._id,
      });
      await subscription.save({ session: session || undefined });

      let updatedInvoice = null;
      if (invoice) {
        invoice.discounts.push({
          couponId: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountAmount,
          appliedAt: new Date(),
        });
        recalculateInvoiceTotals(invoice);
        await invoice.save({ session: session || undefined });
        updatedInvoice = invoice;
      }

      if (session) await session.commitTransaction();

      emitEvent("coupon_applied", {
        couponId: coupon._id,
        code: coupon.code,
        storeId: subscription.storeId,
        subscriptionId: subscription._id,
        invoiceId: updatedInvoice ? updatedInvoice._id : null,
        discountAmount,
        currency,
        actorId,
      });

      return {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          duration: coupon.duration,
        },
        redemption,
        subscriptionId: subscription._id,
        baseAmount: round2(baseAmount),
        discountAmount,
        currency,
        invoice: updatedInvoice
          ? {
              _id: updatedInvoice._id,
              invoiceNumber: updatedInvoice.invoiceNumber,
              baseAmount: updatedInvoice.baseAmount,
              subtotal: updatedInvoice.subtotal,
              tax: updatedInvoice.tax,
              total: updatedInvoice.total,
              currency: updatedInvoice.currency,
            }
          : null,
      };
    } catch (err) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          logger.error(`platformCouponApplication: abort failed: ${abortErr.message}`);
        }
      } else {
        if (redemptionId) {
          await PlatformCouponRedemption.deleteOne({ _id: redemptionId }).catch((e) =>
            logger.error(`platformCouponApplication: redemption cleanup failed: ${e.message}`)
          );
        }
        if (claimedCouponId) {
          await releaseUsageSlot(claimedCouponId);
        }
      }
      throw err;
    } finally {
      if (session) session.endSession();
    }
  }
}

module.exports = new PlatformCouponApplicationService();
module.exports.CouponApplicationError = CouponApplicationError;
module.exports.computeDiscountAmount = computeDiscountAmount;
module.exports.recalculateInvoiceTotals = recalculateInvoiceTotals;
