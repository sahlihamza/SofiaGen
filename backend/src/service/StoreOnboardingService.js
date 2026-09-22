const Product = require("../models/Product");
const ShippingZone = require("../models/ShippingZone");
const PaymentSettings = require("../models/PaymentSettings");
const Theme = require("../models/Theme");

// SO-17  onboarding checklist post-store-creation. Every step is derived
// live from real data (a product exists, a shipping zone exists, a payment
// method is enabled, a theme is active) rather than a separate "onboarding
// progress" flag a store owner could get out of sync by editing things
// directly  the checklist can never lie about the store's actual state.
const STEPS = [
  { id: "firstProduct", check: async (storeId) => (await Product.countDocuments({ storeId })) > 0 },
  { id: "shipping", check: async (storeId) => (await ShippingZone.countDocuments({ storeId })) > 0 },
  { id: "paymentMethod", check: async (storeId) => !!(await PaymentSettings.findOne({ storeId, "methods.enabled": true })) },
  { id: "theme", check: async (storeId) => (await Theme.countDocuments({ storeId, isActive: true })) > 0 },
];

const getOnboardingStatus = async (storeId) => {
  if (!storeId) {
    return { steps: STEPS.map((s) => ({ id: s.id, done: false })), completed: 0, total: STEPS.length, progress: 0 };
  }

  const results = await Promise.all(STEPS.map((s) => s.check(storeId)));
  const steps = STEPS.map((s, i) => ({ id: s.id, done: results[i] }));
  const completed = results.filter(Boolean).length;

  return {
    steps,
    completed,
    total: STEPS.length,
    progress: Math.round((completed / STEPS.length) * 100),
  };
};

module.exports = { getOnboardingStatus };
