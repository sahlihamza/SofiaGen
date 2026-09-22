const mongoose = require("mongoose");
require("dotenv").config();
const Plan = require("../models/Plan");
const Overage = require("../models/Overage");

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/saas";

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    if ((await Overage.countDocuments({})) > 0) {
      console.log("Overages already seeded. Skipping.");
      await mongoose.disconnect();
      return;
    }

    const plans = await Plan.find({ status: "active" });

    // Overage rules by quota type (applies to all plans)
    const defaults = [
      { quotaTypeCode: "orders", threshold: 0, unitPrice: 0.05, name: "Orders overage", description: "Per-extra-order billing" },
      { quotaTypeCode: "products", threshold: 0, unitPrice: 0.02, name: "Products overage", description: "Per-extra-product billing" },
      { quotaTypeCode: "customers", threshold: 0, unitPrice: 0.03, name: "Customers overage", description: "Per-extra-customer billing" },
      { quotaTypeCode: "api_calls", threshold: 0, unitPrice: 0.001, name: "API calls overage", description: "Per-thousand extra API calls (0.001/unit)" },
      { quotaTypeCode: "storage_gb", threshold: 0, unitPrice: 0.5, name: "Storage overage", description: "Per extra GB per month" },
    ];

    for (const d of defaults) {
      await Overage.create({
        ...d,
        planIds: [],
        appliesToAllPlans: true,
        currency: "USD",
        billingStrategy: "pay_as_you_go",
        maxOverage: 0,
        minBillableQty: 1,
        roundingMode: "none",
        status: "active",
      });
    }

    // If a specific plan exists, attach order overage rule to it as well
    if (plans.length) {
      const starter = plans.find((p) => /starter/i.test(p.name));
      if (starter) {
        await Overage.create({
          quotaTypeCode: "orders",
          planIds: [starter._id],
          appliesToAllPlans: false,
          threshold: starter.quota?.orders || 100,
          unitPrice: 0.1,
          currency: "USD",
          billingStrategy: "pay_as_you_go",
          maxOverage: 0,
          minBillableQty: 1,
          roundingMode: "none",
          name: `Orders overage (${starter.name})`,
          status: "active",
        });
      }
    }

    console.log(`Seeded ${defaults.length + 1} overage rules.`);
    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error("Seeding failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
