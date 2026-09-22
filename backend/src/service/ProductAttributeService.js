const ProductAttribute = require("../models/ProductAttribute");

const linkAttribute = async (data) => {
  const link = new ProductAttribute(data);
  return link.save();
};

// Get every attribute linked to a product, with the attribute details populated.
const getAttributesByProduct = async (productId) => {
  return ProductAttribute.find({ product: productId })
    .populate("attribute")
    .sort({ _id: -1 });
};

// Get every product that uses a given attribute.
const getProductsByAttribute = async (attributeId) => {
  return ProductAttribute.find({ attribute: attributeId })
    .populate("product")
    .sort({ _id: -1 });
};

const getLinkById = async (id) => {
  return ProductAttribute.findById(id).populate("attribute").populate("product");
};

const updateLink = async (id, data) => {
  const link = await ProductAttribute.findById(id);

  if (!link) return null;

  if (data.values !== undefined) link.values = data.values;
  if (data.isVisible !== undefined) link.isVisible = data.isVisible;
  if (data.usedForVariation !== undefined)
    link.usedForVariation = data.usedForVariation;

  return link.save();
};

const deleteLink = async (id) => {
  return ProductAttribute.deleteOne({ _id: id });
};

// Replace the full set of attribute links for a product in one call.
// `attributes` is a list of { attribute, values, isVisible, usedForVariation }.
const setProductAttributes = async (productId, attributes = []) => {
  await ProductAttribute.deleteMany({ product: productId });

  if (!attributes.length) return [];

  const docs = attributes.map((item) => ({
    product: productId,
    attribute: item.attribute,
    values: item.values || [],
    isVisible: item.isVisible !== undefined ? item.isVisible : true,
    usedForVariation:
      item.usedForVariation !== undefined ? item.usedForVariation : false,
  }));

  return ProductAttribute.insertMany(docs);
};

module.exports = {
  linkAttribute,
  getAttributesByProduct,
  getProductsByAttribute,
  getLinkById,
  updateLink,
  deleteLink,
  setProductAttributes,
};
