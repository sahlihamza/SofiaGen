const AssetFolder = require("../models/AssetFolder");
const { resolveStoreId } = require("../utils/requestContext");

const normalizeFolderPath = (folder) => {
  if (!folder || typeof folder !== "string") return "/";
  const cleaned = folder.trim().replace(/\\\\/g, "/").replace(/\/+/g, "/");
  const path = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return path === "/" ? "/" : path.replace(/\/$/, "");
};

const getFolderName = (folderPath) => {
  if (!folderPath || folderPath === "/") return "/";
  return folderPath.split("/").filter(Boolean).pop() || "/";
};

const getParentPath = (folderPath) => {
  if (!folderPath || folderPath === "/") return "/";
  const normalized = normalizeFolderPath(folderPath);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  return `/${segments.slice(0, -1).join("/")}`;
};

exports.listFolders = async (req, res) => {
  try {
    const folders = await AssetFolder.find({ storeId: resolveStoreId(req) }).sort({ path: 1 }).lean();
    res.json(folders);
  } catch (err) {
    console.error("listFolders error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { name, parentPath = "/", path } = req.body;
    const folderPath = normalizeFolderPath(path || `${parentPath}/${name}`);
    const folderName = getFolderName(folderPath);
    const finalParentPath = path ? getParentPath(folderPath) : normalizeFolderPath(parentPath);

    if (!folderName || folderPath === "/") {
      return res.status(400).json({ error: "Le nom du dossier est requis" });
    }

    const existing = await AssetFolder.findOne({ storeId: resolveStoreId(req), path: folderPath });
    if (existing) {
      return res.status(200).json(existing);
    }

    const newFolder = await AssetFolder.create({
      storeId: resolveStoreId(req),
      path: folderPath,
      name: folderName,
      parentPath: finalParentPath,
    });

    res.status(201).json(newFolder);
  } catch (err) {
    console.error("createFolder error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const folder = await AssetFolder.findOne({ _id: req.params.folderId, storeId: resolveStoreId(req) });
    if (!folder) {
      return res.status(404).json({ error: "Dossier introuvable" });
    }

    const child = await AssetFolder.findOne({ storeId: resolveStoreId(req), parentPath: folder.path });
    if (child) {
      return res.status(400).json({ error: "Le dossier contient des sous-dossiers" });
    }

    const assetCount = await require("../models/Asset").countDocuments({ storeId: resolveStoreId(req), folder: folder.path });
    if (assetCount > 0) {
      return res.status(400).json({ error: "Le dossier contient des fichiers" });
    }

    await folder.remove();
    res.json({ success: true });
  } catch (err) {
    console.error("deleteFolder error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
