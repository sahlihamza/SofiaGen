const Template = require("../models/Template.model");
const SavedBlock = require("../models/SavedBlock.model");

exports.searchLibrary = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { q, type, category, favoritesOnly } = req.query;
    const userId = req.user?._id;

    const textFilter = q ? { name: { $regex: q, $options: "i" } } : {};
    const categoryFilter = category ? { category } : {};
    const favFilter = favoritesOnly === "true" ? { favoritedBy: userId } : {};

    const results = { pages: [], sections: [], popups: [], components: [] };
    const sharedOrStore = { $or: [{ storeId: null }, { storeId }] };

    if (!type || type === "page") {
      results.pages = await Template.find({
        ...sharedOrStore,
        type: "page",
        ...textFilter,
        ...categoryFilter,
        ...favFilter,
      })
        .sort({ isSystem: -1, createdAt: -1 })
        .lean();
      results.pages = results.pages.map((item) => ({
        ...item,
        isFavorite: Boolean(item.favoritedBy?.some((id) => id.toString() === userId?.toString())),
      }));
    }

    if (!type || type === "section") {
      results.sections = await Template.find({
        ...sharedOrStore,
        type: "section",
        ...textFilter,
        ...categoryFilter,
        ...favFilter,
      })
        .sort({ isSystem: -1, createdAt: -1 })
        .lean();
      results.sections = results.sections.map((item) => ({
        ...item,
        isFavorite: Boolean(item.favoritedBy?.some((id) => id.toString() === userId?.toString())),
      }));
    }

    if (!type || type === "popup") {
      results.popups = await Template.find({
        ...sharedOrStore,
        type: "popup",
        ...textFilter,
        ...categoryFilter,
        ...favFilter,
      })
        .sort({ isSystem: -1, createdAt: -1 })
        .lean();
      results.popups = results.popups.map((item) => ({
        ...item,
        isFavorite: Boolean(item.favoritedBy?.some((id) => id.toString() === userId?.toString())),
      }));
    }

    if (!type || type === "component") {
      results.components = await SavedBlock.find({
        storeId,
        ...textFilter,
        ...categoryFilter,
        ...(favoritesOnly === "true" ? { favoritedBy: userId } : {}),
      })
        .sort({ createdAt: -1 })
        .lean();
      results.components = results.components.map((item) => ({
        ...item,
        isFavorite: Boolean(item.favoritedBy?.some((id) => id.toString() === userId?.toString())),
      }));
    }

    return res.json(results);
  } catch (err) {
    console.error("searchLibrary error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const userId = req.user._id;
    const Model = itemType === "component" ? SavedBlock : Template;

    const doc = await Model.findById(itemId);
    if (!doc) return res.status(404).json({ error: "Introuvable" });

    const idx = doc.favoritedBy.findIndex((id) => id.toString() === userId.toString());
    if (idx >= 0) doc.favoritedBy.splice(idx, 1);
    else doc.favoritedBy.push(userId);

    await doc.save();
    return res.json({ isFavorite: idx < 0 });
  } catch (err) {
    console.error("toggleFavorite error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
