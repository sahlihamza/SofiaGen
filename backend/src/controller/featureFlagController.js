const FeatureFlag = require("../models/FeatureFlag");

/**
 * Feature Flag Controller
 * 
 * Les Features définissent ce qui est inclus dans un plan.
 * Les Feature Flags permettent d'activer ou désactiver une fonctionnalité sans modifier le plan.
 * 
 * Exemple:
 * Le plan Starter posséde Builder.
 * Mais Builder V2 est encore en bâta.
 * On active Builder V2 uniquement pour 5 boutiques.
 */

// Get all feature flags with pagination
const getAllFeatureFlags = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", type, enabled } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (type) query.type = type;
    if (enabled !== undefined) query.enabled = enabled === "true";

    const skip = (page - 1) * limit;
    const total = await FeatureFlag.countDocuments(query);

    const flags = await FeatureFlag.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: flags,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get feature flag by code
const getFeatureFlagByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const flag = await FeatureFlag.findOne({ code: code.toLowerCase() });

    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found" });
    }

    res.status(200).json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create feature flag
const createFeatureFlag = async (req, res) => {
  try {
    const { code, name, description, type, enabled, enabledForPlans, enabledForStores, rolloutPercentage, startDate, endDate } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: "Code and name are required" });
    }

    const existing = await FeatureFlag.findOne({ code: code.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Feature flag code already exists" });
    }

    const flag = new FeatureFlag({
      code: code.toLowerCase(),
      name,
      description,
      type,
      enabled,
      enabledForPlans: enabledForPlans || [],
      enabledForStores: enabledForStores || [],
      rolloutPercentage: rolloutPercentage || 0,
      startDate,
      endDate,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await flag.save();

    res.status(201).json({
      success: true,
      message: "Feature flag created successfully",
      data: flag,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update feature flag
const updateFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, enabled, enabledForPlans, enabledForStores, rolloutPercentage, startDate, endDate } = req.body;

    const flag = await FeatureFlag.findById(id);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found" });
    }

    if (name) flag.name = name;
    if (description !== undefined) flag.description = description;
    if (type) flag.type = type;
    if (enabled !== undefined) flag.enabled = enabled;
    if (enabledForPlans) flag.enabledForPlans = enabledForPlans;
    if (enabledForStores) flag.enabledForStores = enabledForStores;
    if (rolloutPercentage !== undefined) flag.rolloutPercentage = rolloutPercentage;
    if (startDate) flag.startDate = startDate;
    if (endDate !== undefined) flag.endDate = endDate;

    flag.updatedBy = req.user?._id;
    await flag.save();

    res.status(200).json({
      success: true,
      message: "Feature flag updated successfully",
      data: flag,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle feature flag for a store
const toggleFeatureFlagForStore = async (req, res) => {
  try {
    const { flagId, storeId } = req.params;
    const { enable } = req.body;

    if (enable === undefined) {
      return res.status(400).json({ success: false, message: "enable parameter is required" });
    }

    const flag = await FeatureFlag.findById(flagId);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found" });
    }

    const storeIndex = flag.enabledForStores.findIndex(id => id.toString() === storeId);

    if (enable && storeIndex === -1) {
      flag.enabledForStores.push(storeId);
    } else if (!enable && storeIndex > -1) {
      flag.enabledForStores.splice(storeIndex, 1);
    }

    flag.updatedBy = req.user?._id;
    await flag.save();

    res.status(200).json({
      success: true,
      message: `Feature flag ${enable ? 'enabled' : 'disabled'} for store`,
      data: flag,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete feature flag
const deleteFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;

    const flag = await FeatureFlag.findById(id);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found" });
    }

    await FeatureFlag.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Feature flag deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get feature flags for a specific plan
const getFeatureFlagsForPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const flags = await FeatureFlag.find({
      $or: [
        { enabled: true },
        { enabledForPlans: planId },
      ],
    });

    res.status(200).json({
      success: true,
      data: flags,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get available features for a store
const getAvailableFeatures = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await require("../models/Store").findById(storeId);

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Récupérer les flags du plan + les flags activés pour cette boutique
    const flags = await FeatureFlag.find({
      $or: [
        { enabled: true },
        { enabledForStores: storeId },
        { enabledForPlans: store.planId },
      ],
    });

    res.status(200).json({
      success: true,
      data: flags,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllFeatureFlags,
  getFeatureFlagByCode,
  createFeatureFlag,
  updateFeatureFlag,
  toggleFeatureFlagForStore,
  deleteFeatureFlag,
  getFeatureFlagsForPlan,
  getAvailableFeatures,
};
