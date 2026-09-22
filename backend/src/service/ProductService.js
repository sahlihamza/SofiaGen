const mongoose = require("mongoose");
const Product = require("../models/Product");
const GalleryProductService = require("./GalleryProductService");
const StockMovementService = require("./StockMovementService");
const Notification = require("../models/Notification");
const { emitEvent } = require("../lib/eventBus");
const SoftLimitService = require("./SoftLimitService");
const StoreUsageService = require("./StoreUsageService");

// Query params come from the URL, so an id can be any string. Filtering on a
// malformed one would make Mongoose throw a CastError instead of returning
// nothing.
const isObjectId = (value) =>
  Boolean(value) && mongoose.Types.ObjectId.isValid(value);

// A product carries a list of category ids. The legacy single `productCategory`
// is derived from that list so older readers keep working; when only the legacy
// field is supplied (CSV imports, older clients) the list is derived from it.
const normalizeCategories = (data) => {
  const list = Array.isArray(data.productCategories)
    ? [...new Set(data.productCategories.filter(Boolean).map(String))]
    : data.productCategory
      ? [String(data.productCategory)]
      : [];

  return { productCategories: list, productCategory: list[0] || null };
};

// Matching a category must find products that reference it through either
// field, since documents saved before multi-category only have the legacy one.
const categoryFilter = (id) => ({
  $or: [{ productCategories: id }, { productCategory: id }],
});

const createProduct = async (data) => {
  if (data.storeId) {
    const quotaCheck = await SoftLimitService.checkQuotaAvailable(data.storeId, "products", 1);
    if (!quotaCheck.allowed) {
      const error = new Error(`Quota de produits atteint pour cette boutique (${quotaCheck.used}/${quotaCheck.limit})`);
      error.code = "QUOTA_EXCEEDED";
      throw error;
    }
  }

  const newProduct = new Product({ ...data, ...normalizeCategories(data) });
  const savedProduct = await newProduct.save();

  // Save the gallery images (if any) into the GalleryProduct collection.
  await GalleryProductService.replaceImages(
    savedProduct._id,
    data.productGallery,
    data.productImage
  );

  if (savedProduct.storeId) {
    emitEvent("product.created", {
      storeId: savedProduct.storeId,
      entityId: savedProduct._id,
      metadata: { productName: savedProduct.productName },
      actionUrl: `/product/${savedProduct._id}`,
    });
    // Non-fatal: usage tracking must never roll back a successful create.
    StoreUsageService.incrementUsage(savedProduct.storeId, "products", 1).catch(() => {});
  }

  return getProductById(savedProduct._id);
};

// A row only carries the columns the file actually filled in, so an update must
// touch those keys and nothing else. Categories are the exception: they are only
// recomputed when the row says something about them, otherwise an import of a
// file without a category column would clear every product's categories.
const buildImportPayload = (row) => {
  const { productGallery, productImage, ...fields } = row;
  const mentionsCategory =
    Array.isArray(row.productCategories) || row.productCategory != null;

  if (!mentionsCategory) {
    delete fields.productCategories;
    delete fields.productCategory;
    return fields;
  }
  return { ...fields, ...normalizeCategories(row) };
};

// Record the stock delta an import applied, so the movement history explains
// where a quantity change came from.
const logImportStockMovement = async (product, nextQuantity, createdBy) => {
  const previous = Number(product.stockQuantity) || 0;
  const current = Number(nextQuantity) || 0;
  if (previous === current) return;

  await StockMovementService.createStockMovement({
    product: product._id,
    quantity: current - previous,
    previousQuantity: previous,
    currentQuantity: current,
    reference: "csv-import",
    note: "Stock set by product import",
    createdBy: createdBy || undefined,
  });
};

// Import rows into the catalog, one product per row.
//
// Rows are matched on SKU: a row whose SKU already exists updates that product,
// anything else is created. Nothing is ever deleted  this used to wipe the
// whole Product and GalleryProduct collections before inserting, which turned
// any import into a catalog replacement.
//
// One bad row never aborts the run: each is caught on its own and reported, so
// the caller gets a full picture of what landed and what did not.
const importProducts = async (rows, { createdBy, storeId } = {}) => {
  if (!Array.isArray(rows)) {
    throw new Error("Import payload must be an array of product rows.");
  }

  const report = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    results: [],
  };

  const seenSkus = new Map();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || {};
    const line = i + 2;
    const sku = typeof row.sku === "string" ? row.sku.trim() : "";
    const entry = { line, sku, productName: row.productName || "" };

    const skip = (message) => {
      report.skipped += 1;
      report.results.push({ ...entry, action: "skipped", message });
    };

    try {
      if (!row.productName || !String(row.productName).trim()) {
        skip("productName is required.");
        continue;
      }

      if (sku && seenSkus.has(sku)) {
        skip(`SKU "${sku}" already appears on line ${seenSkus.get(sku)}.`);
        continue;
      }

      const matches = sku ? await Product.find({ sku }).limit(2) : [];
      if (matches.length > 1) {
        skip(`SKU "${sku}" matches ${matches.length} existing products.`);
        continue;
      }

      const payload = buildImportPayload(row);
      const existing = matches[0];
      let product;

      if (existing) {
        if (row.stockQuantity != null) {
          await logImportStockMovement(existing, row.stockQuantity, createdBy);
        }
        const updatePayload = { ...payload };
        if (storeId && !existing.storeId) {
          updatePayload.storeId = storeId;
        }
        product = await Product.findByIdAndUpdate(
          existing._id,
          { $set: updatePayload },
          { new: true, runValidators: true }
        );
      } else {
        product = await new Product({
          ...payload,
          ...normalizeCategories(payload),
          storeId: storeId || payload.storeId || null,
        }).save();
        if (row.stockQuantity != null) {
          await logImportStockMovement(
            { _id: product._id, stockQuantity: 0 },
            row.stockQuantity,
            createdBy
          );
        }
      }

      if (row.productImage || (row.productGallery || []).length) {
        await GalleryProductService.replaceImages(
          product._id,
          row.productGallery,
          row.productImage
        );
      }

      if (existing) report.updated += 1;
      else report.created += 1;

      if (sku) seenSkus.set(sku, line);
      report.results.push({
        ...entry,
        action: existing ? "updated" : "created",
        productId: product._id,
      });
    } catch (err) {
      skip(err.message);
    }
  }

  return report;
};

const getShowingProducts = async ({ storeId } = {}) => {
  const queryObject = { status: "published" };
  if (storeId) {
    queryObject.storeId = storeId;
  }
  return Product.find(queryObject).sort({ _id: -1 });
};

const getAllProducts = async ({ productName, category, price, page, limit, storeId }) => {
  const queryObject = {};
  let sortObject = {};

  if (storeId) {
    queryObject.storeId = storeId;
  }

  if (productName) {
    queryObject.productName = { $regex: `${productName}`, $options: "i" };
  }

  if (category) {
    Object.assign(queryObject, categoryFilter(category));
  }

  if (price === "low") {
    sortObject = { regularPrice: 1 };
  } else if (price === "high") {
    sortObject = { regularPrice: -1 };
  } else if (price === "published") {
    queryObject.status = "published";
  } else if (price === "draft") {
    queryObject.status = "draft";
  } else if (price === "archived") {
    queryObject.status = "archived";
  } else if (price === "date-added-asc") {
    sortObject.createdAt = 1;
  } else if (price === "date-added-desc") {
    sortObject.createdAt = -1;
  } else if (price === "date-updated-asc") {
    sortObject.updatedAt = 1;
  } else if (price === "date-updated-desc") {
    sortObject.updatedAt = -1;
  } else {
    sortObject = { _id: -1 };
  }

  const pages = Number(page);
  const limits = Number(limit);
  const skip = (pages - 1) * limits;

  const totalDoc = await Product.countDocuments(queryObject);
  const products = await Product.find(queryObject)
    .populate("productCategory", "name")
    .populate("productCategories", "name slug parentId")
    .populate("brand", "name logo")
    .populate("productGallery")
    .sort(sortObject)
    .skip(skip)
    .limit(limits);

  return { products, totalDoc, limits, pages };
};

const searchProducts = async ({ productName, productCategory, status, storeId }) => {
  const queryObject = {};

  if (storeId) {
    queryObject.storeId = storeId;
  }

  // partial, case-insensitive match on the product name
  if (productName) {
    queryObject.productName = { $regex: `${productName}`, $options: "i" };
  }

  // exact match on the category ObjectId (either the list or the legacy field)
  if (productCategory) {
    Object.assign(queryObject, categoryFilter(productCategory));
  }

  // exact match on the status (draft | published | archived)
  if (status) {
    queryObject.status = status;
  }

  return Product.find(queryObject)
    .populate("productCategory", "name")
    .populate("productCategories", "name slug parentId")
    .populate("brand", "name logo")
    .sort({ _id: -1 });
};

const getProductById = async (id, storeId) => {
  const query = { _id: id };
  if (storeId) query.storeId = storeId;
  return Product.findOne(query)
    .populate("productCategory", "name")
    .populate("productCategories", "name slug parentId")
    .populate("brand", "name logo")
    .populate("productGallery")
    .populate({
      path: "productAttributes",
      populate: { path: "attribute", select: "name values isVisible usedForVariation" },
    })
    .populate({
      path: "productTags",
      populate: { path: "tagId", select: "name color" },
    });
};

const updateProduct = async (id, data, storeId) => {
  const query = { _id: id };
  if (storeId) query.storeId = storeId;
  const product = await Product.findOne(query);

  if (!product) return null;

  const previousQuantity = Number(product.stockQuantity) || 0;

  product.productName = data.productName;
  product.description = data.description;
  product.shortDescription = data.shortDescription;
  const categories = normalizeCategories(data);
  product.productCategories = categories.productCategories;
  product.productCategory = categories.productCategory;
  product.brand = data.brand;
  product.productType = data.productType;
  product.taxStatus = data.taxStatus;
  product.taxClass = data.taxClass;
  // Tags now live in the ProductTagRelation junction collection.
  // Manage them via /api/product-tag-relations (ProductTagRelationService).
  product.status = data.status;
  product.visibility = data.visibility;
  product.regularPrice = data.regularPrice;
  product.salePrice = data.salePrice;
  product.saleStart = data.saleStart;
  product.saleEnd = data.saleEnd;
  product.virtual = data.virtual;
  product.downloadable = data.downloadable;
  product.publishDate = data.publishDate;
  product.sku = data.sku;
  product.manageStock = data.manageStock;
  product.stockQuantity = data.stockQuantity;
  product.stockStatus = data.stockStatus;
  product.allowBackorders = data.allowBackorders;
  product.lowStockThreshold = data.lowStockThreshold;
  product.soldIndividually = data.soldIndividually;
  // Attributes now live in the ProductAttribute junction collection.
  // Manage them via /api/product-attributes (ProductAttributeService).
  product.upSells = data.upSells;
  product.crossSells = data.crossSells;
  product.weight = data.weight;
  product.dimensions = data.dimensions;
  product.shippingClassId = data.shippingClassId || null;

  product.menuOrder = data.menuOrder;
  product.purchaseNote = data.purchaseNote;
  product.enableReviews = data.enableReviews;
  await product.save();

  const newQuantity = Number(product.stockQuantity) || 0;
  const threshold = Number(product.lowStockThreshold) || 0;
  if (newQuantity > previousQuantity && (newQuantity > threshold || !product.manageStock)) {
    await Notification.updateMany(
      {
        entityType: "product",
        entityId: product._id,
        type: { $in: ["product.low_stock", "product.out_of_stock"] },
        status: "unread",
      },
      { $set: { status: "archived" } }
    ).catch(() => {});
  }

  if (product.storeId) {
    emitEvent("product.updated", {
      storeId: product.storeId,
      entityId: product._id,
      metadata: { productName: product.productName },
      actionUrl: `/product/${product._id}`,
    });
  }

  // Sync the gallery: replace when the client sent a gallery or when the main image changed.
  if (data.productGallery !== undefined || data.productImage !== undefined) {
    const galleryImages =
      data.productGallery !== undefined
        ? data.productGallery
        : (await GalleryProductService.getImagesByProduct(product._id)).map(
            ({ image, order }) => ({ image, order })
          );
    const primaryImage = data.productImage;

    await GalleryProductService.replaceImages(
      product._id,
      galleryImages,
      primaryImage
    );
  }

  return getProductById(product._id, storeId);
};

const updateManyProducts = async (ids, body, storeId) => {
  const updatedData = {};
  for (const key of Object.keys(body)) {
    if (key === "shippingClassId") continue;

    if (
      body[key] != null &&
      body[key] !== "[]" &&
      Object.entries(body[key]).length > 0 &&
      body[key] !== ids
    ) {
      updatedData[key] = body[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "shippingClassId")) {
    updatedData.shippingClassId = body.shippingClassId || null;
  }

  const query = { _id: { $in: ids } };
  if (storeId) query.storeId = storeId;

  return Product.updateMany(
    query,
    { $set: updatedData },
    { multi: true }
  );
};

const updateStatus = async (id, status, storeId) => {
  const query = { _id: id };
  if (storeId) query.storeId = storeId;
  return Product.updateOne(query, { $set: { status } });
};

const deleteProduct = async (id, storeId) => {
  await GalleryProductService.deleteImagesByProduct(id);
  const query = { _id: id };
  if (storeId) query.storeId = storeId;
  return Product.deleteOne(query);
};

const deleteManyProducts = async (ids, storeId) => {
  await GalleryProductService.deleteImagesByProducts(ids);
  const query = { _id: ids };
  if (storeId) query.storeId = storeId;
  return Product.deleteMany(query);
};

const getShowingStoreProducts = async ({ productName, title, category, slug, storeId }) => {
  const queryObject = { status: "published", visibility: "public" };

  if (storeId) queryObject.storeId = storeId;

  if (storeId) queryObject.storeId = storeId;

  // The store searches with `title`, the admin with `productName`.
  const searchedName = title || productName;

  if (searchedName) {
    queryObject.productName = { $regex: `${searchedName}`, $options: "i" };
  }
  if (isObjectId(category)) {
    Object.assign(queryObject, categoryFilter(category));
  }
  // Products carry no slug of their own, so the store addresses a single
  // product by its id.
  if (isObjectId(slug)) {
    queryObject._id = slug;
  }

  // Anything narrowing the query means the caller wants a product list rather
  // than the home page selections.
  const isFiltered = Boolean(searchedName || queryObject.$or || queryObject._id);

  let products = [];
  let popularProducts = [];
  let discountedProducts = [];
  let relatedProducts = [];

  if (isFiltered) {
    products = await Product.find(queryObject)
      .sort({ _id: -1 })
      .limit(100)
      .populate("productGallery");

    // Asking for one product means a product page, which also shows the other
    // products of its categories.
    if (queryObject._id && products.length > 0) {
      const [product] = products;
      const categories = product.productCategories?.length
        ? product.productCategories
        : [product.productCategory].filter(Boolean);

      if (categories.length > 0) {
        relatedProducts = await Product.find({
          status: "published",
          visibility: "public",
          storeId,
          _id: { $ne: product._id },
          $or: [
            { productCategories: { $in: categories } },
            { productCategory: { $in: categories } },
          ],
        })
          .sort({ _id: -1 })
          .limit(20)
          .populate("productGallery");
      }
    }
  } else {
    popularProducts = await Product.find({
      status: "published",
      visibility: "public",
      ...(storeId ? { storeId } : {})
    })
      .sort({ publishDate: -1 })
      .limit(20)
      .populate("productGallery");

    // A sale only counts as running inside its window. Both bounds are
    // optional, and `{ field: null }` also matches documents where the field
    // was never set, so an unscheduled sale is always on. The comparison is
    // against midnight rather than the current instant because the stored
    // values are calendar days and both bounds are inclusive  otherwise a
    // sale would stop counting at 00:01 on its own last day.
    const today = new Date(new Date().toISOString().substring(0, 10));

    discountedProducts = await Product.find({
      status: "published",
      visibility: "public",
      ...(storeId ? { storeId } : {}),
      salePrice: { $gt: 0 },
      $and: [
        { $or: [{ saleStart: null }, { saleStart: { $lte: today } }] },
        { $or: [{ saleEnd: null }, { saleEnd: { $gte: today } }] },
      ],
    })
      .sort({ _id: -1 })
      .limit(20)
      .populate("productGallery");
  }

  return { products, popularProducts, discountedProducts, relatedProducts };
};

const getProductsByIds = async (ids, storeId) => {
  if (!ids || !ids.length) return [];
  const query = { _id: { $in: ids } };
  if (storeId) query.storeId = storeId;
  return Product.find(query)
    .populate("productCategory", "name")
    .populate("brand", "name logo")
    .populate("productGallery")
    .lean();
};

const getRelatedProducts = async (productId, limit = 4, storeId) => {
  const current = await Product.findById(productId).select("productCategories productCategory storeId").lean();
  if (!current) return [];
  const matchStage = {};
  if (storeId) matchStage.storeId = storeId;
  else matchStage.storeId = current.storeId;
  const categoryIds = current.productCategories || (current.productCategory ? [current.productCategory] : []);
  if (!categoryIds.length) return [];
  return Product.find({
    ...matchStage,
    _id: { $ne: productId },
    $or: [{ productCategories: { $in: categoryIds } }, { productCategory: { $in: categoryIds } }],
  })
    .populate("productCategory", "name")
    .populate("brand", "name logo")
    .populate("productGallery")
    .limit(limit)
    .lean();
};

module.exports = {
  createProduct,
  importProducts,
  buildImportPayload, // exported for tests
  getShowingProducts,
  getAllProducts,
  getProductById,
  getProductsByIds,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  searchProducts,
  getShowingStoreProducts,
};
