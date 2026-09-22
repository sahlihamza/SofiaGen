const normalizePlanFeatures = (features = []) => {
  if (Array.isArray(features)) {
    return features.map((feature) => ({
      code: feature?.code || feature?.key || '',
      enabled: Boolean(feature?.enabled),
      limit: feature?.limit ?? null,
    })).filter((feature) => feature.code);
  }

  if (features && typeof features === 'object') {
    return Object.entries(features).map(([code, enabled]) => ({
      code,
      enabled: Boolean(enabled),
      limit: null,
    }));
  }

  return [];
};

const toLegacyFeatureMap = (features = []) => {
  const normalized = normalizePlanFeatures(features);
  return normalized.reduce((acc, feature) => {
    acc[feature.code] = Boolean(feature.enabled);
    return acc;
  }, {});
};

module.exports = {
  normalizePlanFeatures,
  toLegacyFeatureMap,
};
