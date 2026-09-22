const FeatureGroup = require("../models/FeatureGroup");
const Feature = require("../models/Feature");
const PlanFeature = require("../models/PlanFeature");

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getFeatureGroups = async (req, res) => {
  try {
    const { search = "", status = "", sort = "displayOrder" } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortObject = {};
    if (typeof sort === "string") {
      if (sort.startsWith("-")) sortObject[sort.slice(1)] = -1;
      else if (sort.startsWith("+")) sortObject[sort.slice(1)] = 1;
      else sortObject[sort] = 1;
    }

    const groups = await FeatureGroup.find(query).sort(sortObject);

    // Enrich with live feature counts
    const enriched = await Promise.all(
      groups.map(async (group) => {
        const count = await Feature.countDocuments({ featureGroupId: group._id });
        return { ...group.toObject(), featureCount: count };
      })
    );

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFeatureGroupById = async (req, res) => {
  try {
    const group = await FeatureGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Feature group not found" });

    const features = await Feature.find({ featureGroupId: group._id })
      .populate("categoryId", "name slug")
      .sort({ code: 1 });
    const planFeaturesCount = await PlanFeature.countDocuments({
      featureGroupId: group._id,
    });

    res.status(200).json({
      success: true,
      data: {
        ...group.toObject(),
        features,
        planFeaturesCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createFeatureGroup = async (req, res) => {
  try {
    const { code, name, slug, icon, description, color, displayOrder, status } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: "Code and name are required" });
    }

    const existingCode = await FeatureGroup.findOne({ code: code.toLowerCase() });
    if (existingCode) {
      return res.status(400).json({ success: false, message: "Feature group code already exists" });
    }

    const existingSlug = await FeatureGroup.findOne({
      slug: slug?.toLowerCase() || slugify(name),
    });
    if (existingSlug) {
      return res.status(400).json({ success: false, message: "Feature group slug already exists" });
    }

    const group = new FeatureGroup({
      code: code.toLowerCase(),
      name: name.trim(),
      slug: slug?.toLowerCase() || slugify(name),
      icon,
      description,
      color: color || "#3B82F6",
      displayOrder: displayOrder || 0,
      status: status || "active",
      createdBy: req.user?._id,
    });
    await group.save();

    res.status(201).json({ success: true, message: "Feature group created", data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateFeatureGroup = async (req, res) => {
  try {
    const group = await FeatureGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Feature group not found" });

    const { name, slug, icon, description, color, displayOrder, status } = req.body;

    if (name) group.name = name.trim();
    if (slug && slug.toLowerCase() !== group.slug) {
      const existing = await FeatureGroup.findOne({ slug: slug.toLowerCase(), _id: { $ne: group._id } });
      if (existing) return res.status(400).json({ success: false, message: "Feature group slug already exists" });
      group.slug = slug.toLowerCase();
    }
    if (icon !== undefined) group.icon = icon;
    if (description !== undefined) group.description = description;
    if (color) group.color = color;
    if (displayOrder !== undefined) group.displayOrder = displayOrder;
    if (status) group.status = status;
    group.updatedBy = req.user?._id;

    await group.save();
    res.status(200).json({ success: true, message: "Feature group updated", data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteFeatureGroup = async (req, res) => {
  try {
    const group = await FeatureGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Feature group not found" });

    const featuresUsing = await Feature.countDocuments({ featureGroupId: group._id });
    if (featuresUsing > 0) {
      return res.status(400).json({
        success: false,
        message: `Feature group cannot be deleted because it is used by ${featuresUsing} feature(s)`,
      });
    }

    await FeatureGroup.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Feature group deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getFeatureGroups,
  getFeatureGroupById,
  createFeatureGroup,
  updateFeatureGroup,
  deleteFeatureGroup,
};
