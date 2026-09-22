const defaultQuotaTypes = [
  { code: 'products', name: 'Products', unit: 'number' },
  { code: 'orders', name: 'Orders', unit: 'number' },
  { code: 'admins', name: 'Admins', unit: 'number' },
  { code: 'images', name: 'Images', unit: 'number' },
  { code: 'storage', name: 'Storage', unit: 'gb' },
  { code: 'api_calls', name: 'API Calls', unit: 'number' },
  { code: 'languages', name: 'Languages', unit: 'number' },
  { code: 'domains', name: 'Domains', unit: 'number' },
  { code: 'categories', name: 'Categories', unit: 'number' },
  { code: 'brands', name: 'Brands', unit: 'number' },
  { code: 'tags', name: 'Tags', unit: 'number' },
  { code: 'coupons', name: 'Coupons', unit: 'number' },
  { code: 'pos', name: 'POS', unit: 'number' },
  { code: 'warehouses', name: 'Warehouses', unit: 'number' },
];

const seedQuotaTypes = async () => {
  const { connectDB } = require('../config/db');
  const QuotaType = require('../models/QuotaType');
  await connectDB();

  try {
    const operations = defaultQuotaTypes.map((quota) =>
      QuotaType.updateOne(
        { code: quota.code.toLowerCase() },
        {
          $set: {
            code: quota.code.toLowerCase(),
            name: quota.name,
            unit: quota.unit,
            allowUnlimited: true,
          },
        },
        { upsert: true }
      )
    );

    await Promise.all(operations);
    console.log(`Seeded ${defaultQuotaTypes.length} quota types`);
  } catch (error) {
    console.error('Failed to seed quota types', error);
    throw error;
  }
};

module.exports = { defaultQuotaTypes, seedQuotaTypes };

if (require.main === module) {
  (async () => {
    try {
      await seedQuotaTypes();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed quota types', error);
      process.exit(1);
    }
  })();
}