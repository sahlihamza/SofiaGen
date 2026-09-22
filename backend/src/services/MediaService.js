const assetStorage = require("../lib/storage");
const Asset = require("../models/Asset");
const AssetFolder = require("../models/AssetFolder");
const Page = require("../models/Page");
const Template = require("../models/Template.model");
const Section = require("../models/Section");
const GlobalSection = require("../models/GlobalSection");
const SavedBlock = require("../models/SavedBlock.model");
const sharp = require("sharp");

class MediaService {
  normalizeFolderPath(folder) {
    if (!folder || typeof folder !== "string") return "/";
    const cleaned = folder.trim().replace(/\\+/g, "/").replace(/\/+/g, "/");
    let normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    if (normalized !== "/" && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized || "/";
  }

  getFolderName(folderPath) {
    if (!folderPath || folderPath === "/") return "/";
    return folderPath.split("/").filter(Boolean).pop() || "/";
  }

  getParentPath(folderPath) {
    if (!folderPath || folderPath === "/") return "/";
    const segments = this.normalizeFolderPath(folderPath).split("/").filter(Boolean);
    if (segments.length <= 1) return "/";
    return `/${segments.slice(0, -1).join("/")}`;
  }

  async ensureFolderExists(storeId, folder) {
    const normalizedFolder = this.normalizeFolderPath(folder);
    if (normalizedFolder === "/") return;
    const name = this.getFolderName(normalizedFolder);
    const parentPath = this.getParentPath(normalizedFolder);

    await AssetFolder.findOneAndUpdate(
      { storeId, path: normalizedFolder },
      { $setOnInsert: { storeId, path: normalizedFolder, name, parentPath } },
      { upsert: true, new: true }
    );
  }

  getCategoryFromMimeType(mimeType, filename) {
    if (!mimeType) return "other";

    const type = mimeType.toLowerCase();
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type.includes("font") || /\.(woff2?|ttf|otf|eot)$/i.test(filename)) return "font";
    if (
      type.includes("pdf") ||
      type.includes("msword") ||
      type.includes("officedocument") ||
      type.includes("excel") ||
      type.includes("presentation") ||
      type.startsWith("text/")
    ) {
      return "document";
    }
    if (type.includes("zip") || type.includes("x-7z") || type.includes("x-rar") || type.includes("x-tar") || type.includes("gzip")) {
      return "archive";
    }
    return "other";
  }

  containsAssetReference(data, assetUrl) {
    if (data == null) return false;
    if (typeof data === "string") {
      return data.includes(assetUrl);
    }
    if (Array.isArray(data)) {
      return data.some((item) => this.containsAssetReference(item, assetUrl));
    }
    if (typeof data === "object") {
      return Object.values(data).some((value) => this.containsAssetReference(value, assetUrl));
    }
    return false;
  }

  async assetIsInUse(storeId, assetUrl) {
    const checks = [
      { model: Page, query: { storeId }, projection: { projectData: 1, compiledHtml: 1, compiledCss: 1, renderedHtml: 1, renderedCss: 1 } },
      { model: Template, query: { storeId }, projection: { projectData: 1, compiledHtml: 1, compiledCss: 1 } },
      { model: Section, query: { storeId }, projection: { componentData: 1, html: 1, css: 1 } },
      { model: GlobalSection, query: { storeId }, projection: { projectData: 1, compiledHtml: 1, compiledCss: 1 } },
      { model: SavedBlock, query: { storeId }, projection: { componentJson: 1, thumbnail: 1 } },
    ];

    for (const check of checks) {
      const docs = await check.model.find(check.query, check.projection).lean();
      if (docs.some((doc) => this.containsAssetReference(doc, assetUrl))) {
        return true;
      }
    }

    return false;
  }

  async uploadAsset(storeId, file, folder = "/", tags = []) {
    let processedBuffer = file.buffer;
    let filename = file.originalname;
    let mimeType = file.mimetype;
    let size = file.size;
    const folderPath = this.normalizeFolderPath(folder);

    if (folderPath !== "/") {
      await this.ensureFolderExists(storeId, folderPath);
    }

    if (mimeType.startsWith("image/") && !mimeType.includes("svg")) {
      try {
        const image = sharp(file.buffer);
        processedBuffer = await image.webp({ quality: 80 }).toBuffer();
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf(".")) || filename;
        filename = `${nameWithoutExt}.webp`;
        mimeType = "image/webp";
        size = processedBuffer.length;
      } catch (err) {
        console.error("Error processing image with sharp:", err);
      }
    }

    const category = this.getCategoryFromMimeType(mimeType, filename);
    const processedFile = {
      ...file,
      buffer: processedBuffer,
      originalname: filename,
      mimetype: mimeType,
      size,
    };

    const result = await assetStorage.upload(processedFile, filename, storeId);
    const asset = await Asset.create({
      storeId,
      folder: folderPath,
      tags,
      filename,
      url: result.url,
      provider: result.provider,
      key: result.key,
      category,
      mimeType,
      size,
    });

    return asset;
  }

  async listAssets(storeId, filters = {}) {
    const query = { storeId };
    if (filters.folder) {
      query.folder = this.normalizeFolderPath(filters.folder);
    }
    if (filters.category && filters.category !== "all") {
      query.category = filters.category;
    }
    if (filters.search) {
      query.filename = { $regex: filters.search, $options: "i" };
    }

    const assets = await Asset.find(query).sort({ createdAt: -1 }).lean();
    return assets;
  }

  async deleteAsset(storeId, assetId) {
    const asset = await Asset.findOne({ _id: assetId, storeId });
    if (!asset) {
      throw new Error("Asset not found");
    }

    if (asset.url && (await this.assetIsInUse(storeId, asset.url))) {
      throw new Error("Impossible de supprimer ce fichier car il est utilisé dans le contenu de la boutique.");
    }

    await assetStorage.delete(asset.key, storeId);
    await asset.remove();
    return true;
  }
}

module.exports = new MediaService();
