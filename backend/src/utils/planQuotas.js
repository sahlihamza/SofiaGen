const normalizePlanQuotas = (limits = {}) => {
  if (Array.isArray(limits)) {
    return limits.map((quota) => ({
      quotaTypeCode: quota?.quotaTypeCode || quota?.code || '',
      limitValue: quota?.limitValue ?? quota?.value ?? null,
      isUnlimited: Boolean(quota?.isUnlimited) || quota?.limitValue === null || quota?.value === null,
    })).filter((quota) => quota.quotaTypeCode);
  }

  if (limits && typeof limits === 'object') {
    return Object.entries(limits).map(([quotaTypeCode, limitValue]) => ({
      quotaTypeCode,
      limitValue,
      isUnlimited: limitValue === null || limitValue === undefined,
    }));
  }

  return [];
};

const toLegacyLimitsMap = (quotas = []) => {
  const normalized = normalizePlanQuotas(quotas);
  return normalized.reduce((acc, quota) => {
    if (!quota.isUnlimited) {
      acc[quota.quotaTypeCode] = quota.limitValue;
    } else {
      acc[quota.quotaTypeCode] = null;
    }
    return acc;
  }, {});
};

module.exports = {
  normalizePlanQuotas,
  toLegacyLimitsMap,
};
