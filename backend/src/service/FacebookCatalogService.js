const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const Brand = require("../models/Brand");
const ProductCategory = require("../models/ProductCategory");
const Store = require("../models/Store");
const FacebookCatalogFeed = require("../models/FacebookCatalogFeed");
const FacebookCatalogAccessLog = require("../models/FacebookCatalogAccessLog");
const cache = require("../lib/cache");
const logger = require("../config/logger");

const CACHE_NAMESPACE = "fb-catalog";
const DEFAULT_CACHE_TTL = 900;

const escapeXml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const stripHtml = (html) => {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatPrice = (value, currency) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const num = Number(value);
  if (num <= 0) return null;
  return `${num.toFixed(3)} ${currency}`;
};

const effectiveSalePrice = (product) => {
  const now = Date.now();
  const start = product.saleStart ? new Date(product.saleStart).getTime() : null;
  const end = product.saleEnd ? new Date(product.saleEnd).getTime() : null;
  if (start !== null && now < start) return null;
  if (end !== null && now > end) return null;
  return product.salePrice ?? null;
};

const currentPrice = (product) => {
  const sale = effectiveSalePrice(product);
  if (sale !== null && sale !== undefined && !Number.isNaN(Number(sale))) return Number(sale);
  if (product.regularPrice !== null && product.regularPrice !== undefined) {
    return Number(product.regularPrice);
  }
  return null;
};

const variationPrice = (variation) => {
  if (!variation || !variation.pricing) return null;
  const p = variation.pricing;
  const now = Date.now();
  const start = p.saleStart ? new Date(p.saleStart).getTime() : null;
  const end = p.saleEnd ? new Date(p.saleEnd).getTime() : null;
  const saleRaw = p.salePrice !== null && p.salePrice !== undefined ? Number(p.salePrice.toString()) : null;
  const regRaw = p.regularPrice !== null && p.regularPrice !== undefined ? Number(p.regularPrice.toString()) : null;
  if (start !== null && now < start) return regRaw;
  if (end !== null && now > end) return regRaw;
  if (saleRaw !== null && saleRaw > 0) return saleRaw;
  return regRaw;
};

const availabilityFromStock = ({ manageStock, stockQuantity, stockStatus, allowBackorders }) => {
  if (stockStatus === "outofstock") return "out of stock";
  if (stockStatus === "onbackorder") return "available for order";
  if (manageStock && (stockQuantity === 0 || stockQuantity === null || stockQuantity === undefined)) {
    if (allowBackorders && allowBackorders !== "no") return "available for order";
    return "out of stock";
  }
  return "in stock";
};

const variationAvailability = (variation) => {
  if (!variation || !variation.inventory) return "out of stock";
  if (variation.enabled === false) return "out of stock";
  const inv = variation.inventory;
  const quantity = Number(inv.quantity || 0) - Number(inv.reserved || 0);
  if (inv.allowBackorders) return "available for order";
  if (quantity > 0) return "in stock";
  return "out of stock";
};

const buildProductUrl = (productId, baseUrl) => {
  const base = (baseUrl || process.env.PUBLIC_STORE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/product/${productId}`;
  return `${base}/product/${productId}`;
};

const validateItem = (item) => {
  const errors = [];
  if (!item.id) errors.push("missing id");
  if (!item.title) errors.push("missing title");
  if (!item.link || !/^https?:\/\//.test(item.link)) errors.push("invalid link");
  if (!item.imageLink || !/^https?:\/\//.test(item.imageLink)) errors.push("missing image");
  if (item.price === null || item.price === undefined) errors.push("missing price");
  return errors;
};

const mapSimpleProduct = (product, brandName, categoryName, baseUrl, currency, condition) => {
  const price = currentPrice(product);
  const productUrl = buildProductUrl(product._id, baseUrl);
  const image = product.productGallery && product.productGallery[0] ? product.productGallery[0].image : null;
  const availability = availabilityFromStock({
    manageStock: product.manageStock,
    stockQuantity: product.stockQuantity,
    stockStatus: product.stockStatus,
    allowBackorders: product.allowBackorders,
  });

  const id = String(product._id);
  const item = {
    id,
    title: product.productName || "",
    description: stripHtml(product.description || product.shortDescription || ""),
    link: productUrl,
    imageLink: image || "",
    price: formatPrice(price, currency),
    availability,
    brand: brandName || "",
    retailerId: product.sku || id,
    condition: condition || "new",
    googleProductCategory: categoryName || "",
  };

  return { item, errors: validateItem(item) };
};

const mapVariation = (product, variation, brandName, categoryName, baseUrl, currency, condition) => {
  const price = variationPrice(variation);
  const productUrl = buildProductUrl(product._id, baseUrl);
  const image = (variation.images && variation.images[0]) || (product.productGallery && product.productGallery[0] ? product.productGallery[0].image : null);
  const availability = variationAvailability(variation);
  const stableVariationId = `${product._id}-${variation._id}`;

  const item = {
    id: stableVariationId,
    itemGroupId: String(product._id),
    title: product.productName || "",
    description: stripHtml(product.description || product.shortDescription || ""),
    link: productUrl,
    imageLink: image || "",
    price: formatPrice(price, currency),
    availability,
    brand: brandName || "",
    retailerId: variation.sku || stableVariationId,
    condition: condition || "new",
    googleProductCategory: categoryName || "",
  };

  return { item, errors: validateItem(item) };
};

const buildItemXml = (item) => {
  const lines = ["  <item>"];
  lines.push(`    <g:id>${escapeXml(item.id)}</g:id>`);
  if (item.itemGroupId) lines.push(`    <g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`);
  lines.push(`    <g:title>${escapeXml(item.title)}</g:title>`);
  if (item.description) lines.push(`    <g:description>${escapeXml(item.description)}</g:description>`);
  lines.push(`    <g:link>${escapeXml(item.link)}</g:link>`);
  if (item.imageLink) lines.push(`    <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`);
  if (item.price) lines.push(`    <g:price>${escapeXml(item.price)}</g:price>`);
  if (item.availability) lines.push(`    <g:availability>${escapeXml(item.availability)}</g:availability>`);
  if (item.brand) lines.push(`    <g:brand>${escapeXml(item.brand)}</g:brand>`);
  if (item.retailerId) lines.push(`    <g:retailer_id>${escapeXml(item.retailerId)}</g:retailer_id>`);
  if (item.condition) lines.push(`    <g:condition>${escapeXml(item.condition)}</g:condition>`);
  if (item.googleProductCategory) lines.push(`    <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>`);
  lines.push("  </item>");
  return lines.join("\n");
};

const buildFeedXml = (items, { storeName }) => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(storeName || "Facebook Catalog")}</title>
    <link>https://facebook.com</link>
    <description>Facebook Catalog product feed for ${escapeXml(storeName || "")}</description>`;
  const body = items.map(buildItemXml).join("\n");
  return `${header}\n${body}\n  </channel>\n</rss>`;
};

const isProductVisible = (product, settings) => {
  if (product.visibility !== "public") return false;
  if (settings.includeInactive) {
    return product.status === "published" || product.status === "draft";
  }
  return product.status === "published";
};

const shouldIncludeByStock = (product, settings) => {
  if (product.manageStock === false) return true;
  if (product.stockStatus === "outofstock") return settings.includeOutOfStock;
  if (product.stockQuantity === 0) return settings.includeOutOfStock;
  return true;
};

class FacebookCatalogService {
  cacheKey(storeId) {
    return Cache_buildKey(CACHE_NAMESPACE, "feed", storeId);
  }

  async getOrCreateSettings(storeId) {
    if (!storeId) throw new Error("storeId is required");
    let settings = await FacebookCatalogFeed.findOne({ storeId });
    if (!settings) {
      try {
        settings = await FacebookCatalogFeed.create({ storeId });
      } catch (error) {
        if (error.code !== 11000) throw error;
        settings = await FacebookCatalogFeed.findOne({ storeId });
      }
    }
    return settings;
  }

  async updateSettings(storeId, patch = {}, { actor = null } = {}) {
    const current = await this.getOrCreateSettings(storeId);
    const allowed = [
      "enabled",
      "includeOutOfStock",
      "includeVariations",
      "includeInactive",
      "currency",
      "defaultCondition",
    ];
    const $set = {};
    for (const key of allowed) {
      if (patch[key] !== undefined) $set[key] = patch[key];
    }
    $set.updatedBy = actor?._id || null;

    const previousEnabled = current.enabled;
    const updated = await FacebookCatalogFeed.findOneAndUpdate(
      { storeId },
      { $set, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (previousEnabled !== updated.enabled || patch.enabled !== undefined) {
      await this.invalidateCache(storeId);
    }

    return updated;
  }

  async getStatus(storeId) {
    const settings = await this.getOrCreateSettings(storeId);
    return {
      enabled: settings.enabled,
      lastGeneratedAt: settings.lastGeneratedAt,
      lastGenerationDurationMs: settings.lastGenerationDurationMs,
      lastProductCount: settings.lastProductCount,
      lastInvalidCount: settings.lastInvalidCount,
      lastStatus: settings.lastStatus,
      lastError: settings.lastError,
      lastAccessedAt: settings.lastAccessedAt,
      lastAccessCount: settings.lastAccessCount,
    };
  }

  async invalidateCache(storeId) {
    if (!storeId) return;
    try {
      await cache.del(this.cacheKey(storeId));
    } catch (err) {
      logger.warn("[FacebookCatalogService] invalidateCache failed", {
        storeId: String(storeId),
        error: err.message,
      });
    }
  }

  async generateFeed(storeId, { force = false, baseUrl = null } = {}) {
    const start = Date.now();
    const settings = await this.getOrCreateSettings(storeId);

    if (!force) {
      const cached = await cache.get(this.cacheKey(storeId));
      if (cached && cached.xml && cached.productCount !== undefined) {
        return { ...cached, fromCache: true };
      }
    }

    const items = [];
    const invalid = [];

    const store = await Store.findById(storeId).select("name domain customDomain subdomain").lean();
    const resolvedBaseUrl =
      baseUrl ||
      process.env.PUBLIC_STORE_BASE_URL ||
      (store ? `https://${store.customDomain || store.domain || `${store.subdomain}.mallatech.tn`}` : null);

    const productQuery = {
      storeId,
      visibility: "public",
    };
    if (!settings.includeInactive) {
      productQuery.status = "published";
    }

    const products = await Product.find(productQuery)
      .populate({ path: "productGallery", options: { limit: 1 } })
      .populate("brand", "name")
      .populate("productCategories", "name")
      .populate({
        path: "productVariations",
        match: { enabled: true },
        options: { sort: { _id: 1 } },
      })
      .lean();

    for (const product of products) {
      if (!shouldIncludeByStock(product, settings)) continue;
      if (!isProductVisible(product, settings)) continue;

      const brandName = product.brand && product.brand.name ? product.brand.name : "";
      const categoryName = product.productCategories && product.productCategories[0] ? product.productCategories[0].name : "";

      if (settings.includeVariations && product.productType === "variable" && Array.isArray(product.productVariations) && product.productVariations.length > 0) {
        for (const variation of product.productVariations) {
          const { item, errors } = mapVariation(product, variation, brandName, categoryName, resolvedBaseUrl, settings.currency, settings.defaultCondition);
          if (errors.length > 0) {
            invalid.push({ productId: String(product._id), variationId: String(variation._id), errors });
          } else {
            items.push(item);
          }
        }
      } else {
        const { item, errors } = mapSimpleProduct(product, brandName, categoryName, resolvedBaseUrl, settings.currency, settings.defaultCondition);
        if (errors.length > 0) {
          invalid.push({ productId: String(product._id), errors });
        } else {
          items.push(item);
        }
      }
    }

    const storeName = store && store.name ? store.name : "Facebook Catalog";
    const xml = buildFeedXml(items, { storeName });

    const durationMs = Date.now() - start;
    const status = invalid.length === 0 ? "success" : items.length === 0 ? "failed" : "partial";

    await FacebookCatalogFeed.findOneAndUpdate(
      { storeId },
      {
        $set: {
          lastGeneratedAt: new Date(),
          lastGenerationDurationMs: durationMs,
          lastProductCount: items.length,
          lastInvalidCount: invalid.length,
          lastStatus: status,
          lastError: invalid.length > 0 ? `${invalid.length} produit(s) invalide(s)` : null,
        },
      }
    );

    const payload = { xml, productCount: items.length, invalid, durationMs, status };
    await cache.set(this.cacheKey(storeId), payload, DEFAULT_CACHE_TTL);

    return { ...payload, fromCache: false };
  }

  async testFeed(storeId) {
    const result = await this.generateFeed(storeId, { force: true });
    return {
      valid: result.invalid.length === 0,
      totalProducts: result.productCount,
      invalidProducts: result.invalid.length,
      errors: result.invalid,
      durationMs: result.durationMs,
    };
  }

  async getPreviewItem(storeId, productId) {
    const settings = await this.getOrCreateSettings(storeId);
    const product = await Product.findOne({ _id: productId, storeId })
      .populate({ path: "productGallery", options: { limit: 1 } })
      .populate("brand", "name")
      .populate("productCategories", "name")
      .lean();

    if (!product) return null;

    const store = await Store.findById(storeId).select("name domain customDomain subdomain").lean();
    const baseUrl =
      process.env.PUBLIC_STORE_BASE_URL ||
      (store ? `https://${store.customDomain || store.domain || `${store.subdomain}.mallatech.tn`}` : null);

    const brandName = product.brand && product.brand.name ? product.brand.name : "";
    const categoryName = product.productCategories && product.productCategories[0] ? product.productCategories[0].name : "";

    if (settings.includeVariations && product.productType === "variable") {
      const variations = await ProductVariation.find({ productId: product._id, enabled: true }).lean();
      return variations.map((variation) => {
        const { item, errors } = mapVariation(product, variation, brandName, categoryName, baseUrl, settings.currency, settings.defaultCondition);
        return { item, xml: buildItemXml(item), errors };
      });
    }

    const { item, errors } = mapSimpleProduct(product, brandName, categoryName, baseUrl, settings.currency, settings.defaultCondition);
    return [{ item, xml: buildItemXml(item), errors }];
  }

  async logAccess({ storeId, slug, ip, userAgent, productCount, invalidCount, durationMs, httpStatus, error, fromCache }) {
    try {
      await FacebookCatalogAccessLog.create({
        storeId,
        slug,
        ip: ip || null,
        userAgent: (userAgent || "").slice(0, 512),
        productCount,
        invalidCount,
        durationMs,
        httpStatus,
        error: error || null,
        fromCache: !!fromCache,
      });
      await FacebookCatalogFeed.findOneAndUpdate(
        { storeId },
        {
          $set: { lastAccessedAt: new Date() },
          $inc: { lastAccessCount: 1 },
        }
      );
    } catch (err) {
      logger.warn("[FacebookCatalogService] logAccess failed", {
        storeId: String(storeId),
        error: err.message,
      });
    }
  }

  async resolveStoreBySlug(slug) {
    if (!slug || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return null;
    const store = await Store.findOne({ slug }).select("_id status name slug domain customDomain subdomain").lean();
    if (!store) return null;
    if (store.status !== "active" && store.status !== "trial" && store.status !== "pending") return null;
    return store;
  }

  buildPublicFeedUrl(slug, baseUrl = null) {
    const base = (baseUrl || process.env.PUBLIC_STORE_BASE_URL || "https://mallatech.tn").replace(/\/+$/, "");
    return `${base}/api/public/facebook-catalog/${slug}/feed.xml`;
  }
}

function Cache_buildKey(...parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).replace(/[:#*?\s]/g, "_"))
    .join(":");
}

module.exports = new FacebookCatalogService();
module.exports.FacebookCatalogService = FacebookCatalogService;
module.exports._internal = {
  escapeXml,
  stripHtml,
  formatPrice,
  availabilityFromStock,
  variationAvailability,
  mapSimpleProduct,
  mapVariation,
  buildItemXml,
  buildFeedXml,
  isProductVisible,
  shouldIncludeByStock,
};