const FeatureFlag = require("../models/FeatureFlag");
const logger = require("../config/logger");

const resolveStoreId = (req) =>
  req.storeId || req.currentStoreId || req.authContext?.storeId || null;

const isFlagEnabled = async (flagKey, storeId = null) => {
  const flag = await FeatureFlag.findOne({
    $or: [{ key: flagKey }, { code: flagKey }, { name: flagKey }],
  }).lean();

  if (!flag) return false;
  if (flag.enabled === false || flag.isEnabled === false || flag.status === "disabled") return false;

  if (storeId && Array.isArray(flag.storeIds) && flag.storeIds.length > 0) {
    return flag.storeIds.some((id) => String(id) === String(storeId));
  }

  return flag.enabled === true || flag.isEnabled === true || flag.status === "enabled" || flag.status === "active";
};

const checkFeatureFlag = (flagKey) => async (req, res, next) => {
  try {
    const enabled = await isFlagEnabled(flagKey, resolveStoreId(req));
    if (!enabled) {
      return res.status(403).json({
        success: false,
        code: "FEATURE_FLAG_DISABLED",
        flag: flagKey,
        message: `La fonctionnalité "${flagKey}" est désactivé`,
      });
    }
    return next();
  } catch (err) {
    logger.error(`featureFlagGuard: ${flagKey} echoue: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { checkFeatureFlag, isFlagEnabled };
