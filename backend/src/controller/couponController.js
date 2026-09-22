const couponService = require("../service/couponService");
const Notification = require("../models/Notification");
const { resolveStoreId } = require("../utils/requestContext");

const getAllCoupons = async (req, res) => {
  try {
    const {
      search,
      status,
      page,
      limit,
      includeDeleted,
      deletedOnly,
      usedOnly,
      allowFreeShipping,
      autoApply,
    } = req.query;

    const { coupons, totalDoc, limits, pages } = await couponService.getAllCoupons({
      storeId: req.currentStoreId,
      search,
      status,
      page,
      limit,
      includeDeleted,
      deletedOnly,
      usedOnly,
      allowFreeShipping,
      autoApply,
    });

    return res.status(200).json({
      success: true,
      data: coupons,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getCouponById = async (req, res) => {
  try {
    const coupon = await couponService.getById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addCoupon = async (req, res) => {
  try {
    const coupon = await couponService.create(req.body, req.user._id, req.currentStoreId);
    // Story 17  fire-and-forget: a failed notification must never fail the
    // coupon creation itself.
    Notification.create({
      couponId: coupon._id,
      message: `Nouveau coupon créé : ${coupon.code}`,
    }).catch(() => {});
    return res.status(201).json({ success: true, message: "Coupon créé avec succès", data: coupon });
  } catch (error) {
    if (error.code === "DUPLICATE_CODE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === "QUOTA_EXCEEDED") {
      return res.status(409).json({ success: false, message: error.message, code: error.code });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.update(req.params.id, req.body, resolveStoreId(req));
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, message: "Coupon mis à jour avec succès", data: coupon });
  } catch (error) {
    if (error.code === "DUPLICATE_CODE") {
      return res.status(409).json({ success: false, message: error.message });
    }
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

const duplicateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.duplicate(req.params.id, req.user._id, resolveStoreId(req));
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(201).json({ success: true, message: "Coupon dupliqué avec succès", data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const archiveCoupon = async (req, res) => {
  try {
    const coupon = await couponService.archive(req.params.id, resolveStoreId(req));
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, message: "Coupon archivé avec succès", data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const activateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.activate(req.params.id, resolveStoreId(req));
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, message: "Coupon activé avec succès", data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deactivateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.deactivate(req.params.id, resolveStoreId(req));
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, message: "Coupon désactivé avec succès", data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await couponService.softDelete(req.params.id, resolveStoreId(req));
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, message: "Coupon supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const restoreCoupon = async (req, res) => {
  try {
    const coupon = await couponService.restore(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, message: "Coupon restauré avec succès", data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  addCoupon,
  updateCoupon,
  duplicateCoupon,
  archiveCoupon,
  activateCoupon,
  deactivateCoupon,
  deleteCoupon,
  restoreCoupon,
};
