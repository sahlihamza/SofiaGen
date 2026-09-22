const mongoose = require("mongoose");
const PlanVersion = require("../models/PlanVersion");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPlanVersions = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await PlanVersion.deleteMany({});
    console.log("Cleared existing plan versions");

    const versions = [
      {
        planId: null,
        version: 1,
        name: "Initial Release",
        description: "Initial version of the plan",
        changes: ["Initial release"],
        snapshot: {},
        createdBy: null,
      },
    ];

    await PlanVersion.insertMany(versions);
    console.log(`Seeded ${versions.length} plan versions`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding plan versions:", error);
    process.exit(1);
  }
};

seedPlanVersions();