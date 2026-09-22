const mongoose = require("mongoose");
const UsageCounter = require("../models/UsageCounter");
const UsageHistory = require("../models/UsageHistory");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedUsageCounters = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await UsageCounter.deleteMany({});
    await UsageHistory.deleteMany({});
    console.log("Cleared existing usage data");

    console.log("Seeded usage counters (0 records - clean slate)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding usage counters:", error);
    process.exit(1);
  }
};

seedUsageCounters();