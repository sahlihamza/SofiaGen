const UsageService = require("../service/UsageService");
const logger = require("../config/logger");
const { resolveStoreId } = require("../utils/requestContext");

const requireQuota = (quotaTypeCode, amount = 1) => async (req, res, next) => {
  const storeId = resolveStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      code: "STORE_CONTEXT_MISSING",
      message: "Aucun store résolu pour cette requéte",
    });
  }

  try {
    const result = await UsageService.tryIncrementUsage(storeId, quotaTypeCode, amount);
    req.quotaResult = result;
    req.quotaReservation = { storeId, quotaTypeCode, amount };
    return next();
  } catch (err) {
    if (err.code === "QUOTA_EXCEEDED") {
      return res.status(403).json({
        success: false,
        code: err.code,
        resource: err.resource,
        current: err.current,
        limit: err.limit,
        message: `Quota "${err.resource}" atteint (${err.current}/${err.limit})`,
      });
    }
    if (err.code === "NO_ACTIVE_SUBSCRIPTION") {
      return res.status(403).json({ success: false, code: err.code, message: err.message });
    }
    logger.error(`quotaGuard: ${quotaTypeCode} echoue: ${err.message}`);
    return res.status(err.status || 500).json({ success: false, code: err.code, message: err.message });
  }
};

const releaseReservedQuota = async (req) => {
  if (!req.quotaReservation) return null;
  const { storeId, quotaTypeCode, amount } = req.quotaReservation;
  const remaining = await UsageService.releaseQuota(storeId, quotaTypeCode, amount);
  req.quotaReservation = null;
  return remaining;
};

const releaseQuotaOnFailure = (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 400 && req.quotaReservation) {
      releaseReservedQuota(req).catch((err) =>
        logger.error(`quotaGuard: liberation automatique echouee: ${err.message}`)
      );
    }
  });
  next();
};

module.exports = { requireQuota, releaseReservedQuota, releaseQuotaOnFailure };
