const express = require('express');
const router = express.Router();

const testimonialController = {
  getTestimonials: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getFeaturedTestimonials: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getRandomTestimonials: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getTestimonialStats: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  generateTestimonialAI: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getTestimonialById: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  createTestimonial: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  updateTestimonial: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  deleteTestimonial: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  patchTestimonialStatus: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  bulkDelete: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  bulkStatus: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
};

module.exports = testimonialController;
const TestimonialService = require("../service/TestimonialService");
const { generateTestimonial } = require("../service/aiService");

/**
 * PUBLIC : list all approved testimonials for a store
 */
const getTestimonials = async (req, res) => {
  try {
    const { storeId, category, rating, isApproved = "true", isFeatured, locale, sortBy = "newest", page = 1, limit = 12, search = "" } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId est requis" });
    }

    const result = await TestimonialService.getTestimonials({
      storeId,
      category,
      rating: rating ? Number(rating) : undefined,
      isApproved: isApproved === "true",
      isFeatured: isFeatured === "true" ? true : isFeatured === "false" ? false : undefined,
      locale,
      sortBy,
      page,
      limit,
      search,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFeaturedTestimonials = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { limit = 6 } = req.query;
    const data = await TestimonialService.getFeaturedTestimonials(storeId, Number(limit));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getRandomTestimonials = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { limit = 6 } = req.query;
    const data = await TestimonialService.getRandomTestimonials(storeId, Number(limit));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTestimonialStats = async (req, res) => {
  try {
    const { storeId } = req.params;
    const stats = await TestimonialService.getTestimonialStats(storeId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTestimonialById = async (req, res) => {
  try {
    const testimonial = await TestimonialService.getTestimonialById(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Témoignage introuvable" });
    res.json(testimonial);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : create
 */
const createTestimonial = async (req, res) => {
  try {
    const testimonial = await TestimonialService.createTestimonial(req.body);
    res.status(201).json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : update
 */
const updateTestimonial = async (req, res) => {
  try {
    const testimonial = await TestimonialService.updateTestimonial(req.params.id, req.body);
    if (!testimonial) return res.status(404).json({ message: "Témoignage introuvable" });
    res.json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : delete
 */
const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await TestimonialService.deleteTestimonial(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Témoignage introuvable" });
    res.json({ success: true, message: "Témoignage supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN : approve/unapprove
 */
const patchTestimonialStatus = async (req, res) => {
  try {
    const { isApproved } = req.body;
    if (typeof isApproved !== "boolean") {
      return res.status(400).json({ message: "isApproved boolean required in body" });
    }
    const testimonial = await TestimonialService.updateTestimonial(req.params.id, { isApproved });
    if (!testimonial) return res.status(404).json({ message: "Témoignage introuvable" });
    res.json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids [] requis" });
    }
    const result = await TestimonialService.bulkDelete(ids);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bulkStatus = async (req, res) => {
  try {
    const { ids, isApproved } = req.body;
    if (!Array.isArray(ids) || typeof isApproved !== "boolean") {
      return res.status(400).json({ message: "ids [] et isApproved bool requis" });
    }
    const result = await TestimonialService.bulkUpdateStatus(ids, isApproved);
    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /testimonials/ai/generate
 * Génére un/des témoignage(s) via GLM-5.2 (body: { context, category, count, locale }).
 */
const generateTestimonialAI = async (req, res) => {
  try {
    const { context, category, count = 1, locale } = req.body || {};
    const items = await generateTestimonial({ context, category, count, locale });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTestimonials,
  getFeaturedTestimonials,
  getRandomTestimonials,
  getTestimonialStats,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  patchTestimonialStatus,
  bulkDelete,
  bulkStatus,
  generateTestimonialAI,
};
