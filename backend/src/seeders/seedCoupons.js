const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedCoupons = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Coupon.deleteMany({});
    console.log("Cleared existing coupons");

    console.log("Seeded coupons (0 records - clean slate)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding coupons:", error);
    process.exit(1);
  }
};

seedCoupons();