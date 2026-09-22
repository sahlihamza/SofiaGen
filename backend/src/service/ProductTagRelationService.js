const ProductTagRelation = require("../models/ProductTagRelation");

const linkTag = async (data) => {
  const link = new ProductTagRelation(data);
  return link.save();
};

// Get every tag linked to a product, with the tag details populated.
const getTagsByProduct = async (productId) => {
  return ProductTagRelation.find({ productId })
    .populate("tagId")
    .sort({ _id: -1 });
};

// Get every product that uses a given tag.
const getProductsByTag = async (tagId) => {
  return ProductTagRelation.find({ tagId })
    .populate("productId")
    .sort({ _id: -1 });
};

const getLinkById = async (id) => {
  return ProductTagRelation.findById(id).populate("tagId").populate("productId");
};

const deleteLink = async (id) => {
  return ProductTagRelation.deleteOne({ _id: id });
};

// Replace the full set of tag links for a product in one call.
// `tags` is a list of tag ids.
const setProductTags = async (productId, tags = []) => {
  await ProductTagRelation.deleteMany({ productId });

  if (!tags.length) return [];

  const docs = tags.map((tagId) => ({
    productId,
    tagId,
  }));

  return ProductTagRelation.insertMany(docs);
};

module.exports = {
  linkTag,
  getTagsByProduct,
  getProductsByTag,
  getLinkById,
  deleteLink,
  setProductTags,
};
