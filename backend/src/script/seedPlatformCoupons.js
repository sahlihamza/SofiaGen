const platformCoupons = require("../utils/platformCoupons");

const seedPlatformCoupons = async () => {
  const { connectDB } = require("../config/db");
  const PlatformCoupon = require("../models/PlatformCoupon");
  await connectDB();

  try {
    await PlatformCoupon.deleteMany({});
    await PlatformCoupon.insertMany(platformCoupons);
    console.log(`Seeded ${platformCoupons.length} platform coupons`);
  } catch (error) {
    console.error("Failed to seed platform coupons", error);
    throw error;
  }
};

module.exports = { platformCoupons, seedPlatformCoupons };

if (require.main === module) {
  (async () => {
    try {
      await seedPlatformCoupons();
      process.exit(0);
    } catch (error) {
      console.error("Failed to seed platform coupons", error);
      process.exit(1);
    }
  })();
}