// DEPRECATED  Ce contrôleur est conservé uniquement pour référence et rollback.
// Le système officiel de sections globales est GlobalSection (globalSectionController.js).
// Raisons de la dépréciation :
//   1. Défaut de scoping storeId (GET /global-components sans ?storeId expose toutes les boutiques)
//   2. Format componentData incompatible avec renderProjectDataToHtml() sans adaptation
//   3. Aucune donné rélle en production (0 documents en base, 2026-07-12)
//   4. Jamais câblé dans generateRenderedPage()  aucun effet sur le rendu publié
// NE PAS SUPPRIMER  dépréciation réversible.
const GlobalComponent = require("../models/GlobalComponent");
const Section = require("../models/Section");
const { mergeGlobalComponent } = require("../utils/mergeGlobalComponent");

const createGlobalComponent = async (req, res) => {
  try {
    const { name, storeId, themeId, type, componentData, html, css } = req.body;
    if (!name || !storeId) return res.status(400).json({ message: "name and storeId required" });

    const gc = new GlobalComponent({
      name,
      storeId,
      themeId,
      type,
      componentData: componentData || {},
      html: html || "",
      css: css || "",
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });
    await gc.save();
    res.status(201).json({ success: true, data: gc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGlobalComponents = async (req, res) => {
  try {
    const { storeId, themeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ success: false, message: "storeId is required" });
    }

    const filter = { storeId };
    if (themeId) filter.themeId = themeId;

    const items = await GlobalComponent.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGlobalComponent = async (req, res) => {
  try {
    const updates = req.body;
    const gc = await GlobalComponent.findByIdAndUpdate(req.params.id, { ...updates, updatedBy: req.user?.id }, { new: true });
    if (!gc) return res.status(404).json({ message: "Global component not found" });
    res.status(200).json({ success: true, data: gc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteGlobalComponent = async (req, res) => {
  try {
    const gc = await GlobalComponent.findById(req.params.id);
    if (!gc) return res.status(404).json({ message: "Global component not found" });

    // Find sections referencing this global and replace them by merged state
    const sections = await Section.find({ globalComponentId: gc._id });
    for (const s of sections) {
      const merged = mergeGlobalComponent(s, gc);
      s.componentData = merged;
      s.globalComponentId = null;
      s.overrides = s.overrides || {};
      await s.save();
    }

    await GlobalComponent.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: "Global component deleted and sections detached" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGlobalComponent,
  getGlobalComponents,
  updateGlobalComponent,
  deleteGlobalComponent,
};
