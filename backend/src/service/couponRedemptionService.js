const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");

const couponError = (code, message, status = 409) => {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
};

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const computeDiscount = (coupon, amount) => {
  const base = Number(amount) || 0;
  if (base <= 0) return 0;

  const value = Number(coupon.amount) || 0;
  const raw = coupon.discountType === "percentage" ? (base * value) / 100 : value;

  return round2(Math.min(Math.max(raw, 0), base));
};

const assertEligible = async ({ coupon, storeId, customerId, amount }) => {
  const now = new Date();

  if (!coupon || coupon.deletedAt) {
    throw couponError("COUPON_NOT_FOUND", "Coupon introuvable", 404);
  }
  if (coupon.status !== "active") {
    throw couponError("COUPON_INACTIVE", "Ce coupon n'est pas actif");
  }
  if (String(coupon.storeId) !== String(storeId)) {
    throw couponError("COUPON_STORE_MISMATCH", "Ce coupon n'appartient pas  ce store", 403);
  }
  if (coupon.startDate && now < coupon.startDate) {
    throw couponError("COUPON_NOT_STARTED", "Ce coupon n'est pas encore valide");
  }
  if (coupon.endDate && now > coupon.endDate) {
    throw couponError("COUPON_EXPIRED", "Ce coupon a expiré");
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw couponError("COUPON_USAGE_LIMIT_REACHED", "La limite d'utilisation de ce coupon est atteinte");
  }
  if (coupon.usageLimitPerCustomer != null && customerId) {
    const used = await CouponUsage.countDocuments({
      couponId: coupon._id,
      customerId,
      status: "applied",
    });
    if (used >= coupon.usageLimitPerCustomer) {
      throw couponError(
        "COUPON_LIMIT_PER_CUSTOMER_REACHED",
        "Ce client a déjà utilisé ce coupon le nombre de fois autorisé"
      );
    }
  }
};

const claimUsageSlot = async (coupon) => {
  const filter = { _id: coupon._id, status: "active" };
  if (coupon.usageLimit != null) {
    filter.usedCount = { $lt: coupon.usageLimit };
  }
  return Coupon.findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { new: true });
};

const releaseUsageSlot = async (couponId) => {
  await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } }).catch((err) =>
    logger.error(`couponRedemption: liberation echouee pour ${couponId}: ${err.message}`)
  );
};

const applyCoupon = async ({ code, storeId, customerId, orderId, amount } = {}) => {
  if (!code || typeof code !== "string") {
    throw couponError("COUPON_CODE_REQUIRED", "Le code du coupon est obligatoire", 400);
  }
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw couponError("ORDER_REQUIRED", "orderId est obligatoire", 400);
  }

  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
    storeId,
  });

  await assertEligible({ coupon, storeId, customerId, amount });

  const claimed = await claimUsageSlot(coupon);
  if (!claimed) {
    throw couponError("COUPON_USAGE_LIMIT_REACHED", "La limite d'utilisation de ce coupon est atteinte");
  }

  const discountAmount = computeDiscount(coupon, amount);

  let usage;
  try {
    usage = await CouponUsage.create({
      storeId,
      couponId: coupon._id,
      customerId,
      orderId,
      discountAmount,
      status: "applied",
      usedAt: new Date(),
    });
  } catch (err) {
    await releaseUsageSlot(coupon._id);
    if (err.code === 11000) {
      throw couponError("COUPON_ALREADY_APPLIED", "Ce coupon est déjà appliqué  cette commande");
    }
    throw err;
  }

  emitEvent("coupon.applied", {
    storeId,
    entityId: usage._id,
    metadata: { couponId: String(coupon._id), code: coupon.code, discountAmount, orderId: String(orderId) },
  });

  return {
    usage,
    couponId: coupon._id,
    code: coupon.code,
    discountAmount,
    originalAmount: round2(amount),
    finalAmount: round2(Math.max(Number(amount) - discountAmount, 0)),
  };
};

const revertCoupon = async ({ couponId, orderId }) => {
  const usage = await CouponUsage.findOne({ couponId, orderId, status: "applied" });
  if (!usage) return null;

  usage.status = "cancelled";
  await usage.save();
  await releaseUsageSlot(couponId);

  return usage;
};

module.exports = {
  applyCoupon,
  revertCoupon,
  computeDiscount,
  assertEligible,
};
