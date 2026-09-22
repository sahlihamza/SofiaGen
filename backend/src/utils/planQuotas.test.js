const { normalizePlanQuotas, toLegacyLimitsMap } = require('./planQuotas');

describe('plan quota normalization', () => {
  it('converts a limits object into normalized entries', () => {
    const input = {
      products: 500,
      admins: 10,
      storage: 20,
      api_calls: 50000,
    };

    expect(normalizePlanQuotas(input)).toEqual([
      { quotaTypeCode: 'products', limitValue: 500, isUnlimited: false },
      { quotaTypeCode: 'admins', limitValue: 10, isUnlimited: false },
      { quotaTypeCode: 'storage', limitValue: 20, isUnlimited: false },
      { quotaTypeCode: 'api_calls', limitValue: 50000, isUnlimited: false },
    ]);
  });

  it('converts null values to unlimited entries', () => {
    const input = { storage: null, domains: 3 };

    expect(normalizePlanQuotas(input)).toEqual([
      { quotaTypeCode: 'storage', limitValue: null, isUnlimited: true },
      { quotaTypeCode: 'domains', limitValue: 3, isUnlimited: false },
    ]);
  });

  it('builds a legacy limits map from normalized entries', () => {
    const input = [
      { quotaTypeCode: 'products', limitValue: 500, isUnlimited: false },
      { quotaTypeCode: 'admins', limitValue: 10, isUnlimited: false },
    ];

    expect(toLegacyLimitsMap(input)).toEqual({ products: 500, admins: 10 });
  });
});
