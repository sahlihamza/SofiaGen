const productReviewService = require("../service/productReviewService");
const ProductReview = require("../models/ProductReview");
const { REPORT_REASONS } = require("../models/ReviewReport");

// SO-10: none of the by-id review actions below (approve, reject, spam,
// delete, reply, media, reports...) ever checked the review's own storeId
// against the caller's  a staff member with review-management rights on
// their own store could act on any other store's review just by knowing its
// id. This is the shared guard; every handler that takes :id now calls it
// before touching the review.
const assertReviewInStore = async (req, res, id) => {
  const review = await ProductReview.findById(id).select("storeId");
  if (!review) {
    res.status(404).json({ success: false, message: "Avis introuvable" });
    return null;
  }
  if (!req.user?.isSuperAdmin && String(review.storeId) !== String(req.currentStoreId)) {
    res.status(403).json({ success: false, message: "Accès refusé  ce store" });
    return null;
  }
  return review;
};

const getProductReviews = async (req, res) => {
  try {
    const { product, status, rating, verifiedPurchase, search, page, limit, sort } = req.query;
    const { reviews, totalDoc, limits, pages } = await productReviewService.getAllReviews({
      storeId: req.currentStoreId,
      product,
      status,
      rating,
      verifiedPurchase,
      search,
      page,
      limit,
      sort,
    });

    return res.status(200).json({
      success: true,
      data: reviews,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getProductReviewById = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const review = await productReviewService.getReviewById(req.params.id);
    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addProductReview = async (req, res) => {
  try {
    const review = await productReviewService.addReview(req.currentStoreId, req.body);
    return res.status(201).json({ success: true, message: "Avis ajouté avec succès", data: review });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    if (["PRODUCT_NOT_FOUND", "PRODUCT_NOT_PUBLISHED", "REVIEWS_DISABLED"].includes(error.code)) {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updateProductReview = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const review = await productReviewService.updateReview(req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Avis mis à jour avec succès", data: review });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteProductReview = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    await productReviewService.deleteReview(req.params.id);
    return res.status(200).json({ success: true, message: "Avis supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteManyProductReviews = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!req.user?.isSuperAdmin) {
      const foreign = await ProductReview.exists({
        _id: { $in: ids },
        storeId: { $ne: req.currentStoreId },
      });
      if (foreign) {
        return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
      }
    }
    await productReviewService.deleteManyReviews(ids);
    return res.status(200).json({ success: true, message: "Avis supprimés avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const approveProductReview = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const review = await productReviewService.setStatus(req.params.id, "approved");
    return res.status(200).json({ success: true, message: "Avis approuvé avec succès", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const rejectProductReview = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const review = await productReviewService.setStatus(req.params.id, "rejected");
    return res.status(200).json({ success: true, message: "Avis rejeté avec succès", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const markAsSpamProductReview = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const review = await productReviewService.setStatus(req.params.id, "spam");
    return res.status(200).json({ success: true, message: "Avis marqué comme spam", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const replyToReview = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(422).json({ success: false, message: "Le message est obligatoire" });
    }

    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const reply = await productReviewService.setReply(req.params.id, req.user._id, message);
    return res.status(200).json({ success: true, message: "Réponse enregistrée avec succès", data: reply });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteReviewReply = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    await productReviewService.deleteReply(req.params.id);
    return res.status(200).json({ success: true, message: "Réponse supprimée avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const setReviewMedia = async (req, res) => {
  try {
    const { media } = req.body;
    if (!Array.isArray(media)) {
      return res.status(422).json({ success: false, message: "La liste des médias est obligatoire" });
    }

    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const created = await productReviewService.setReviewMedia(req.params.id, media);
    return res.status(200).json({ success: true, message: "Médias mis à jour avec succès", data: created });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteReviewMediaItem = async (req, res) => {
  try {
    const ReviewImage = require("../models/ReviewImage");
    const existing = await ReviewImage.findById(req.params.mediaId).select("reviewId");
    if (!existing) {
      return res.status(404).json({ success: false, message: "Média introuvable" });
    }
    if (!(await assertReviewInStore(req, res, existing.reviewId))) return;

    const media = await productReviewService.deleteMediaItem(req.params.mediaId);
    return res.status(200).json({ success: true, message: "Média supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const voteOnReview = async (req, res) => {
  try {
    const { vote, voterKey, customerId } = req.body;

    if (!["up", "down"].includes(vote)) {
      return res.status(422).json({ success: false, message: "Le vote doit être 'up' ou 'down'" });
    }
    const key = String(voterKey || "").trim();
    if (!key || key.length > 100) {
      return res.status(422).json({ success: false, message: "Identifiant de votant invalide" });
    }

    const counts = await productReviewService.castVote(req.params.id, {
      voterKey: key,
      vote,
      customerId,
    });
    if (!counts) {
      return res.status(404).json({ success: false, message: "Avis introuvable" });
    }
    return res.status(200).json({ success: true, message: "Vote enregistré", data: counts });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === 11000) {
      const counts = await productReviewService.recountVotes(req.params.id);
      return res.status(200).json({ success: true, message: "Vote enregistré", data: counts });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const reportOnReview = async (req, res) => {
  try {
    const { reason, comment, reporterKey, customerId } = req.body;

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(422).json({ success: false, message: "Motif de signalement invalide" });
    }
    const key = String(reporterKey || "").trim();
    if (!key || key.length > 100) {
      return res.status(422).json({ success: false, message: "Identifiant de signaleur invalide" });
    }

    const counts = await productReviewService.reportReview(req.params.id, {
      reporterKey: key,
      reason,
      comment: comment ? String(comment).slice(0, 1000) : undefined,
      customerId,
    });
    if (!counts) {
      return res.status(404).json({ success: false, message: "Avis introuvable" });
    }
    return res.status(200).json({ success: true, message: "Signalement enregistré", data: counts });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === 11000) {
      const counts = await productReviewService.recountReports(req.params.id);
      return res.status(200).json({ success: true, message: "Signalement enregistré", data: counts });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getReviewReports = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    const reports = await productReviewService.getReports(req.params.id);
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const clearReviewReports = async (req, res) => {
  try {
    if (!(await assertReviewInStore(req, res, req.params.id))) return;
    await productReviewService.clearReports(req.params.id);
    return res.status(200).json({ success: true, message: "Signalements ignorés avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getReviewSettings = async (req, res) => {
  try {
    const settings = await productReviewService.getSettings(req.currentStoreId);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updateReviewSettings = async (req, res) => {
  try {
    const settings = await productReviewService.updateSettings(req.body, req.currentStoreId);
    return res.status(200).json({ success: true, message: "Paramètres mis à jour avec succès", data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getPublicProductReviews = async (req, res) => {
  try {
    const summary = await productReviewService.getPublicSummary(req.params.productId);
    if (!summary) {
      return res.status(404).json({ success: false, message: "Produit introuvable" });
    }
    if (!summary.settings.showRating) summary.rating = undefined;
    if (!summary.settings.showCount) summary.distribution = undefined;
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!req.user?.isSuperAdmin) {
      const foreign = await ProductReview.exists({
        _id: { $in: ids },
        storeId: { $ne: req.currentStoreId },
      });
      if (foreign) {
        return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
      }
    }
    await productReviewService.setStatusMany(ids, status);
    return res.status(200).json({ success: true, message: "Statut mis à jour avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getProductReviews,
  getProductReviewById,
  addProductReview,
  updateProductReview,
  deleteProductReview,
  deleteManyProductReviews,
  approveProductReview,
  rejectProductReview,
  markAsSpamProductReview,
  replyToReview,
  deleteReviewReply,
  setReviewMedia,
  deleteReviewMediaItem,
  voteOnReview,
  reportOnReview,
  getReviewReports,
  clearReviewReports,
  getReviewSettings,
  updateReviewSettings,
  getPublicProductReviews,
  bulkUpdateStatus,
};
