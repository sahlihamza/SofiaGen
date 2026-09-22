const mongoose = require("mongoose");
const PlatformCoupon = require("../models/PlatformCoupon");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPlatformCoupons = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await PlatformCoupon.deleteMany({});
    console.log("Cleared existing platform coupons");

    console.log("Seeded platform coupons (0 records - clean slate)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding platform coupons:", error);
    process.exit(1);
  }
};

seedPlatformCoupons();