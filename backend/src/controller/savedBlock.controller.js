const SavedBlock = require("../models/SavedBlock.model");
const SyncedBlockUsage = require("../models/SyncedBlockUsage");

/**
 * ADMIN controller  authenticated. Scopé par storeId  chaque opération
 * pour garantir qu'un marchand ne voit jamais les blocs sauvegardés
 * d'une autre boutique.
 */

exports.listSavedBlocks = async (req, res) => {
  try {
    const { storeId } = req.params;
    const blocks = await SavedBlock.find({ storeId }).sort({ createdAt: -1 }).lean();
    return res.json(blocks);
  } catch (err) {
    console.error("listSavedBlocks error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.createSavedBlock = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, category, componentJson, isSynced, isGlobalComponent } = req.body;

    if (!name || !componentJson) {
      return res.status(400).json({ error: "name et componentJson sont requis" });
    }

    // If created via the Global Components flow, force isSynced = true
    const finalIsSynced = isGlobalComponent ? true : Boolean(isSynced);

    const block = await SavedBlock.create({
      storeId,
      name,
      category: category || (isGlobalComponent ? "< Composants Globaux" : "P Mes Blocs"),
      componentJson,
      isSynced: finalIsSynced,
      isGlobalComponent: Boolean(isGlobalComponent),
      createdBy: req.user?._id || null,
    });

    return res.status(201).json(block);
  } catch (err) {
    console.error("createSavedBlock error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

// THEME-03: this endpoint didn't exist at all  "Edit global" in the
// frontend (GlobalComponentsPanel / saved-blocks:open-editor) could open a
// synced block for viewing, but nothing could actually persist an edit to
// it. applySyncedBlocksToHtml (pageController.js) already re-renders every
// synced instance from the SavedBlock's current componentJson at
// publish/render time, so this is the one missing link, not a new
// propagation mechanism  a page's own instance is never edited in place.
exports.updateSavedBlock = async (req, res) => {
  try {
    const { storeId, blockId } = req.params;
    const { name, category, componentJson } = req.body;

    if (!componentJson) {
      return res.status(400).json({ error: "componentJson est requis" });
    }

    const updated = await SavedBlock.findOneAndUpdate(
      { _id: blockId, storeId },
      { $set: { componentJson, ...(name !== undefined && { name }), ...(category !== undefined && { category }) } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Bloc introuvable" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateSavedBlock error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.deleteSavedBlock = async (req, res) => {
  try {
    const { storeId, blockId } = req.params;
    const deleted = await SavedBlock.findOneAndDelete({ _id: blockId, storeId });

    if (!deleted) {
      return res.status(404).json({ error: "Bloc introuvable" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteSavedBlock error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.getSavedBlockUsageCount = async (req, res) => {
  try {
    const { storeId, blockId } = req.params;
    // THEME-03: this ignored storeId entirely  any authenticated user
    // could probe the usage count of any store's savedBlockId, not just
    // their own. validateStoreAccess only checked the route's own :storeId
    // param existed and was accessible, not that blockId belonged to it.
    const block = await SavedBlock.findOne({ _id: blockId, storeId }).select("_id");
    if (!block) {
      return res.status(404).json({ error: "Bloc introuvable" });
    }
    const count = await SyncedBlockUsage.countDocuments({ savedBlockId: blockId });
    return res.json({ count });
  } catch (err) {
    console.error("getSavedBlockUsageCount error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
