const Coupon = require("../models/Coupon");
const CouponCondition = require("../models/CouponCondition");
const { getActiveStoreId } = require("../utils/getActiveStore");
const SoftLimitService = require("./SoftLimitService");
const StoreUsageService = require("./StoreUsageService");

class CouponService {
  async getAllCoupons({
    storeId,
    search,
    status,
    page,
    limit,
    includeDeleted,
    deletedOnly,
    usedOnly,
    allowFreeShipping,
    autoApply,
  } = {}) {
    const finalStoreId = storeId || await getActiveStoreId();
    const queryObject = { storeId: finalStoreId };
    const isTrue = (value) => value === true || value === "true";

    // Phase 7 "Corbeille" view: only soft-deleted coupons. Takes priority
    // over includeDeleted, which otherwise defaults to excluding them.
    if (isTrue(deletedOnly)) {
      queryObject.deletedAt = { $ne: null };
    } else if (!includeDeleted || includeDeleted === "false") {
      queryObject.deletedAt = null;
    }

    if (search) {
      queryObject.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) queryObject.status = status;

    // Phase 7 quick filters  additive, only applied when explicitly requested.
    if (isTrue(usedOnly)) queryObject.usedCount = { $gt: 0 };
    if (isTrue(allowFreeShipping)) queryObject.allowFreeShipping = true;
    if (isTrue(autoApply)) queryObject.autoApply = true;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const totalDoc = await Coupon.countDocuments(queryObject);
    const coupons = await Coupon.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    return { coupons, totalDoc, limits, pages };
  }

  async getById(id) {
    return await Coupon.findOne({ _id: id, deletedAt: null });
  }

  async create(data, createdBy, storeIdParam) {
    const storeId = storeIdParam || await getActiveStoreId();
    const code = String(data.code || "").trim().toUpperCase();

    const existing = await Coupon.findOne({ storeId, code });
    if (existing) {
      const error = new Error("Un coupon avec ce code existe déjà pour cette boutique");
      error.code = "DUPLICATE_CODE";
      throw error;
    }

    const quotaCheck = await SoftLimitService.checkQuotaAvailable(storeId, "coupons", 1);
    if (!quotaCheck.allowed) {
      const error = new Error(`Quota de coupons atteint pour cette boutique (${quotaCheck.used}/${quotaCheck.limit})`);
      error.code = "QUOTA_EXCEEDED";
      throw error;
    }

    const coupon = new Coupon({
      storeId,
      code,
      description: data.description,
      discountType: data.discountType,
      amount: data.amount,
      allowFreeShipping: data.allowFreeShipping ?? false,
      status: data.status || "active",
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      priority: data.priority ?? 0,
      usageLimit: data.usageLimit ?? null,
      usageLimitPerCustomer: data.usageLimitPerCustomer ?? null,
      autoApply: data.autoApply ?? false,
      stackable: data.stackable ?? false,
      isPublic: data.isPublic ?? true,
      createdBy,
    });

    const saved = await coupon.save();
    // Non-fatal: usage tracking must never roll back a successful create,
    // matching the existing fire-and-forget convention in storeRoute.js.
    StoreUsageService.incrementUsage(storeId, "coupons", 1).catch(() => {});
    return saved;
  }

  async update(id, data, storeId) {
    const query = { _id: id, deletedAt: null };
    if (storeId) query.storeId = storeId;
    const current = await Coupon.findOne(query);
    if (!current) return null;

    const editableFields = [
      "description",
      "discountType",
      "amount",
      "allowFreeShipping",
      "status",
      "startDate",
      "endDate",
      "priority",
      "usageLimit",
      "usageLimitPerCustomer",
      "autoApply",
      "stackable",
      "isPublic",
    ];

    const updates = {};
    for (const field of editableFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    if (data.code && data.code.trim().toUpperCase() !== current.code) {
      const newCode = data.code.trim().toUpperCase();
      const existing = await Coupon.findOne({
        storeId: current.storeId,
        code: newCode,
        _id: { $ne: id },
      });
      if (existing) {
        const error = new Error("Un coupon avec ce code existe déjà pour cette boutique");
        error.code = "DUPLICATE_CODE";
        throw error;
      }
      updates.code = newCode;
    }

    return await Coupon.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async duplicate(id, createdBy, storeId) {
    const query = { _id: id, deletedAt: null };
    if (storeId) query.storeId = storeId;
    const original = await Coupon.findOne(query);
    if (!original) return null;

    let newCode = `${original.code}-COPY`;
    let suffix = 1;
    while (await Coupon.findOne({ storeId: original.storeId, code: newCode })) {
      suffix += 1;
      newCode = `${original.code}-COPY-${suffix}`;
    }

    const copy = new Coupon({
      storeId: original.storeId,
      code: newCode,
      description: original.description,
      discountType: original.discountType,
      amount: original.amount,
      allowFreeShipping: original.allowFreeShipping,
      status: "inactive",
      startDate: original.startDate,
      endDate: original.endDate,
      priority: original.priority,
      usageLimit: original.usageLimit,
      usageLimitPerCustomer: original.usageLimitPerCustomer,
      autoApply: original.autoApply,
      stackable: original.stackable,
      isPublic: original.isPublic,
      createdBy,
    });

    return await copy.save();
  }

  async archive(id, storeId) {
    const query = { _id: id, deletedAt: null };
    if (storeId) query.storeId = storeId;
    return await Coupon.findOneAndUpdate(
      query,
      { $set: { status: "archived" } },
      { new: true }
    );
  }

  // Story 16: dedicated activate/deactivate, gated by their own permissions
  // (coupon.activate / coupon.deactivate) rather than the generic
  // coupon.update the Phase 7 quick-toggle used before.
  async activate(id, storeId) {
    const query = { _id: id, deletedAt: null };
    if (storeId) query.storeId = storeId;
    return await Coupon.findOneAndUpdate(
      query,
      { $set: { status: "active" } },
      { new: true }
    );
  }

  async deactivate(id, storeId) {
    const query = { _id: id, deletedAt: null };
    if (storeId) query.storeId = storeId;
    return await Coupon.findOneAndUpdate(
      query,
      { $set: { status: "inactive" } },
      { new: true }
    );
  }

  async softDelete(id, storeId) {
    const query = { _id: id, deletedAt: null };
    if (storeId) query.storeId = storeId;
    return await Coupon.findOneAndUpdate(
      query,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
  }

  async restore(id) {
    return await Coupon.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true }
    );
  }

  // Story 8: coupons the cart can offer without the customer typing a code.
  // Only checks what's knowable from cartSubtotal alone (status, dates,
  // global usage limit, minSpend/minSubtotal/maxSpend)  product/geo/rule
  // restrictions still need the full couponValidationService.validateCoupon()
  // pass once the customer's cart/profile context is available.
  async getAutoApplicableCoupons(storeId, cartSubtotal) {
    const now = new Date();
    const subtotal = cartSubtotal || 0;

    const candidates = await Coupon.find({
      storeId,
      deletedAt: null,
      status: "active",
      autoApply: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    }).sort({ priority: -1 });

    const eligible = [];
    for (const coupon of candidates) {
      if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) continue;

      const condition = await CouponCondition.findOne({ couponId: coupon._id });
      if (condition?.minSpend != null && subtotal < condition.minSpend) continue;
      if (condition?.minSubtotal != null && subtotal < condition.minSubtotal) continue;
      if (condition?.maxSpend != null && subtotal > condition.maxSpend) continue;

      eligible.push(coupon);
    }

    return eligible;
  }
}

module.exports = new CouponService();
