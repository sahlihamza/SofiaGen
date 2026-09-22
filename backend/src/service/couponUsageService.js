const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const Notification = require("../models/Notification");

class CouponUsageService {
  // Verifies the coupon exists, isn't soft-deleted, and belongs to the
  // active store  mirrors the ownership check used in Phases 2/3.
  async getOwnedCoupon(couponId, storeId) {
    return await Coupon.findOne({ _id: couponId, storeId, deletedAt: null });
  }

  // Records a coupon usage and bumps Coupon.usedCount with a single atomic
  // $inc  never a "read usedCount, add 1, write it back", which would lose
  // increments if two orders apply the same coupon at the same time.
  async recordUsage(storeId, couponId, customerId, orderId, discountAmount) {

    const usage = await CouponUsage.create({
      storeId,
      couponId,
      customerId,
      orderId,
      discountAmount,
      status: "applied",
    });

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    // Story 17: notify exactly once, the moment the limit is reached (not on
    // every usage afterwards, and not if there's no limit at all).
    if (
      updatedCoupon &&
      updatedCoupon.usageLimit !== null &&
      updatedCoupon.usageLimit !== undefined &&
      updatedCoupon.usedCount === updatedCoupon.usageLimit
    ) {
      Notification.create({
        couponId: updatedCoupon._id,
        message: `Le coupon ${updatedCoupon.code} a atteint sa limite d'utilisation (${updatedCoupon.usageLimit}).`,
      }).catch(() => {});
    }

    return usage;
  }

  // Only ever decrements once per usage: the status filter in the query
  // makes the transition "applied -> cancelled" atomic, so a usage that's
  // already cancelled/refunded (or concurrently being cancelled) can't be
  // decremented twice.
  async cancelUsage(usageId) {
    const usage = await CouponUsage.findOneAndUpdate(
      { _id: usageId, status: "applied" },
      { $set: { status: "cancelled" } }
    );
    if (!usage) return null;

    await Coupon.findByIdAndUpdate(usage.couponId, { $inc: { usedCount: -1 } });

    return await CouponUsage.findById(usageId);
  }

  async getUsageHistory({ storeId, couponId, customerId, page, limit } = {}) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    const queryObject = { couponId };
    if (customerId) queryObject.customerId = customerId;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const totalDoc = await CouponUsage.countDocuments(queryObject);
    const usages = await CouponUsage.find(queryObject)
      .populate("couponId", "code")
      .populate("customerId", "name email")
      .populate("orderId", "invoice total")
      .sort({ usedAt: -1 })
      .skip(skip)
      .limit(limits);

    return { usages, totalDoc, limits, pages };
  }

  // Used in Phase 5 to enforce usageLimitPerCustomer: only "applied" usages
  // count  a cancelled/refunded one shouldn't keep counting against the limit.
  async getUsageCountForCustomer(couponId, customerId) {
    return await CouponUsage.countDocuments({ couponId, customerId, status: "applied" });
  }

  async getUsageCountToday(couponId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfDay);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    return await CouponUsage.countDocuments({
      couponId,
      status: "applied",
      usedAt: { $gte: startOfDay, $lt: startOfTomorrow },
    });
  }
}

module.exports = new CouponUsageService();
