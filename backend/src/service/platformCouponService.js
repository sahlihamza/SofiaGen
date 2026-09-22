const PlatformCoupon = require("../models/PlatformCoupon");
const Discount = require("../models/Discount");

class PlatformCouponService {
  async getAllCoupons({
    search,
    status,
    page,
    limit,
    includeDeleted,
    deletedOnly,
  } = {}) {
    const queryObject = {};
    const isTrue = (value) => value === true || value === "true";

    if (isTrue(deletedOnly)) {
      queryObject.deletedAt = { $ne: null };
    } else if (!includeDeleted || includeDeleted === "false") {
      queryObject.deletedAt = null;
    }

    if (search) {
      queryObject.$or = [
        { code: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }

    if (status) queryObject.status = status;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const totalDoc = await PlatformCoupon.countDocuments(queryObject);
    const coupons = await PlatformCoupon.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    return { coupons, totalDoc, limits, pages };
  }

  async getById(id) {
    return await PlatformCoupon.findOne({ _id: id, deletedAt: null });
  }

  async create(data) {
    const coupon = await PlatformCoupon.create(data);
    return coupon;
  }

  async update(id, data) {
    const coupon = await PlatformCoupon.findOneAndUpdate(
      { _id: id, deletedAt: null },
      data,
      { new: true }
    );
    return coupon;
  }

  async softDelete(id) {
    const coupon = await PlatformCoupon.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    return coupon;
  }

  async restore(id) {
    const coupon = await PlatformCoupon.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );
    return coupon;
  }

  async activate(id) {
    const coupon = await PlatformCoupon.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status: "active" },
      { new: true }
    );
    return coupon;
  }

  async deactivate(id) {
    const coupon = await PlatformCoupon.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status: "inactive" },
      { new: true }
    );
    return coupon;
  }

  async archive(id) {
    const coupon = await PlatformCoupon.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status: "archived" },
      { new: true }
    );
    return coupon;
  }

  async createDiscount(couponId, discountData) {
    const coupon = await PlatformCoupon.findOne({ _id: couponId, deletedAt: null });
    if (!coupon) throw new Error("Coupon not found");

    const { discountType, discountAmount, maxDiscountAmount, appliesTo, minAmount, maxUses, validFrom, validUntil } = discountData;

    if (coupon.discountId) {
      throw new Error("Coupon already has an associated discount");
    }

    const discount = await Discount.create({
      code: coupon.code,
      couponId: coupon._id,
      discountType,
      discountAmount,
      maxDiscountAmount,
      appliesTo: appliesTo || "plan",
      minAmount,
      maxUses,
      validFrom: validFrom || new Date(),
      validUntil: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      active: coupon.status === "active",
      createdBy: discountData.createdBy,
    });

    coupon.discountId = discount._id;
    await coupon.save();

    return discount;
  }

  async getDiscountByCode(code) {
    const discount = await Discount.findOne({
      code: String(code).trim().toUpperCase(),
      active: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() },
    }).populate("couponId", "code title status");

    if (!discount) return null;
    if (discount.maxUses && discount.usedCount >= discount.maxUses) return null;

    return discount;
  }

  async applyDiscount(discountCode, amount) {
    const discount = await this.getDiscountByCode(discountCode);
    if (!discount) throw new Error("Discount not found or expired");

    let discountAmount = discount.discountType === "percentage"
      ? (amount * discount.discountAmount) / 100
      : discount.discountAmount;

    if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
      discountAmount = discount.maxDiscountAmount;
    }

    if (discount.minAmount && amount < discount.minAmount) {
      throw new Error(`Minimum amount of ${discount.minAmount} required to apply this discount`);
    }

    discount.usedCount = (discount.usedCount || 0) + 1;
    await discount.save();

    return {
      discountId: discount._id,
      code: discount.code,
      discountType: discount.discountType,
      discountAmount,
      originalAmount: amount,
      finalAmount: amount - discountAmount,
    };
  }

  async getDiscounts({ page = 1, limit = 20, couponId, active, search, sort = "-createdAt" } = {}) {
    const query = {};
    if (couponId) query.couponId = couponId;
    if (active !== undefined) query.active = active;
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { "couponId.code": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Discount.countDocuments(query);
    const discounts = await Discount.find(query)
      .populate("couponId", "code title status")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));

    return { data: discounts, total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) };
  }

  async updateDiscount(id, data) {
    const discount = await Discount.findByIdAndUpdate(id, data, { new: true });
    if (!discount) throw new Error("Discount not found");
    return discount;
  }

  async deleteDiscount(id) {
    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) throw new Error("Discount not found");

    await PlatformCoupon.updateOne(
      { discountId: id },
      { $unset: { discountId: 1 } }
    );

    return discount;
  }
}

module.exports = new PlatformCouponService();