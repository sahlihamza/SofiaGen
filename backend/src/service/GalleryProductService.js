const GalleryProduct = require("../models/GalleryProduct");

// Pure builder: produces ordered gallery docs from a primary image and a list of
// secondary items (plain URLs or { image, order } objects). The primary image is
// always placed first with order 0; secondaries keep their explicit order or fall
// back to index + 1. No dedup, no isPrimary flag  that is the caller's concern.
const buildBaseDocs = (productId, primaryImage, items = []) => {
  const docs = [];
  if (primaryImage) docs.push({ product: productId, image: primaryImage, order: 0 });
  const list = Array.isArray(items) ? items : [items];
  list.forEach((item, index) => {
    const image = typeof item === "string" ? item : item && item.image;
    if (!image) return;
    const order =
      item && typeof item === "object" && item.order != null
        ? item.order
        : index + 1;
    docs.push({ product: productId, image, order });
  });
  return docs;
};

// Accept either plain image URLs ("a.png") or objects ({ image, order }).
// Dedupes by image, preserves order, and flags the primary image (isPrimary).
const normalize = (productId, items = [], primaryImage) => {
  const docs = buildBaseDocs(productId, primaryImage, items);
  const seenImages = new Set();
  const result = [];
  docs.forEach((doc) => {
    if (!doc.image || seenImages.has(doc.image)) return;
    seenImages.add(doc.image);
    result.push({ ...doc, isPrimary: doc.image === primaryImage });
  });
  return result;
};
const buildGalleryDocs = (productId, productImage, galleryImages = []) =>
  normalize(productId, galleryImages, productImage);

// Save many images for a product.
const addImages = async (productId, images = [], primaryImage) => {
  const docs = normalize(productId, images, primaryImage);
  if (docs.length === 0) return [];
  return GalleryProduct.insertMany(docs);
};

// Replace the whole gallery of a product with the provided list.
const replaceImages = async (productId, images = [], primaryImage) => {
  await GalleryProduct.deleteMany({ product: productId });
  return addImages(productId, images, primaryImage);
};

const getImagesByProduct = async (productId) => {
  return GalleryProduct.find({ product: productId }).sort({ order: 1, _id: 1 });
};

const deleteImage = async (id) => {
  return GalleryProduct.deleteOne({ _id: id });
};

const deleteImagesByProduct = async (productId) => {
  return GalleryProduct.deleteMany({ product: productId });
};

// Remove galleries of many products at once (used when deleting many products).
const deleteImagesByProducts = async (productIds) => {
  return GalleryProduct.deleteMany({ product: { $in: productIds } });
};

module.exports = {
  buildGalleryDocs,
  addImages,
  replaceImages,
  getImagesByProduct,
  deleteImage,
  deleteImagesByProduct,
  deleteImagesByProducts,
};
