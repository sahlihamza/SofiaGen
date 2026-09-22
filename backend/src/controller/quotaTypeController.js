const QuotaType = require("../models/QuotaType");
const Plan = require("../models/Plan");

const getQuotaTypes = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }
    const quotaTypes = await QuotaType.find(query).sort({ code: 1 });
    res.status(200).json({ success: true, data: quotaTypes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getQuotaTypeById = async (req, res) => {
  try {
    const quotaType = await QuotaType.findById(req.params.id);
    if (!quotaType) return res.status(404).json({ success: false, message: "Quota type not found" });
    res.status(200).json({ success: true, data: quotaType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createQuotaType = async (req, res) => {
  try {
    const { code, name, unit, minValue, maxValue, defaultValue, allowUnlimited } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: "Code and name are required" });
    const existing = await QuotaType.findOne({ code: code.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: "Quota type code already exists" });
    const quotaType = new QuotaType({ code: code.toLowerCase(), name, unit, minValue, maxValue, defaultValue, allowUnlimited });
    await quotaType.save();
    res.status(201).json({ success: true, message: "Quota type created", data: quotaType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateQuotaType = async (req, res) => {
  try {
    const quotaType = await QuotaType.findById(req.params.id);
    if (!quotaType) return res.status(404).json({ success: false, message: "Quota type not found" });
    const { name, unit, minValue, maxValue, defaultValue, allowUnlimited } = req.body;
    if (name) quotaType.name = name;
    if (unit) quotaType.unit = unit;
    if (minValue !== undefined) quotaType.minValue = minValue;
    if (maxValue !== undefined) quotaType.maxValue = maxValue;
    if (defaultValue !== undefined) quotaType.defaultValue = defaultValue;
    if (allowUnlimited !== undefined) quotaType.allowUnlimited = allowUnlimited;
    await quotaType.save();
    res.status(200).json({ success: true, message: "Quota type updated", data: quotaType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteQuotaType = async (req, res) => {
  try {
    const quotaType = await QuotaType.findById(req.params.id);
    if (!quotaType) return res.status(404).json({ success: false, message: "Quota type not found" });

    const plansUsingQuota = await Plan.countDocuments({ [`limits.${quotaType.code}`]: { $exists: true } });
    if (plansUsingQuota > 0) {
      return res.status(400).json({
        success: false,
        message: `Quota type cannot be deleted because it is referenced by ${plansUsingQuota} plan(s)`,
      });
    }

    await QuotaType.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Quota type deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getQuotaTypes, getQuotaTypeById, createQuotaType, updateQuotaType, deleteQuotaType,
};