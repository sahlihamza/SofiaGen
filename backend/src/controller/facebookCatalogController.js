const facebookCatalogService = require("../service/FacebookCatalogService");
const Store = require("../models/Store");
const AuditService = require("../service/AuditService");
const logger = require("../config/logger");
const { getClientIp } = require("../middleware/websiteVisibility");

const handleError = (res, error) => {
  if (error.name === "ValidationError") {
    return res.status(422).json({
      success: false,
      message: error.message || "Donnés invalides",
    });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Identifiant invalide" });
  }
  logger.error("[facebookCatalogController] error", { error: error.message });
  return res.status(500).json({ success: false, message: "Erreur serveur" });
};

const getSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await facebookCatalogService.getOrCreateSettings(storeId);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const before = await facebookCatalogService.getOrCreateSettings(storeId);
    const updated = await facebookCatalogService.updateSettings(storeId, req.body || {}, {
      actor: req.user,
    });

    await AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.user?._id,
      storeId,
      module: "FacebookCatalog",
      action: "facebook_catalog.settings_updated",
      entityType: "FacebookCatalogFeed",
      entityId: updated._id,
      oldValue: { enabled: before.enabled, includeOutOfStock: before.includeOutOfStock, includeVariations: before.includeVariations, includeInactive: before.includeInactive, currency: before.currency },
      newValue: { enabled: updated.enabled, includeOutOfStock: updated.includeOutOfStock, includeVariations: updated.includeVariations, includeInactive: updated.includeInactive, currency: updated.currency },
      summary: `Facebook Catalog settings updated for store ${storeId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      requestId: req.requestId,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

const getStatus = async (req, res) => {
  try {
    const { storeId } = req.params;
    const status = await facebookCatalogService.getStatus(storeId);
    return res.status(200).json({ success: true, data: status });
  } catch (error) {
    return handleError(res, error);
  }
};

const regenerateNow = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await facebookCatalogService.generateFeed(storeId, { force: true });

    await AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.user?._id,
      storeId,
      module: "FacebookCatalog",
      action: "facebook_catalog.regenerated",
      entityType: "FacebookCatalogFeed",
      summary: `Facebook Catalog feed regenerated: ${result.productCount} valid, ${result.invalid.length} invalid`,
      metadata: { productCount: result.productCount, invalidCount: result.invalid.length, durationMs: result.durationMs },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      requestId: req.requestId,
    });

    return res.status(200).json({
      success: true,
      data: {
        productCount: result.productCount,
        invalidCount: result.invalid.length,
        durationMs: result.durationMs,
        status: result.status,
        invalid: result.invalid,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const testFeed = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await facebookCatalogService.testFeed(storeId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const previewProduct = async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    const items = await facebookCatalogService.getPreviewItem(storeId, productId);
    if (!items) {
      return res.status(404).json({ success: false, message: "Produit introuvable" });
    }
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPublicFeed = async (req, res) => {
  const startedAt = Date.now();
  const slug = String(req.params.slug || "").toLowerCase();
  let store = null;
  let settings = null;
  let httpStatus = 200;
  let result = null;
  let productCount = 0;
  let invalidCount = 0;
  let fromCache = false;
  let errorMessage = null;

  try {
    store = await facebookCatalogService.resolveStoreBySlug(slug);
    if (!store) {
      httpStatus = 404;
      return res.status(404).type("text/plain").send("Not found");
    }

    settings = await facebookCatalogService.getOrCreateSettings(store._id);
    if (!settings.enabled) {
      httpStatus = 404;
      return res.status(404).type("text/plain").send("Not found");
    }

    result = await facebookCatalogService.generateFeed(store._id);
    productCount = result.productCount;
    invalidCount = result.invalid.length;
    fromCache = result.fromCache;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    return res.status(200).send(result.xml);
  } catch (error) {
    httpStatus = 500;
    errorMessage = error.message;
    logger.error("[facebookCatalogController] public feed error", {
      slug,
      error: error.message,
    });
    return res.status(500).type("text/plain").send("Internal server error");
  } finally {
    if (store) {
      await facebookCatalogService.logAccess({
        storeId: store._id,
        slug,
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
        productCount,
        invalidCount,
        durationMs: Date.now() - startedAt,
        httpStatus,
        error: errorMessage,
        fromCache,
      });
    }
  }
};

const getPublicFeedInfo = async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const store = await facebookCatalogService.resolveStoreBySlug(slug);
  if (!store) {
    return res.status(404).json({ success: false, message: "Store introuvable" });
  }
  const settings = await facebookCatalogService.getOrCreateSettings(store._id);
  return res.status(200).json({
    success: true,
    data: {
      slug: store.slug,
      name: store.name,
      enabled: settings.enabled,
      feedUrl: facebookCatalogService.buildPublicFeedUrl(slug),
      lastGeneratedAt: settings.lastGeneratedAt,
      lastProductCount: settings.lastProductCount,
    },
  });
};

module.exports = {
  getSettings,
  updateSettings,
  getStatus,
  regenerateNow,
  testFeed,
  previewProduct,
  getPublicFeed,
  getPublicFeedInfo,
};