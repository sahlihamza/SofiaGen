const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanQuota = require("../models/PlanQuota");
const Store = require("../models/Store");
const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");
const SoftLimitService = require("../service/SoftLimitService");

require("dotenv").config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

/**
 * P17  Soft Limits seeder
 *
 * This seeder:
 *   1. Seeds PlanQuota documents with soft-limit thresholds per plan/quota-type.
 *   2. Creates demo stores (one per soft-limit state) with StoreUsage values
 *      that exercise every state: ok / warning / critical / blocked.
 *   3. Runs SoftLimitService.evaluateAllStores() to compute & persist states.
 *
 * NOTE: Explicit per-plan quota limits are used here because the two existing
 * plan seeders store limits under non-matching keys:
 *   - seedPlans.js    `limits` Map with keys like `maxProducts`, `maxOrders`
 *   - seedStore.js    `quotas` plain object (stripped by Mongoose strict mode)
 * So `plan.limits.get("products")` returns nothing  we define limits here
 * instead of relying on the plan document.
 */

// planSlug  { quotaTypeCode  limitValue }
// These are independent of how plans were seeded.
const PLAN_QUOTA_LIMITS = {
  starter:    { products: 50,    orders: 1000,  storage: 10,  staff: 2  },
  professional: { products: 200,   orders: 5000,  storage: 50,  staff: 5  },
  enterprise: { products: 1000,  orders: 20000, storage: 500, staff: 20 },
};

// Standard soft-limit thresholds (80/95/100%)
const STANDARD_THRESHOLDS = { warning: 80, critical: 95, blocked: 100 };
// Strict thresholds for enterprise plans (70/85/100%)
const STRICT_THRESHOLDS = { warning: 70, critical: 85, blocked: 100 };

/**
 * Demo stores  each exercises a specific soft-limit state:
 *   - "Store Healthy Co"      ok       (usage ~50%)
 *   - "Store Warning Edge"    warning  (usage exactly 80%, the boundary)
 *   - "Store Critical Now"    critical (usage ~97%)
 *   - "Store Over Quota"      blocked  (usage ~110%)
 */
const DEMO_STORES = [
  { name: "Store Healthy Co",    slug: "demo-healthy",   planSlug: "starter"      },
  { name: "Store Warning Edge",  slug: "demo-warning",   planSlug: "professional"   },
  { name: "Store Critical Now",  slug: "demo-critical",  planSlug: "professional"   },
  { name: "Store Over Quota",    slug: "demo-blocked",   planSlug: "enterprise"   },
];

const pct = (limit, percent) => Math.round((limit * percent) / 100);

/**
 * Build StoreUsage seed records targeting each soft-limit state.
 *
 * Returns a map keyed by `${storeName}`  array of { quotaTypeCode, used }.
 */
const buildDemoUsageMap = (planLimits) => {
  const byStore = {};

  // Healthy store: ~50% on every tracked quota  ok
  byStore["Store Healthy Co"] = [
    { code: "products",  used: pct(planLimits.starter.products, 50) },
    { code: "orders",    used: pct(planLimits.starter.orders, 50) },
    { code: "storage",   used: pct(planLimits.starter.storage, 50) },
  ];

  // Warning store: exactly 80% on products (boundary  warning), ok on orders
  byStore["Store Warning Edge"] = [
    { code: "products",  used: pct(planLimits.professional.products, 80) }, // exactly 80%
    { code: "orders",    used: pct(planLimits.professional.orders, 60) },
  ];

  // Critical store: 97% on storage (between 95% and 100%  critical)
  byStore["Store Critical Now"] = [
    { code: "products",  used: pct(planLimits.professional.products, 30) },
    { code: "storage",   used: pct(planLimits.professional.storage, 97) },
  ];

  // Blocked store: 110% on storage (over 100%  blocked)
  byStore["Store Over Quota"] = [
    { code: "products",  used: pct(planLimits.enterprise.products, 10) },
    { code: "storage",   used: Math.ceil(planLimits.enterprise.storage * 1.10) }, // 110%
  ];

  return byStore;
};

const seedSoftLimits = async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    const plans = await Plan.find({ status: "active" });
    if (plans.length === 0) {
      console.log("No active plans found. Please run `npm run seed:plans` first.");
      await mongoose.disconnect();
      return;
    }
    const planBySlug = {};
    plans.forEach((p) => { if (p.slug) planBySlug[p.slug] = p; });

    const quotaTypes = await QuotaType.find({});
    if (quotaTypes.length === 0) {
      console.log("No quota types found. Please run `npm run seed:quota-types` first.");
      await mongoose.disconnect();
      return;
    }
    const qtByCode = {};
    quotaTypes.forEach((q) => { qtByCode[q.code] = q; });

    console.log(`Found ${plans.length} plans, ${quotaTypes.length} quota types`);

    // --- 1. Seed PlanQuota documents with soft-limit thresholds ---
    await PlanQuota.deleteMany({});
    console.log("Cleared existing plan quotas");

    const quotasData = [];

    for (const plan of plans) {
      const limits = PLAN_QUOTA_LIMITS[plan.slug];
      const thresholds = plan.name.toLowerCase().includes("enterprise")
        ? STRICT_THRESHOLDS
        : STANDARD_THRESHOLDS;
      const blockedAction = plan.name.toLowerCase().includes("enterprise") ? "grace_period" : "block";

      for (const qt of quotaTypes) {
        const limitValue = limits && limits[qt.code] != null ? Number(limits[qt.code]) : null;
        const isUnlimited = limitValue === null || limitValue === 0;

        quotasData.push({
          planId: plan._id,
          quotaTypeId: qt._id,
          quotaTypeCode: qt.code,
          limitValue: isUnlimited ? null : limitValue,
          isUnlimited,
          warningThreshold: thresholds.warning,
          criticalThreshold: thresholds.critical,
          blockedThreshold: thresholds.blocked,
          blockedAction,
          softLimitEnabled: true,
        });
      }
    }

    await PlanQuota.insertMany(quotasData);
    console.log(`Seeded ${quotasData.length} plan quota records with soft limits`);

    // --- 2. Ensure demo stores exist (one per soft-limit state) ---
    const storeByName = {};
    for (const spec of DEMO_STORES) {
      const plan = planBySlug[spec.planSlug];
      if (!plan) {
        console.log(`  [skip] Demo store "${spec.name}"  plan "${spec.planSlug}" not found`);
        continue;
      }
      let store = await Store.findOne({ slug: spec.slug });
      if (!store) {
        store = new Store({
          name: spec.name,
          slug: spec.slug,
          subdomain: spec.slug,
          domain: `${spec.slug}.example.com`,
          status: "active",
          subscriptionStatus: "active",
          planId: plan._id,
          planName: plan.name,
          planSlug: plan.slug,
          billingCycle: "monthly",
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        });
        store = await store.save();
      } else {
        if (!store.planId) {
          store.planId = plan._id;
          store.planName = plan.name;
          await store.save();
        }
      }
      storeByName[spec.name] = store;
    }
    console.log(`Prepared ${Object.keys(storeByName).length} demo stores`);

    // --- 3. Upsert StoreUsage records with usage values per state ---
    const demoUsage = buildDemoUsageMap(PLAN_QUOTA_LIMITS);
    let usageCount = 0;
    for (const [storeName, entries] of Object.entries(demoUsage)) {
      const store = storeByName[storeName];
      if (!store) continue;
      for (const { code, used } of entries) {
        const qt = qtByCode[code];
        if (!qt) continue;
        await StoreUsage.findOneAndUpdate(
          { storeId: store._id, quotaTypeId: qt._id },
          { storeId: store._id, quotaTypeId: qt._id, used },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        usageCount++;
      }
    }
    console.log(`Upserted ${usageCount} demo store usage records (pre-evaluation)`);

    // --- 4. Run SoftLimitService to compute & persist softLimitState ---
    const results = await SoftLimitService.evaluateAllStores({});
    console.log(`Evaluated soft-limit states for ${results.length} store/quota pairs`);

    // --- 5. Print a human-readable summary of the resulting states ---
    console.log("\n=== Soft-Limit States After Evaluation ===");
    for (const r of results) {
      const pctStr = r.percentage === null ? "" : `${r.percentage}%`;
      console.log(
        `  [${r.state.toUpperCase().padEnd(8)}] ` +
        `${r.storeName || "store"} | ${r.quotaTypeCode || "quota"} | ` +
        `used: ${r.used} / ${r.limit ?? ""} (${pctStr}) | ` +
        `thresholds W/C/B: ${r.thresholds?.warning}/${r.thresholds?.critical}/${r.thresholds?.blocked}`
      );
    }

    const summary = await SoftLimitService.getSummary();
    console.log("\n=== Summary Counts ===");
    console.log(
      `Total: ${summary.total} | ` +
      `OK: ${summary.ok} | Warning: ${summary.warning} | ` +
      `Critical: ${summary.critical} | Blocked: ${summary.blocked}`
    );

    console.log("\nDone!");
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error seeding soft limits:", error);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
};

seedSoftLimits();