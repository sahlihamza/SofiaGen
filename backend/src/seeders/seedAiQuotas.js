const mongoose = require("mongoose");
const QuotaType = require("../models/QuotaType");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

// The three QuotaType rows consumed by service/ai/aiQuotaService.js
// (ai_messages_daily, ai_messages_monthly, ai_tokens_monthly). They MUST exist
// for aiQuotaService.assertAndConsume() to behave as documented  without
// these rows, quota check silently no-ops and every store can send unlimited
// messages to the LLM, which is exactly what the original Malla ticket wanted
// to prevent via per-plan quotas.
const AI_QUOTA_TYPES = [
  {
    code: "ai_messages_daily",
    name: "AI Assistant Messages (daily)",
    unit: "number",
    minValue: 0,
    maxValue: 100000,
    defaultValue: 200,
    allowUnlimited: true,
  },
  {
    code: "ai_messages_monthly",
    name: "AI Assistant Messages (monthly)",
    unit: "number",
    minValue: 0,
    maxValue: 1000000,
    defaultValue: 5000,
    allowUnlimited: true,
  },
  {
    code: "ai_tokens_monthly",
    name: "AI Assistant Tokens (monthly, in+out)",
    unit: "number",
    minValue: 0,
    maxValue: 100000000,
    defaultValue: 500000,
    allowUnlimited: true,
  },
];

const upsert = async () => {
  for (const qt of AI_QUOTA_TYPES) {
    // Upsert by the unique `code` index. We don't touch other quota rows 
    // this script is meant to be runnable multiple times alongside the
    // existing seedUsageQuotas without wiping anyone's data.
    // eslint-disable-next-line no-await-in-loop
    await QuotaType.updateOne(
      { code: qt.code },
      { $setOnInsert: qt },
      { upsert: true }
    );
  }
};

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("Connected to MongoDB");
      await upsert();
      const all = await QuotaType.find({ code: { $in: AI_QUOTA_TYPES.map((q) => q.code) } })
        .select("code name defaultValue allowUnlimited")
        .lean();
      console.log("AI QuotaTypes now in DB:");
      console.table(all);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("seedAiQuotas failed:", err);
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
      process.exit(1);
    }
  })();
}

module.exports = upsert;
module.exports.AI_QUOTA_TYPES = AI_QUOTA_TYPES;