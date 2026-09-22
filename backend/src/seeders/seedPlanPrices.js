/**
 * Seeder  Plan Prices (PlanPrice collection)
 *
 * Seeds multi-currency & multi-cycle prices for existing plans.
 * Run: npm run seed:plan-prices
 */
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanPrice = require("../models/PlanPrice");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const CURRENCIES = ["USD", "EUR", "GBP", "TND"];

// Cycle multipliers relative to monthly price
const CYCLE_MULTIPLIERS = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  yearly: 12,
};

const seedPlanPrices = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await PlanPrice.deleteMany({});
    console.log("Cleared existing plan prices");

    const plans = await Plan.find({});
    if (plans.length === 0) {
      console.log("No plans found. Please seed plans first.");
      await mongoose.disconnect();
      return;
    }

    const prices = [];
    for (const plan of plans) {
      const baseMonthly =
        plan.pricing?.monthly || plan.pricingHistory?.[0]?.monthly || 0;

      for (const currency of CURRENCIES) {
        // Currency conversion factor (relative to plan base currency)
        const planCurrency = plan.pricing?.currency || "USD";
        const factor = getCurrencyFactor(planCurrency, currency);

        for (const [cycle, multiplier] of Object.entries(CYCLE_MULTIPLIERS)) {
          const priceValue = round2(baseMonthly * multiplier * factor);
          prices.push({
            planId: plan._id,
            priceVersion: 1,
            currency,
            cycle,
            cycleLabel: cycleLabelMap(cycle),
            cycleDurationDays: cycleDaysMap(cycle),
            price: priceValue,
            setupFee: cycle === "monthly" ? round2(baseMonthly * 0.1 * factor) : 0,
            taxIncluded: false,
            taxRate: 0,
            tiered: { enabled: false, tiers: [] },
            effectiveFrom: new Date(),
            effectiveTo: null,
            status: "active",
            isDefault: currency === "USD" && cycle === "monthly",
            notes: `Seeded ${currency} ${cycle} price`,
          });
        }
      }
    }

    if (prices.length > 0) {
      await PlanPrice.insertMany(prices);
      console.log(`Created ${prices.length} plan prices`);
    }

    console.log("\n=== Plan Prices Seed Summary ===");
    console.log(`Plans: ${plans.length}`);
    console.log(`Plan Prices: ${prices.length}`);
    console.log("\nDone!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding plan prices:", err);
    process.exit(1);
  }
};

function round2(value) {
  return Math.round(value * 100) / 100;
}

function cycleLabelMap(cycle) {
  const labels = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    semi_annual: "Semi-Annual",
    yearly: "Yearly",
  };
  return labels[cycle] || cycle;
}

function cycleDaysMap(cycle) {
  const days = {
    monthly: 30,
    quarterly: 90,
    semi_annual: 180,
    yearly: 365,
  };
  return days[cycle] || 30;
}

function getCurrencyFactor(from, to) {
  // Simplified conversion factors (relative to USD)
  const RATES = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    TND: 3.1,
  };
  if (RATES[to] === undefined) return 1;
  return RATES[to] / RATES[from];
}

seedPlanPrices();
