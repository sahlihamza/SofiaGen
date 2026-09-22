const Attribute = require("../models/Attribute");
const ProductAttribute = require("../models/ProductAttribute");
const AttributeValue = require("../models/AttributeValue");

const createAttribute = async (data) => {
  const newAttribute = new Attribute(data);
  return newAttribute.save();
};

const createManyAttributes = async (attributes) => {
  return Attribute.insertMany(attributes);
};

const getAllAttributes = async ({ name, isVariation, page, limit, storeId }) => {
  const queryObject = { storeId };

  if (name) {
    queryObject.name = { $regex: `${name}`, $options: "i" };
  }
  if (isVariation !== undefined && isVariation !== "") {
    queryObject.isVariation = isVariation === "true" || isVariation === true;
  }

  const pages = Number(page) || 1;
  const limits = Number(limit) || 0;
  const skip = (pages - 1) * limits;

  const totalDoc = await Attribute.countDocuments(queryObject);
  const attributes = await Attribute.find(queryObject)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limits);

  return { attributes, totalDoc, limits, pages };
};

const getShowingAttributes = async (storeId) => {
  return Attribute.find({ status: "active", storeId })
    .sort({ sortOrder: 1, _id: -1 })
    .populate("values");
};

const getAttributeById = async (id, storeId) => {
  return Attribute.findOne({ _id: id, storeId });
};

const updateAttribute = async (id, data, storeId) => {
  const attribute = await Attribute.findOne({ _id: id, storeId });

  if (!attribute) return null;

  if (data.name !== undefined) attribute.name = data.name;
  if (data.description !== undefined) attribute.description = data.description;
  if (data.type !== undefined) attribute.type = data.type;
  if (data.displayType !== undefined) attribute.displayType = data.displayType;
  if (data.isVariation !== undefined) attribute.isVariation = data.isVariation;
  if (data.status !== undefined) attribute.status = data.status;
  if (data.slug !== undefined) attribute.slug = data.slug;

  return attribute.save();
};

const deleteAttribute = async (id, storeId) => {
  await ProductAttribute.deleteMany({ attribute: id });
  await AttributeValue.deleteMany({ attributeId: id });
  return Attribute.deleteOne({ _id: id, storeId });
};

const deleteManyAttributes = async (ids, storeId) => {
  await ProductAttribute.deleteMany({ attribute: { $in: ids } });
  await AttributeValue.deleteMany({ attributeId: { $in: ids } });
  return Attribute.deleteMany({ _id: { $in: ids }, storeId });
};

module.exports = {
  createAttribute,
  createManyAttributes,
  getAllAttributes,
  getShowingAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  deleteManyAttributes,
};
