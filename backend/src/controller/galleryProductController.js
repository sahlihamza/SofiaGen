const GalleryProductService = require("../service/GalleryProductService");
const StoreUsageService = require("../service/StoreUsageService");

// Save many images for a product.
// Accepts { images: [...] } or { productGallery: [...] }.
const addGalleryImages = async (req, res) => {
  try {
    const images = req.body.images || req.body.productGallery || [];
    const gallery = await GalleryProductService.addImages(
      req.params.productId,
      images
    );
    // Attribute image usage to the current store when available
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    if (storeId && Array.isArray(gallery) && gallery.length > 0) {
      try {
        await StoreUsageService.incrementUsage(storeId, "images", gallery.length);
      } catch (err) {
        console.error("Failed to update store image usage:", err.message);
      }
    }
    res.status(201).send({
      data: gallery,
      message: "Images added to product gallery successfully!",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Replace the whole gallery of a product.
const replaceGalleryImages = async (req, res) => {
  try {
    const images = req.body.images || req.body.productGallery || [];
    const productId = req.params.productId;
    const existing = await GalleryProductService.getImagesByProduct(productId);
    const prevCount = Array.isArray(existing) ? existing.length : 0;
    const gallery = await GalleryProductService.replaceImages(
      productId,
      images
    );
    const newCount = Array.isArray(gallery) ? gallery.length : 0;
    const delta = newCount - prevCount;
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    if (storeId && delta !== 0) {
      try {
        if (delta > 0) await StoreUsageService.incrementUsage(storeId, "images", delta);
        else await StoreUsageService.decrementUsage(storeId, "images", Math.abs(delta));
      } catch (err) {
        console.error("Failed to update store image usage on replace:", err.message);
      }
    }
    res.send({
      data: gallery,
      message: "Product gallery updated successfully!",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get all images of a product.
const getGalleryByProduct = async (req, res) => {
  try {
    const gallery = await GalleryProductService.getImagesByProduct(
      req.params.productId
    );
    res.send(gallery);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Delete a single image by its id.
const deleteGalleryImage = async (req, res) => {
  try {
    const result = await GalleryProductService.deleteImage(req.params.id);
    // Only decrement when a document was actually deleted
    const deleted = result && (result.deletedCount === 1 || result.n === 1 || result.ok);
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    if (deleted && storeId) {
      try {
        await StoreUsageService.decrementUsage(storeId, "images", 1);
      } catch (err) {
        console.error("Failed to decrement store image usage:", err.message);
      }
    }
    res.send({ message: "Image deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Delete the whole gallery of a product.
const deleteGalleryByProduct = async (req, res) => {
  try {
    const existing = await GalleryProductService.getImagesByProduct(
      req.params.productId
    );
    const count = Array.isArray(existing) ? existing.length : 0;
    await GalleryProductService.deleteImagesByProduct(req.params.productId);
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    if (storeId && count > 0) {
      try {
        await StoreUsageService.decrementUsage(storeId, "images", count);
      } catch (err) {
        console.error("Failed to decrement store image usage on bulk delete:", err.message);
      }
    }
    res.send({ message: "Product gallery deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  addGalleryImages,
  replaceGalleryImages,
  getGalleryByProduct,
  deleteGalleryImage,
  deleteGalleryByProduct,
};
