const mongoose = require("mongoose");
require("dotenv").config();
const TrialRule = require("../models/TrialRule");
const TrialFactor = require("../models/TrialFactor");
const RuleCondition = require("../models/RuleCondition");
const RuleAction = require("../models/RuleAction");

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/saas";

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    const existing = await TrialRule.countDocuments({});
    if (existing > 0) {
      console.log(`Trial rules already seeded (${existing}). Skipping.`);
      await mongoose.disconnect();
      return;
    }

    // Build factor code -> id map
    const factors = await TrialFactor.find({});
    const factorByCode = Object.fromEntries(factors.map((f) => [f.code, f]));

    // Example per cahier des charges:
    //   TRIAL for 14 days OR orders>=100 OR products>=100 OR revenue>=500 OR api_calls>=1000
    const rule = await TrialRule.create({
      name: "Standard Trial (14 days OR usage thresholds)",
      description:
        "Ends trial when 14 days have passed OR store reaches 100 orders OR 100 products OR 500 revenue OR 1000 API calls.",
      appliesTo: "new_stores",
      priority: 10,
      status: "active",
      version: 1,
      rootGroup: {
        id: "root",
        logicOperator: "OR",
        children: [],
        conditionIds: [],
      },
    });

    const conditions = [
      { factorCode: "days", operator: "greaterThanOrEqual", value: 14 },
      { factorCode: "orders", operator: "greaterThanOrEqual", value: 100 },
      { factorCode: "products", operator: "greaterThanOrEqual", value: 100 },
      { factorCode: "revenue", operator: "greaterThanOrEqual", value: 500 },
      { factorCode: "api_calls", operator: "greaterThanOrEqual", value: 1000 },
    ];

    const conditionIds = [];
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      const factor = factorByCode[c.factorCode];
      const condition = await RuleCondition.create({
        ruleId: rule._id,
        groupId: new mongoose.Types.ObjectId(),
        factorId: factor?._id,
        factorCode: c.factorCode,
        operator: c.operator,
        value: c.value,
        order: i,
      });
      conditionIds.push(condition._id);
    }

    rule.rootGroup.conditionIds = conditionIds;
    rule.conditionIds = conditionIds;
    await rule.save();

    // Actions: end trial + notify + grace period 7 days
    await RuleAction.create({
      ruleId: rule._id,
      actionType: "end_trial",
      label: "End the trial",
      config: {},
      order: 0,
    });
    await RuleAction.create({
      ruleId: rule._id,
      actionType: "notify",
      label: "Notify store owner",
      config: { notificationChannel: "email", notificationTemplate: "trial_ended" },
      order: 1,
    });
    await RuleAction.create({
      ruleId: rule._id,
      actionType: "grace_period",
      label: "7-day grace period",
      config: { graceDays: 7 },
      order: 2,
    });

    const count = await TrialRule.countDocuments({});
    console.log(`Seeded trial rules. Total: ${count}`);
    console.log("Rule:", rule.name);
    console.log("  - conditions:", conditions.length);
    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error("Seeding failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
