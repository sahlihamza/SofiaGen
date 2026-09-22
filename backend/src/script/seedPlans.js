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

const seedPlans = async () => {
  const { connectDB } = require("../config/db");
  const Plan = require("../models/Plan");
  await connectDB();

  try {
    for (const seed of planSeeds) {
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
      } else {
        await Plan.create(seed);
      }
    }
    console.log(`Seeded ${planSeeds.length} plans`);
  } catch (error) {
    console.error("Failed to seed plans", error);
    throw error;
  }
};

module.exports = { planSeeds, seedPlans };

if (require.main === module) {
  (async () => {
    try {
      await seedPlans();
      process.exit(0);
    } catch (error) {
      console.error("Failed to seed plans", error);
      process.exit(1);
    }
  })();
}