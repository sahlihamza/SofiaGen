const mongoose = require("mongoose");
const PlanEligibilityRule = require("../models/PlanEligibilityRule");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPlanEligibility = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await PlanEligibilityRule.deleteMany({});
    console.log("Cleared existing eligibility rules");

    const rules = [
      {
        name: "Minimum Plan Requirement",
        slug: "min-plan-requirement",
        description: "Store must have an active plan to access features",
        conditions: { minPlanVersion: 1 },
        action: "allow",
        priority: 1,
        active: true,
      },
      {
        name: "Trial Eligibility",
        slug: "trial-eligibility",
        description: "New stores are eligible for trial period",
        conditions: { trialDays: 14 },
        action: "apply_trial",
        priority: 2,
        active: true,
      },
    ];

    await PlanEligibilityRule.insertMany(rules);
    console.log(`Seeded ${rules.length} eligibility rules`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding eligibility rules:", error);
    process.exit(1);
  }
};

seedPlanEligibility();