const TrialFactor = require("../models/TrialFactor");

const getTrialFactors = async (req, res) => {
  try {
    const { category, status = "", search = "", sort = "category" } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const sortObject = {};
    sort.split(",").forEach((s) => {
      const field = s.replace(/^-/, "");
      sortObject[field] = s.startsWith("-") ? -1 : 1;
    });

    const factors = await TrialFactor.find(query).sort(sortObject);
    res.status(200).json({ success: true, data: factors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrialFactorCategories = async (req, res) => {
  try {
    const categories = [
      { code: "time", name: "Time", label: "Temps" },
      { code: "catalog", name: "Catalogue", label: "Catalogue" },
      { code: "business", name: "Business", label: "Business" },
      { code: "api", name: "API", label: "API" },
      { code: "storage", name: "Storage", label: "Stockage" },
      { code: "marketing", name: "Marketing", label: "Marketing" },
      { code: "ai", name: "AI", label: "AI" },
    ];
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrialFactorById = async (req, res) => {
  try {
    const factor = await TrialFactor.findById(req.params.id);
    if (!factor) return res.status(404).json({ success: false, message: "Trial factor not found" });
    res.status(200).json({ success: true, data: factor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTrialFactor = async (req, res) => {
  try {
    const { code, name, category, unit, description, icon, operators, isTimeFactor, status } = req.body;
    if (!code || !name || !category) {
      return res.status(400).json({ success: false, message: "code, name and category are required" });
    }
    const existing = await TrialFactor.findOne({ code: code.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: "Trial factor code already exists" });

    const factor = new TrialFactor({
      code: code.toLowerCase(),
      name: name.trim(),
      category,
      unit: unit || "number",
      description,
      icon,
      operators: operators || ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"],
      isTimeFactor: Boolean(isTimeFactor) || category === "time",
      status: status || "active",
      createdBy: req.user?._id,
    });
    await factor.save();
    res.status(201).json({ success: true, message: "Trial factor created", data: factor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTrialFactor = async (req, res) => {
  try {
    const factor = await TrialFactor.findById(req.params.id);
    if (!factor) return res.status(404).json({ success: false, message: "Trial factor not found" });

    const { name, category, unit, description, icon, operators, isTimeFactor, status } = req.body;
    if (name) factor.name = name.trim();
    if (category) factor.category = category;
    if (unit) factor.unit = unit;
    if (description !== undefined) factor.description = description;
    if (icon !== undefined) factor.icon = icon;
    if (operators) factor.operators = operators;
    if (isTimeFactor !== undefined) factor.isTimeFactor = Boolean(isTimeFactor);
    if (status) factor.status = status;
    factor.updatedBy = req.user?._id;

    await factor.save();
    res.status(200).json({ success: true, message: "Trial factor updated", data: factor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTrialFactor = async (req, res) => {
  try {
    const factor = await TrialFactor.findById(req.params.id);
    if (!factor) return res.status(404).json({ success: false, message: "Trial factor not found" });

    const RuleCondition = require("../models/RuleCondition");
    const used = await RuleCondition.countDocuments({ factorId: factor._id });
    if (used > 0) {
      return res.status(400).json({
        success: false,
        message: `Trial factor cannot be deleted because it is used by ${used} condition(s)`,
      });
    }

    await TrialFactor.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Trial factor deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getTrialFactors,
  getTrialFactorCategories,
  getTrialFactorById,
  createTrialFactor,
  updateTrialFactor,
  deleteTrialFactor,
};
