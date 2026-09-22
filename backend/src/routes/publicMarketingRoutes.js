const express = require("express");
const Plan = require("../models/Plan");
const PlanPrice = require("../models/PlanPrice");
const Store = require("../models/Store");
const Order = require("../models/Order");
const PlatformSettings = require("../models/PlatformSettings");

const router = express.Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
};

router.get("/stats", async (req, res) => {
  const cached = getCached("stats");
  if (cached) return res.json(cached);

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [activeStores, ordersLast30Days] = await Promise.all([
      Store.countDocuments({ status: "active" }),
      Order.countDocuments({ createdAt: { $gte: since } }),
    ]);

    return res.json(setCached("stats", {
      activeStores,
      ordersLast30Days,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    return res.status(500).json({ message: "Public statistics unavailable" });
  }
});

router.get("/contact", async (req, res) => {
  const cached = getCached("contact");
  if (cached) return res.json(cached);

  try {
    const settings = await PlatformSettings.findOne().select("whatsappNumber logo favicon platformName").lean();
    return res.json(setCached("contact", {
      whatsappNumber: settings?.whatsappNumber || "",
      logo: settings?.logo || "",
      favicon: settings?.favicon || "",
      platformName: settings?.platformName || "Sofiagen",
    }));
  } catch (error) {
    return res.status(500).json({ message: "Public contact unavailable" });
  }
});

router.get("/plans", async (req, res) => {
  const cached = getCached("plans");
  if (cached) return res.json(cached);

  try {
    const plans = await Plan.find({
      status: "active",
      visibility: "public",
      deletedAt: null,
    })
      .select("name slug description badge features limits pricing trialDays")
      .sort({ "pricing.monthly": 1 })
      .lean();

    const planIds = plans.map((plan) => plan._id);
    const prices = await PlanPrice.find({
      planId: { $in: planIds },
      status: "active",
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    })
      .select("planId currency cycle price setupFee taxIncluded isDefault")
      .sort({ isDefault: -1, currency: 1, cycle: 1 })
      .lean();

    const payload = plans.map((plan) => ({
      id: String(plan._id),
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      badge: plan.badge || null,
      features: plan.features || {},
      limits: plan.limits || {},
      trialDays: plan.pricing?.trialDays ?? plan.trialDays ?? 0,
      prices: prices
        .filter((price) => String(price.planId) === String(plan._id))
        .map((price) => ({
          currency: price.currency,
          cycle: price.cycle,
          price: price.price,
          setupFee: price.setupFee || 0,
          taxIncluded: Boolean(price.taxIncluded),
          isDefault: Boolean(price.isDefault),
        })),
    }));

    return res.json(setCached("plans", payload));
  } catch (error) {
    return res.status(500).json({ message: "Public plans unavailable" });
  }
});

module.exports = router;