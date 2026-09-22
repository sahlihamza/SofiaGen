const mongoose = require("mongoose");
const Discount = require("../models/Discount");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedDiscounts = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Discount.deleteMany({});
    console.log("Cleared existing discounts");

    console.log("Seeded discounts (0 records - clean slate)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding discounts:", error);
    process.exit(1);
  }
};

seedDiscounts();