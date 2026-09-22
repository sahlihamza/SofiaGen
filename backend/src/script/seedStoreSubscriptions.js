const dayjs = require("dayjs");
const { connectDB } = require("../config/db");

const Plan = require("../models/Plan");
const Store = require("../models/Store");
const GeneralSettings = require("../models/GeneralSettings");
const Currency = require("../models/Currency");
const Subscription = require("../models/Subscription");
const logger = require("../config/logger");

const planSeeds = [
  {
    name: "Seed Starter",
    slug: "seed-starter",
    description: "Starter plan used for local subscription demos",
    pricing: { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false, trialDays: 14 },
    features: new Map([
      ["multi_store", false],
      ["priority_support", false],
    ]),
    limits: new Map([
      ["products", 25],
      ["storage_mb", 200],
      ["team_members", 1],
    ]),
    status: "active",
    isDefault: true,
  },
  {
    name: "Seed Growth",
    slug: "seed-growth",
    description: "Growth plan used for local subscription demos",
    pricing: { monthly: 29, yearly: 290, currency: "USD", taxIncluded: false, trialDays: 7 },
    features: new Map([
      ["multi_store", true],
      ["priority_support", true],
      ["custom_branding", true],
    ]),
    limits: new Map([
      ["products", 1000],
      ["storage_mb", 10240],
      ["team_members", 10],
    ]),
    status: "active",
  },
];

const storeSeeds = [
  {
    name: "Seed Store Alpha",
    slug: "seed-store-alpha",
    currency: "USD",
    status: "active",
    isSelected: true,
    subscriptionStatus: "trial",
    billingCycle: "monthly",
    planSlug: "seed-starter",
  },
  {
    name: "Seed Store Beta",
    slug: "seed-store-beta",
    currency: "USD",
    status: "active",
    isSelected: false,
    subscriptionStatus: "active",
    billingCycle: "yearly",
    planSlug: "seed-growth",
  },
  {
    name: "Seed Store Gamma",
    slug: "seed-store-gamma",
    currency: "USD",
    status: "active",
    isSelected: false,
    subscriptionStatus: "past_due",
    billingCycle: "monthly",
    planSlug: "seed-growth",
  },
];

const ensurePlan = async (seed) => {
  const existing = await Plan.findOne({ slug: seed.slug });
  if (existing) {
    existing.set({
      name: seed.name,
      description: seed.description,
      pricing: seed.pricing,
      features: seed.features,
      limits: seed.limits,
      status: seed.status,
      isDefault: seed.isDefault,
    });
    await existing.save();
    return existing;
  }

  return Plan.create(seed);
};

const ensureStore = async (seed) => {
  const existing = await Store.findOne({ slug: seed.slug });
  if (existing) {
    existing.set({
      name: seed.name,
      status: seed.status,
      isSelected: seed.isSelected,
      billingCycle: seed.billingCycle,
      subscriptionStatus: seed.subscriptionStatus,
    });
    await existing.save();
    return existing;
  }

  return Store.create({
    name: seed.name,
    slug: seed.slug,
    status: seed.status,
    isSelected: seed.isSelected,
    billingCycle: seed.billingCycle,
    subscriptionStatus: seed.subscriptionStatus,
  });
};

const seedStoreSubscriptions = async () => {
  await connectDB();

  try {
    const plans = await Promise.all(planSeeds.map(ensurePlan));
    const createdStores = await Promise.all(storeSeeds.map(ensureStore));

    for (const store of createdStores) {
      const matchingSeed = storeSeeds.find((entry) => entry.slug === store.slug);
      const plan = plans.find((entry) => entry.slug === matchingSeed.planSlug);
      if (!plan) continue;

      const currencyDoc = await Currency.findOne({ isoCode: (matchingSeed.currency || "USD").toUpperCase() }).lean();
      if (currencyDoc) {
        await GeneralSettings.findOneAndUpdate(
          { storeId: store._id },
          { currencyId: currencyDoc._id },
          { upsert: true }
        );
      }

      let subscription = await Subscription.findOne({ storeId: store._id });
      const status = matchingSeed.subscriptionStatus || "active";
      const billingCycle = matchingSeed.billingCycle || "monthly";
      const priceSnapshot = {
        monthly: plan.pricing?.monthly,
        yearly: plan.pricing?.yearly,
        currency: plan.pricing?.currency,
        taxIncluded: plan.pricing?.taxIncluded,
      };

      const effectiveStart = new Date();
      const trialEndsAt = status === "trial" ? dayjs(effectiveStart).add(7, "day").toDate() : undefined;
      const currentPeriodEnd = billingCycle === "yearly"
        ? dayjs(effectiveStart).add(1, "year").toDate()
        : dayjs(effectiveStart).add(1, "month").toDate();

      if (!subscription) {
        subscription = new Subscription({
          storeId: store._id,
          planId: plan._id,
          currentPlanName: plan.name,
          status,
          billingCycle,
          priceSnapshot,
          trialEndsAt,
          currentPeriodEnd,
          nextBillingDate: currentPeriodEnd,
          isAutoRenew: status !== "past_due",
          quotaUsage: new Map([
            ["products", 15],
            ["storage_mb", 250],
            ["team_members", 2],
          ]),
          events: [
            { type: "created", message: "Seeded subscription" },
            { type: status === "trial" ? "trial_started" : "activated", message: "Initial seed status" },
          ],
        });
      } else {
        subscription.planId = plan._id;
        subscription.currentPlanName = plan.name;
        subscription.status = status;
        subscription.billingCycle = billingCycle;
        subscription.priceSnapshot = priceSnapshot;
        subscription.trialEndsAt = trialEndsAt;
        subscription.currentPeriodEnd = currentPeriodEnd;
        subscription.nextBillingDate = currentPeriodEnd;
        subscription.isAutoRenew = status !== "past_due";
        subscription.quotaUsage = new Map([
          ["products", 15],
          ["storage_mb", 250],
          ["team_members", 2],
        ]);
      }

      await subscription.save();

      store.planId = plan._id;
      store.planName = plan.name;
      store.billingCycle = billingCycle;
      store.subscriptionStatus = subscription.status;
      store.currentSubscriptionId = subscription._id;
      store.trialEndsAt = trialEndsAt;
      store.currentPeriodEnd = currentPeriodEnd;
      store.nextBillingDate = currentPeriodEnd;
      await store.save();
    }

    logger.info("Store subscription seed data inserted successfully");
  } catch (error) {
    logger.error("Error inserting store subscription seed data", error);
    throw error;
  }
};

module.exports = { planSeeds, storeSeeds, seedStoreSubscriptions };

if (require.main === module) {
  (async () => {
    try {
      await seedStoreSubscriptions();
      process.exit(0);
    } catch (error) {
      logger.error("Error inserting store subscription seed data", error);
      process.exit(1);
    }
  })();
}