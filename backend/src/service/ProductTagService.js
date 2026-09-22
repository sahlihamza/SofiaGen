const ProductTag = require("../models/ProductTag");
const ProductTagRelation = require("../models/ProductTagRelation");

const createProductTag = async (data) => {
  const newTag = new ProductTag(data);
  return newTag.save();
};

const createManyProductTags = async (tags) => {
  return ProductTag.insertMany(tags);
};

const SORT_OPTIONS = {
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  date_asc: { createdAt: 1 },
  date_desc: { createdAt: -1 },
};

const getAllProductTags = async ({ name, status, page, limit, sort, storeId }) => {
  const queryObject = { storeId };

  if (name) {
    queryObject.name = { $regex: `${name}`, $options: "i" };
  }
  if (status) {
    queryObject.status = status;
  }

  const pages = Number(page) || 1;
  const limits = Number(limit) || 0;
  const skip = (pages - 1) * limits;
  const sortObject = SORT_OPTIONS[sort] || { _id: -1 };

  const totalDoc = await ProductTag.countDocuments(queryObject);
  const tags = await ProductTag.find(queryObject)
    .sort(sortObject)
    .skip(skip)
    .limit(limits);

  return { tags, totalDoc, limits, pages };
};

const getProductTagById = async (id, storeId) => {
  return ProductTag.findOne({ _id: id, storeId });
};

const updateProductTag = async (id, data, storeId) => {
  const tag = await ProductTag.findOne({ _id: id, storeId });

  if (!tag) return null;

  if (data.name !== undefined) tag.name = data.name;
  if (data.description !== undefined) tag.description = data.description;
  if (data.status !== undefined) tag.status = data.status;
  if (data.slug !== undefined) tag.slug = data.slug;

  return tag.save();
};

const deleteProductTag = async (id, storeId) => {
  await ProductTagRelation.deleteMany({ tagId: id });
  return ProductTag.deleteOne({ _id: id, storeId });
};

const deleteManyProductTags = async (ids, storeId) => {
  await ProductTagRelation.deleteMany({ tagId: { $in: ids } });
  return ProductTag.deleteMany({ _id: { $in: ids }, storeId });
};

module.exports = {
  createProductTag,
  createManyProductTags,
  getAllProductTags,
  getProductTagById,
  updateProductTag,
  deleteProductTag,
  deleteManyProductTags,
};
