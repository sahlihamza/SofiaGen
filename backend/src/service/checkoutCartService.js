const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const ProductTagRelation = require("../models/ProductTagRelation");

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const toNumber = (value) => {
  // Variation prices are Decimal128, product prices plain numbers.
  if (value === null || value === undefined) return null;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
};

// A sale only counts inside its window. Both bounds are optional and
// inclusive, so an unscheduled sale is always running  same rule the
// storefront applies client-side (store/src/utils/normalizeProduct.js), which
// is why the price it displays matches the one computed here.
const isSaleRunning = ({ salePrice, saleStart, saleEnd }, now = new Date()) => {
  if (!(salePrice > 0)) return false;

  const today = new Date(now.toISOString().substring(0, 10));

  if (saleStart && new Date(saleStart) > today) return false;
  if (saleEnd && new Date(saleEnd) < today) return false;

  return true;
};

const productUnitPrice = (product) => {
  const regularPrice = toNumber(product.regularPrice) || 0;
  const salePrice = toNumber(product.salePrice);

  return isSaleRunning({
    salePrice,
    saleStart: product.saleStart,
    saleEnd: product.saleEnd,
  })
    ? salePrice
    : regularPrice;
};

const variationUnitPrice = (variation) => {
  const regularPrice = toNumber(variation.pricing?.regularPrice) || 0;
  const salePrice = toNumber(variation.pricing?.salePrice);

  return isSaleRunning({
    salePrice,
    saleStart: variation.pricing?.saleStart,
    saleEnd: variation.pricing?.saleEnd,
  })
    ? salePrice
    : regularPrice;
};

// How many units can still be sold. `null` means "unlimited"  either stock
// isn't tracked or backorders are allowed, in which case the quantity asked
// for is never the blocking factor.
const availableStock = ({ manageStock, quantity, stockStatus, allowBackorders }) => {
  if (allowBackorders) return null;
  if (!manageStock) return stockStatus === "outofstock" ? 0 : null;
  return Math.max(0, Number(quantity) || 0);
};

const productStock = (product) =>
  availableStock({
    manageStock: product.manageStock,
    quantity: product.stockQuantity,
    stockStatus: product.stockStatus,
    // "notify" still lets the order through, it only warns the shop.
    allowBackorders: product.allowBackorders && product.allowBackorders !== "no",
  });

const variationStock = (variation) =>
  availableStock({
    manageStock: variation.inventory?.manageStock,
    quantity: (variation.inventory?.quantity || 0) - (variation.inventory?.reserved || 0),
    stockStatus: variation.enabled ? "instock" : "outofstock",
    allowBackorders: variation.inventory?.allowBackorders,
  });

/**
 * Turns the raw cart the storefront posts into priced, stock-checked lines.
 *
 * Nothing here trusts the client: the unit price always comes from the
 * database, and a `price` sent along with an item is only used to detect that
 * it changed since the cart was filled (PRICE_CHANGED).
 *
 * @param {Array<{productId, variationId?, quantity, price?}>} items
 * @returns {Promise<{lines: Array, errors: Array, subtotal: number, totalQuantity: number, totalWeight: number}>}
 */
const buildCartLines = async (items = []) => {
  const errors = [];
  const lines = [];

  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: String(item?.productId || item?._id || item?.id || ""),
      variationId: item?.variationId ? String(item.variationId) : null,
      quantity: Math.floor(Number(item?.quantity) || 0),
      expectedPrice: item?.price === undefined ? null : Number(item.price),
      title: item?.title,
    }))
    .filter((item) => item.productId);

  if (normalized.length === 0) {
    errors.push({
      code: "CART_EMPTY",
      field: "items",
      message: "Votre panier est vide.",
    });
    return { lines, errors, subtotal: 0, totalQuantity: 0, totalWeight: 0 };
  }

  const productIds = [...new Set(normalized.map((i) => i.productId))].filter(isObjectId);
  const variationIds = [
    ...new Set(normalized.map((i) => i.variationId).filter(Boolean)),
  ].filter(isObjectId);

  const [products, variations, tagRelations] = await Promise.all([
    Product.find({ _id: { $in: productIds } }),
    variationIds.length ? ProductVariation.find({ _id: { $in: variationIds } }) : [],
    ProductTagRelation.find({ productId: { $in: productIds } }),
  ]);

  const productById = new Map(products.map((p) => [String(p._id), p]));
  const variationById = new Map(variations.map((v) => [String(v._id), v]));
  const tagsByProduct = tagRelations.reduce((acc, relation) => {
    const key = String(relation.productId);
    acc.set(key, [...(acc.get(key) || []), String(relation.tagId)]);
    return acc;
  }, new Map());

  for (const item of normalized) {
    const product = productById.get(item.productId);

    if (!product) {
      errors.push({
        code: "PRODUCT_NOT_FOUND",
        field: "items",
        productId: item.productId,
        message: `Le produit  ${item.title || item.productId}  n'existe plus.`,
      });
      continue;
    }

    if (product.status !== "published" || product.visibility !== "public") {
      errors.push({
        code: "PRODUCT_UNAVAILABLE",
        field: "items",
        productId: item.productId,
        message: `Le produit  ${product.productName}  n'est plus disponible  la vente.`,
      });
      continue;
    }

    if (item.quantity < 1) {
      errors.push({
        code: "INVALID_QUANTITY",
        field: "items",
        productId: item.productId,
        message: `La quantité demandé pour  ${product.productName}  est invalide.`,
      });
      continue;
    }

    const variation = item.variationId ? variationById.get(item.variationId) : null;

    if (item.variationId && (!variation || String(variation.productId) !== item.productId)) {
      errors.push({
        code: "VARIATION_NOT_FOUND",
        field: "items",
        productId: item.productId,
        variationId: item.variationId,
        message: `La déclinaison choisie pour  ${product.productName}  n'existe plus.`,
      });
      continue;
    }

    if (product.soldIndividually && item.quantity > 1) {
      errors.push({
        code: "SOLD_INDIVIDUALLY",
        field: "items",
        productId: item.productId,
        message: ` ${product.productName}  ne peut être commandé qu'en un seul exemplaire.`,
      });
      continue;
    }

    const stock = variation ? variationStock(variation) : productStock(product);

    if (stock !== null && stock < item.quantity) {
      errors.push({
        code: stock === 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
        field: "items",
        productId: item.productId,
        variationId: item.variationId,
        available: stock,
        requested: item.quantity,
        message:
          stock === 0
            ? ` ${product.productName}  est en rupture de stock.`
            : `Il ne reste que ${stock} unité(s) de  ${product.productName} .`,
      });
      continue;
    }

    const unitPrice = round2(
      variation ? variationUnitPrice(variation) : productUnitPrice(product)
    );

    if (item.expectedPrice !== null && round2(item.expectedPrice) !== unitPrice) {
      errors.push({
        code: "PRICE_CHANGED",
        field: "items",
        productId: item.productId,
        variationId: item.variationId,
        previousPrice: round2(item.expectedPrice),
        currentPrice: unitPrice,
        message: `Le prix de  ${product.productName}  a changé (${unitPrice}).`,
      });
      // The line is still built so the summary shows the new price the
      // customer has to confirm.
    }

    const weight = variation
      ? toNumber(variation.shipping?.weight) || 0
      : toNumber(product.weight) || 0;

    lines.push({
      productId: String(product._id),
      variationId: variation ? String(variation._id) : null,
      name: product.productName,
      sku: variation?.sku || product.sku || "",
      quantity: item.quantity,
      unitPrice,
      lineTotal: round2(unitPrice * item.quantity),
      weight,
      taxable: variation
        ? variation.tax?.status !== "none"
        : product.taxStatus !== "none",
      manageStock: variation ? !!variation.inventory?.manageStock : !!product.manageStock,
      // Carried through for the coupon engine's restriction checks.
      categoryId: product.productCategory ? String(product.productCategory) : null,
      categoryIds: (product.productCategories || []).map(String),
      brandId: product.brand ? String(product.brand) : null,
      tagIds: tagsByProduct.get(String(product._id)) || [],
      shippingClassId: product.shippingClassId ? String(product.shippingClassId) : null,
    });
  }

  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalWeight = round2(
    lines.reduce((sum, line) => sum + line.weight * line.quantity, 0)
  );

  return { lines, errors, subtotal, totalQuantity, totalWeight };
};

// Shape the coupon engine (couponValidationService/couponCalculationService)
// documents for its `cartItems` context.
const toCouponCartItems = (lines) =>
  lines.map((line) => ({
    productId: line.productId,
    categoryId: line.categoryId,
    brandId: line.brandId,
    tagIds: line.tagIds,
    quantity: line.quantity,
    price: line.unitPrice,
  }));

module.exports = {
  buildCartLines,
  toCouponCartItems,
  productUnitPrice,
  variationUnitPrice,
  productStock,
  variationStock,
  isSaleRunning,
  round2,
};
