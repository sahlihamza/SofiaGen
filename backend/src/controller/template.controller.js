const Template = require("../models/Template.model");

exports.listTemplates = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { type } = req.query;
    const filterType = type || "page";

    const templates = await Template.find({
      $or: [{ storeId: null }, { storeId }],
      type: filterType,
    })
      .sort({ isSystem: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error("listTemplates error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const { storeId, templateId } = req.params;
    const template = await Template.findOne({
      _id: templateId,
      $or: [{ storeId: null }, { storeId }],
    }).lean();
    if (!template) {
      return res.status(404).json({ success: false, message: "Modèle introuvable" });
    }
    return res.json({ success: true, data: template });
  } catch (err) {
    console.error("getTemplateById error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, category, projectData, compiledHtml, compiledCss, type, popupSettings, isActive } = req.body;

    if (!name || !projectData) {
      return res.status(400).json({ success: false, message: "name et projectData sont requis" });
    }

    const template = await Template.create({
      storeId,
      name,
      category: category || "Autre",
      projectData,
      compiledHtml,
      compiledCss,
      type: type || "page",
      popupSettings,
      isActive: isActive || false,
      isSystem: false,
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({ success: true, data: template });
  } catch (err) {
    console.error("createTemplate error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { storeId, templateId } = req.params;
    const updates = req.body;

    // A store may only edit its own templates, never the shared system
    // ones (storeId: null)  those are edited by a super admin elsewhere.
    const updated = await Template.findOneAndUpdate(
      { _id: templateId, storeId },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Modèle introuvable" });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateTemplate error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { storeId, templateId } = req.params;
    const deleted = await Template.findOneAndDelete({ _id: templateId, storeId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Modèle introuvable ou non supprimable" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.duplicateTemplate = async (req, res) => {
  try {
    const { storeId, templateId } = req.params;
    const original = await Template.findOne({
      _id: templateId,
      $or: [{ storeId: null }, { storeId }],
    }).lean();
    if (!original) return res.status(404).json({ success: false, message: "Introuvable" });

    const copyData = {
      ...original,
      _id: undefined,
      id: undefined,
      name: `${original.name} (copie)`,
      storeId,
      favoritedBy: [],
      isSystem: false,
      createdBy: req.user?._id || null,
      createdAt: undefined,
      updatedAt: undefined,
    };

    const copy = await Template.create(copyData);
    return res.status(201).json({ success: true, data: copy });
  } catch (err) {
    console.error("duplicateTemplate error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
