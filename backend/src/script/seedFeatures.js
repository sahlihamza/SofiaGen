const defaultFeatures = [
  { code: 'products', name: 'Products', featureGroupCode: 'catalog' },
  { code: 'orders', name: 'Orders', featureGroupCode: 'orders' },
  { code: 'customers', name: 'Customers', featureGroupCode: 'customers' },
  { code: 'coupons', name: 'Coupons', featureGroupCode: 'marketing' },
  { code: 'blog', name: 'Blog', featureGroupCode: 'cms' },
  { code: 'analytics', name: 'Analytics', featureGroupCode: 'analytics' },
  { code: 'builder', name: 'Builder', featureGroupCode: 'settings' },
  { code: 'api', name: 'API', featureGroupCode: 'api' },
  { code: 'pos', name: 'POS', featureGroupCode: 'pos' },
  { code: 'marketplace', name: 'Marketplace', featureGroupCode: 'catalog' },
  { code: 'ai', name: 'AI', featureGroupCode: 'ai' },
  { code: 'cms', name: 'CMS', featureGroupCode: 'cms' },
];

const seedFeatures = async () => {
  const { connectDB } = require('../config/db');
  const Feature = require('../models/Feature');
  const FeatureGroup = require('../models/FeatureGroup');
  await connectDB();

  try {
    const groups = await FeatureGroup.find({}, { code: 1, _id: 1 });
    const groupByCode = {};
    groups.forEach((g) => { groupByCode[g.code] = g._id; });

    const operations = defaultFeatures.map((feature) => {
      const featureGroupId = groupByCode[feature.featureGroupCode];
      if (!featureGroupId) {
        console.warn(`FeatureGroup with code "${feature.featureGroupCode}" not found for feature "${feature.code}"`);
      }
      return Feature.updateOne(
        { code: feature.code.toLowerCase() },
        {
          $set: {
            code: feature.code.toLowerCase(),
            name: feature.name,
            featureGroupId: featureGroupId || null,
            status: 'active',
          },
        },
        { upsert: true }
      );
    });

    await Promise.all(operations);
    console.log(`Seeded ${defaultFeatures.length} features`);
  } catch (error) {
    console.error('Failed to seed features', error);
    throw error;
  }
};

module.exports = { defaultFeatures, seedFeatures };

if (require.main === module) {
  (async () => {
    try {
      await seedFeatures();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed features', error);
      process.exit(1);
    }
  })();
}