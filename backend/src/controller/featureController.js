const Feature = require("../models/Feature");
const FeatureCategory = require("../models/FeatureCategory");
const Plan = require("../models/Plan");

const getFeatures = async (req, res) => {
  try {
    const { category, status, search = "" } = req.query;
    const query = {};
    if (category) query.categoryId = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }
    const features = await Feature.find(query)
      .populate("categoryId", "name slug")
      .populate("featureGroupId", "name slug code")
      .sort({ code: 1 });
    res.status(200).json({ success: true, data: features });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFeatureById = async (req, res) => {
  try {
    const feature = await Feature.findById(req.params.id)
      .populate("categoryId", "name slug")
      .populate("featureGroupId", "name slug code");
    if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });
    res.status(200).json({ success: true, data: feature });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createFeature = async (req, res) => {
  try {
    const { code, name, categoryId, featureGroupId, description, icon, status } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: "Code and name are required" });
    const existing = await Feature.findOne({ code: code.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: "Feature code already exists" });
    const feature = new Feature({ code: code.toLowerCase(), name, categoryId, featureGroupId, description, icon, status });
    await feature.save();
    res.status(201).json({ success: true, message: "Feature created", data: feature });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateFeature = async (req, res) => {
  try {
    const feature = await Feature.findById(req.params.id);
    if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });
    const { name, categoryId, featureGroupId, description, icon, status } = req.body;
    if (name) feature.name = name;
    if (categoryId !== undefined) feature.categoryId = categoryId;
    if (featureGroupId !== undefined) feature.featureGroupId = featureGroupId;
    if (description !== undefined) feature.description = description;
    if (icon !== undefined) feature.icon = icon;
    if (status) feature.status = status;
    await feature.save();
    res.status(200).json({ success: true, message: "Feature updated", data: feature });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteFeature = async (req, res) => {
  try {
    const feature = await Feature.findById(req.params.id);
    if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });

    const usedByPlans = await Plan.countDocuments({ [`features.${feature.code}`]: { $exists: true } });
    if (usedByPlans > 0) {
      return res.status(400).json({
        success: false,
        message: `Feature cannot be deleted because it is referenced by ${usedByPlans} plan(s)`,
      });
    }

    await Feature.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Feature deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFeatureCategories = async (req, res) => {
  try {
    const categories = await FeatureCategory.find().sort({ order: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createFeatureCategory = async (req, res) => {
  try {
    const { name, slug, order } = req.body;
    const category = new FeatureCategory({ name, slug: slug?.toLowerCase() || name.toLowerCase(), order });
    await category.save();
    res.status(201).json({ success: true, message: "Category created", data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Fin des méthodes existantes

const triggerFeatureCleanup = async (req, res) => {
  try {
    const { cleanupExpiredFeatures } = require("../jobs/featureCleanup");
    const result = await cleanupExpiredFeatures();

    res.status(200).json({
      success: true,
      message: "Feature cleanup executed successfully",
      data: {
        updated: result.updated,
        notifications: result.notifications,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getFeatures, getFeatureById, createFeature, updateFeature, deleteFeature,
  getFeatureCategories, createFeatureCategory,
  triggerFeatureCleanup,
};