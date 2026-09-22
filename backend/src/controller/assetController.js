const MediaService = require("../services/MediaService");
const { resolveStoreId } = require("../utils/requestContext");

exports.uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { folder = "/", tags = "" } = req.body;
    const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);
    const asset = await MediaService.uploadAsset(resolveStoreId(req), req.file, folder, tagsArray);
    return res.status(201).json(asset);
  } catch (err) {
    console.error("uploadAsset error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.listAssets = async (req, res) => {
  try {
    const { folder, category, search } = req.query;
    const assets = await MediaService.listAssets(resolveStoreId(req), { folder, category, search });
    return res.json(assets);
  } catch (err) {
    console.error("listAssets error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    await MediaService.deleteAsset(resolveStoreId(req), req.params.assetId);
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteAsset error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
};
