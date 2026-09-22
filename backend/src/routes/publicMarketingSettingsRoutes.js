const express = require("express");
const Store = require("../models/Store");
const marketingSettingsService = require("../service/marketingSettingsService");

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

const resolveActiveStore = async () =>
  (await Store.findOne({ isSelected: true })) || (await Store.findOne({ isActive: true }));

router.get("/marketing", async (req, res) => {
  const cached = getCached("marketing-public");
  if (cached) return res.json(cached);

  try {
    const store = await resolveActiveStore();
    if (!store) {
      return res.status(404).json({ message: "Aucune boutique active" });
    }
    const projection = await marketingSettingsService.getPublicForStore(store._id);
    const payload = setCached("marketing-public", projection || { meta: {}, google: {}, sitemap: {} });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Marketing public indisponible" });
  }
});

module.exports = router;