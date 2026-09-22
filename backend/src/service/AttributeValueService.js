const AttributeValue = require("../models/AttributeValue");

const createValue = async (data) => {
  const value = new AttributeValue(data);
  return value.save();
};

const createManyValues = async (values) => {
  return AttributeValue.insertMany(values);
};

// Get every value that belongs to a given attribute, ordered for display.
const getValuesByAttribute = async (attributeId) => {
  return AttributeValue.find({ attributeId }).sort({ sortOrder: 1, _id: 1 });
};

const getValueById = async (id) => {
  return AttributeValue.findById(id).populate("attributeId");
};

const updateValue = async (id, data) => {
  const value = await AttributeValue.findById(id);

  if (!value) return null;

  if (data.label !== undefined) value.label = data.label;
  if (data.value !== undefined) value.value = data.value;
  if (data.color !== undefined) value.color = data.color;
  if (data.image !== undefined) value.image = data.image;
  if (data.sortOrder !== undefined) value.sortOrder = data.sortOrder;
  // Allow an explicit slug override, otherwise the pre-validate hook keeps it
  // in sync with the label.
  if (data.slug !== undefined) value.slug = data.slug;

  return value.save();
};

const deleteValue = async (id) => {
  return AttributeValue.deleteOne({ _id: id });
};

const deleteValuesByAttribute = async (attributeId) => {
  return AttributeValue.deleteMany({ attributeId });
};

// Replace the full set of values for an attribute in one call.
// `values` is a list of value payloads (without attributeId).
const setAttributeValues = async (attributeId, values = []) => {
  await AttributeValue.deleteMany({ attributeId });

  if (!values.length) return [];

  const docs = values.map((item) => ({ ...item, attributeId }));

  return AttributeValue.insertMany(docs);
};

module.exports = {
  createValue,
  createManyValues,
  getValuesByAttribute,
  getValueById,
  updateValue,
  deleteValue,
  deleteValuesByAttribute,
  setAttributeValues,
};
