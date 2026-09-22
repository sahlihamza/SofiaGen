const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");

const quotaTypeCache = new Map();

const getQuotaTypeByCode = async (code) => {
  if (!code) {
    throw new Error("Quota type code is required");
  }

  const normalizedCode = String(code).trim().toLowerCase();
  if (quotaTypeCache.has(normalizedCode)) {
    return quotaTypeCache.get(normalizedCode);
  }

  const quotaType = await QuotaType.findOne({ code: normalizedCode });
  if (!quotaType) {
    throw new Error(`Quota type '${normalizedCode}' not found`);
  }

  quotaTypeCache.set(normalizedCode, quotaType);
  return quotaType;
};

const updateUsage = async (storeId, quotaTypeCode, delta) => {
  if (!storeId) {
    throw new Error("storeId is required");
  }
  if (!quotaTypeCode) {
    throw new Error("quotaTypeCode is required");
  }

  const quotaType = await getQuotaTypeByCode(quotaTypeCode);
  const filter = { storeId, quotaTypeId: quotaType._id };

  if (delta === 0) {
    return await StoreUsage.findOne(filter);
  }

  if (delta > 0) {
    return await StoreUsage.findOneAndUpdate(
      filter,
      { $inc: { used: delta } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  const usage = await StoreUsage.findOneAndUpdate(filter, { $inc: { used: delta } }, { new: true });
  if (!usage) {
    return null;
  }

  if (usage.used < 0) {
    usage.used = 0;
    await usage.save();
  }

  return usage;
};

const incrementUsage = async (storeId, quotaTypeCode, amount = 1) => {
  const step = Number(amount) || 0;
  if (step <= 0) {
    return null;
  }
  return updateUsage(storeId, quotaTypeCode, step);
};

const decrementUsage = async (storeId, quotaTypeCode, amount = 1) => {
  const step = Number(amount) || 0;
  if (step <= 0) {
    return null;
  }
  return updateUsage(storeId, quotaTypeCode, -step);
};

const setUsage = async (storeId, quotaTypeCode, value = 0) => {
  if (!storeId) {
    throw new Error("storeId is required");
  }
  if (!quotaTypeCode) {
    throw new Error("quotaTypeCode is required");
  }

  const quotaType = await getQuotaTypeByCode(quotaTypeCode);
  const normalizedValue = Math.max(0, Number(value) || 0);

  return StoreUsage.findOneAndUpdate(
    { storeId, quotaTypeId: quotaType._id },
    { used: normalizedValue },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  incrementUsage,
  decrementUsage,
  setUsage,
  getQuotaTypeByCode,
};
