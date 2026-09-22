const mongoose = require("mongoose");
const GracePeriod = require("../models/GracePeriod");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedGracePeriods = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await GracePeriod.deleteMany({});
    console.log("Cleared existing grace periods");

    console.log("Seeded grace periods (0 records - clean slate)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding grace periods:", error);
    process.exit(1);
  }
};

seedGracePeriods();