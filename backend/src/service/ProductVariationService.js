const ProductVariation = require("../models/ProductVariation");

const createVariation = async (data) => {
  const variation = new ProductVariation(data);
  return variation.save();
};

// Get every variation of a product, with the attribute definitions populated.
const getVariationsByProduct = async (productId) => {
  return ProductVariation.find({ productId })
    .populate("attributes.attributeId")
    .sort({ _id: -1 });
};

const getVariationById = async (id) => {
  return ProductVariation.findById(id)
    .populate("productId")
    .populate("attributes.attributeId");
};

const updateVariation = async (id, data) => {
  const variation = await ProductVariation.findById(id);

  if (!variation) return null;

  if (data.sku !== undefined) variation.sku = data.sku;
  if (data.barcode !== undefined) variation.barcode = data.barcode;
  if (data.enabled !== undefined) variation.enabled = data.enabled;
  if (data.attributes !== undefined) variation.attributes = data.attributes;
  if (data.pricing !== undefined) variation.pricing = data.pricing;
  if (data.inventory !== undefined) variation.inventory = data.inventory;
  if (data.shipping !== undefined) variation.shipping = data.shipping;
  if (data.tax !== undefined) variation.tax = data.tax;
  if (data.downloads !== undefined) variation.downloads = data.downloads;
  if (data.images !== undefined) variation.images = data.images;

  return variation.save();
};

const deleteVariation = async (id) => {
  return ProductVariation.deleteOne({ _id: id });
};

const deleteVariationsByProduct = async (productId) => {
  return ProductVariation.deleteMany({ productId });
};

// Replace the full set of variations for a product in one call.
// `variations` is a list of variation payloads (without productId).
const setProductVariations = async (productId, variations = []) => {
  await ProductVariation.deleteMany({ productId });

  if (!variations.length) return [];

  const docs = variations.map((item) => ({ ...item, productId }));

  return ProductVariation.insertMany(docs);
};

module.exports = {
  createVariation,
  getVariationsByProduct,
  getVariationById,
  updateVariation,
  deleteVariation,
  deleteVariationsByProduct,
  setProductVariations,
};
