const express = require('express');
const router = express.Router();

const galleryController = {
  getGalleries: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getGalleryById: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getGalleriesByCategory: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  createGallery: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  updateGallery: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  deleteGallery: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  addImage: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  removeImage: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  reorderImages: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
};

module.exports = galleryController;
const GalleryService = require("../service/GalleryService");

/**
 * PUBLIC : list galleries with filters
 */
const getGalleries = async (req, res) => {
  try {
    const { storeId, category, tag, layout, sortBy = "newest", page = 1, limit = 12 } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId est requis" });
    }

    const result = await GalleryService.getPublicGalleries({
      storeId,
      category,
      tag,
      layout,
      sortBy,
      page,
      limit,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUBLIC : single gallery by id
 */
const getGalleryById = async (req, res) => {
  try {
    const gallery = await GalleryService.getGalleryById(req.params.id);
    if (!gallery) {
      return res.status(404).json({ message: "Galerie introuvable" });
    }
    if (!gallery.isActive) {
      return res.status(404).json({ message: "Galerie indisponible" });
    }
    res.json(gallery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUBLIC : galleries by category
 */
const getGalleriesByCategory = async (req, res) => {
  try {
    const { storeId, category } = req.params;
    const { limit = 12 } = req.query;
    const data = await GalleryService.getGalleryByCategory(storeId, category, limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : create gallery
 */
const createGallery = async (req, res) => {
  try {
    const gallery = await GalleryService.createGallery(req.body);
    res.status(201).json({ success: true, data: gallery });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : update gallery
 */
const updateGallery = async (req, res) => {
  try {
    const gallery = await GalleryService.updateGallery(req.params.id, req.body);
    if (!gallery) {
      return res.status(404).json({ message: "Galerie introuvable" });
    }
    res.json({ success: true, data: gallery });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : delete gallery
 */
const deleteGallery = async (req, res) => {
  try {
    const gallery = await GalleryService.deleteGallery(req.params.id);
    if (!gallery) {
      return res.status(404).json({ message: "Galerie introuvable" });
    }
    res.json({ success: true, message: "Galerie supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : add image to gallery
 */
const addImage = async (req, res) => {
  try {
    const { galleryId } = req.params;
    const imageData = { ...req.body, _id: new (require("mongoose").Schema.Types.ObjectId)() };
    const gallery = await GalleryService.addImage(galleryId, imageData);
    res.json({ success: true, data: gallery });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : remove image from gallery
 */
const removeImage = async (req, res) => {
  try {
    const { galleryId, imageId } = req.params;
    const gallery = await GalleryService.removeImage(galleryId, imageId);
    res.json({ success: true, data: gallery });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : reorder images
 */
const reorderImages = async (req, res) => {
  try {
    const { galleryId } = req.params;
    const { imageIds } = req.body;
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ message: "imageIds [] requis" });
    }
    const gallery = await GalleryService.reorderImages(galleryId, imageIds);
    if (!gallery) {
      return res.status(404).json({ message: "Galerie introuvable" });
    }
    res.json({ success: true, data: gallery });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getGalleries,
  getGalleryById,
  getGalleriesByCategory,
  createGallery,
  updateGallery,
  deleteGallery,
  addImage,
  removeImage,
  reorderImages,
};
