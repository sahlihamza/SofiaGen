const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const facebookCatalogService = require("./FacebookCatalogService");
const logger = require("../config/logger");

const SAFE_HOOKS = ["save", "updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "findOneAndDelete", "deleteMany"];

let registered = false;

const invalidateFromDoc = (doc) => {
  if (!doc) return;
  const storeId = doc.storeId || (doc.productId && typeof doc.productId === "object" ? doc.productId.storeId : null);
  if (!storeId) return;
  facebookCatalogService.invalidateCache(storeId).catch((err) =>
    logger.warn("[FacebookCatalogHooks] invalidateCache failed", { storeId: String(storeId), error: err.message })
  );
};

const registerProductHooks = () => {
  Product.schema.post("save", function () {
    invalidateFromDoc(this);
  });
  Product.schema.post("updateOne", function () {
    invalidateFromDoc(this.getUpdate && this.getUpdate());
  });
  Product.schema.post("findOneAndUpdate", function () {
    invalidateFromDoc(this.getUpdate && this.getUpdate());
  });
  Product.schema.post("deleteOne", function () {
    const filter = this.getFilter ? this.getFilter() : {};
    if (filter && filter.storeId) invalidateFromDoc(filter);
  });
  Product.schema.post("findOneAndDelete", function () {
    const filter = this.getFilter ? this.getFilter() : {};
    if (filter && filter.storeId) invalidateFromDoc(filter);
  });
};

const registerVariationHooks = () => {
  ProductVariation.schema.post("save", function () {
    invalidateFromDoc(this);
  });
  ProductVariation.schema.post("updateOne", function () {
    invalidateFromDoc(this.getUpdate && this.getUpdate());
  });
  ProductVariation.schema.post("findOneAndUpdate", function () {
    invalidateFromDoc(this.getUpdate && this.getUpdate());
  });
  ProductVariation.schema.post("deleteOne", function () {
    const filter = this.getFilter ? this.getFilter() : {};
    if (filter && filter.productId) invalidateFromDoc({ storeId: undefined, ...filter });
  });
};

const register = () => {
  if (registered) return;
  registerProductHooks();
  registerVariationHooks();
  registered = true;
  logger.info("[FacebookCatalogHooks] registered cache-invalidation hooks");
};

module.exports = { register, SAFE_HOOKS };