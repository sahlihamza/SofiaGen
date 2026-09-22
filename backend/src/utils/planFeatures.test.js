const { normalizePlanFeatures, toLegacyFeatureMap } = require('./planFeatures');

describe('plan feature normalization', () => {
  it('converts a feature object map into a normalized array', () => {
    const input = {
      products: true,
      orders: false,
      analytics: true,
    };

    expect(normalizePlanFeatures(input)).toEqual([
      { code: 'products', enabled: true, limit: null },
      { code: 'orders', enabled: false, limit: null },
      { code: 'analytics', enabled: true, limit: null },
    ]);
  });

  it('keeps arrays intact and normalizes their fields', () => {
    const input = [
      { code: 'products', enabled: true },
      { code: 'orders', enabled: false },
      { code: 'ai_assistant', enabled: true, limit: 5 },
    ];

    expect(normalizePlanFeatures(input)).toEqual([
      { code: 'products', enabled: true, limit: null },
      { code: 'orders', enabled: false, limit: null },
      { code: 'ai_assistant', enabled: true, limit: 5 },
    ]);
  });

  it('builds a legacy feature map from normalized entries', () => {
    const input = [
      { code: 'products', enabled: true },
      { code: 'orders', enabled: false },
    ];

    expect(toLegacyFeatureMap(input)).toEqual({ products: true, orders: false });
  });
});
