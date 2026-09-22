const mongoose = require("mongoose");
require("dotenv").config();
const Plan = require("../models/Plan");
const PlanUpgradeRule = require("../models/PlanUpgradeRule");
const PlanDowngradeRule = require("../models/PlanDowngradeRule");

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/saas";

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    const plans = await Plan.find({ status: "active" }).sort({ "pricing.monthly": 1 });
    if (plans.length < 2) {
      console.log("Need at least 2 active plans to seed upgrade/downgrade rules. Skipping.");
      await mongoose.disconnect();
      return;
    }

    const existingUp = await PlanUpgradeRule.countDocuments({});
    const existingDown = await PlanDowngradeRule.countDocuments({});

    // --- Upgrade rules between consecutive plans (cheapest -> more expensive) ---
    if (existingUp === 0) {
      for (let i = 0; i < plans.length - 1; i++) {
        const from = plans[i];
        const to = plans[i + 1];
        await PlanUpgradeRule.create({
          name: `${from.name}  ${to.name}`,
          description: `Upgrade from ${from.name} to ${to.name}.`,
          fromPlanId: from._id,
          toPlanId: to._id,
          strategy: "prorata",
          requiresApproval: false,
          approvedByRole: "any",
          prorataMode: "daily",
          allowSchedule: true,
          minDaysOnPlan: 0,
          generateInvoiceImmediately: true,
          appliesTo: "all",
          storeIds: [],
          status: "active",
          version: 1,
        });
      }
      console.log(`Seeded ${plans.length - 1} upgrade rules.`);
    } else {
      console.log(`Upgrade rules already seeded (${existingUp}). Skipping.`);
    }

    // --- Downgrade rules between consecutive plans (expensive -> cheaper) ---
    if (existingDown === 0) {
      for (let i = plans.length - 1; i > 0; i--) {
        const from = plans[i];
        const to = plans[i - 1];
        await PlanDowngradeRule.create({
          name: `${from.name}  ${to.name}`,
          description: `Downgrade from ${from.name} to ${to.name}.`,
          fromPlanId: from._id,
          toPlanId: to._id,
          quotaExceedPolicy: "grace_period",
          graceDays: 7,
          requiresApproval: false,
          approvedByRole: "any",
          effectiveStrategy: "next_renewal",
          issueProratedCredit: true,
          preserveExcessData: true,
          minDaysOnPlan: 0,
          appliesTo: "all",
          status: "active",
          version: 1,
        });
      }
      console.log(`Seeded ${plans.length - 1} downgrade rules.`);
    } else {
      console.log(`Downgrade rules already seeded (${existingDown}). Skipping.`);
    }

    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error("Seeding failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
