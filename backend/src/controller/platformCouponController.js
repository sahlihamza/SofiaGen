const platformCouponService = require("../service/platformCouponService");
const platformCouponApplicationService = require("../service/platformCouponApplicationService");
const { CouponApplicationError } = require("../service/platformCouponApplicationService");
const PlatformCoupon = require("../models/PlatformCoupon");
const AuditService = require("../service/AuditService");

const AUDIT_SEVERITY = {
  create: "medium",
  update: "medium",
  delete: "high",
  restore: "medium",
  activate: "medium",
  deactivate: "high",
  apply: "medium",
};

const auditCoupon = async (req, action, coupon, extra = {}) => {
  try {
    await AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.user?._id || null,
      actorNameSnapshot: req.user?.name || "",
      module: "PlatformCoupon",
      action: `platform_coupon.${action}`,
      summary: `platform_coupon.${action} ${coupon?.code || extra.code || ""}`.trim(),
      entityType: "PlatformCoupon",
      entityId: coupon?._id || null,
      status: "success",
      severity: AUDIT_SEVERITY[action] || "low",
      requestId: req.requestId,
      sourceIp: req.ip,
      ...extra,
    });
  } catch (err) {
    return;
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const {
      search,
      status,
      page,
      limit,
      includeDeleted,
      deletedOnly,
    } = req.query;

    const { coupons, totalDoc, limits, pages } =
      await platformCouponService.getAllCoupons({
        search,
        status,
        page,
        limit,
        includeDeleted,
        deletedOnly,
      });

    return res.status(200).json({
      success: true,
      data: coupons,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getCouponById = async (req, res) => {
  try {
    const coupon = await platformCouponService.getById(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    return res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const addCoupon = async (req, res) => {
  try {
    const coupon = await platformCouponService.create(req.body);
    await auditCoupon(req, "create", coupon, { newValue: coupon.toObject() });
    return res
      .status(201)
      .json({
        success: true,
        message: "Coupon plateforme créé avec succès",
        data: coupon,
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ce code de coupon existe déjà",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const before = await platformCouponService.getById(req.params.id);
    const coupon = await platformCouponService.update(req.params.id, req.body);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    await auditCoupon(req, "update", coupon, {
      oldValue: before ? before.toObject() : null,
      newValue: coupon.toObject(),
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Coupon plateforme mis à jour avec succès",
        data: coupon,
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ce code de coupon existe déjà",
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await platformCouponService.softDelete(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    await auditCoupon(req, "delete", coupon);
    return res
      .status(200)
      .json({ success: true, message: "Coupon plateforme supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const restoreCoupon = async (req, res) => {
  try {
    const coupon = await platformCouponService.restore(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    await auditCoupon(req, "restore", coupon);
    return res
      .status(200)
      .json({
        success: true,
        message: "Coupon plateforme restauré avec succès",
        data: coupon,
      });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const activateCoupon = async (req, res) => {
  try {
    const coupon = await platformCouponService.activate(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    await auditCoupon(req, "activate", coupon);
    return res
      .status(200)
      .json({
        success: true,
        message: "Coupon plateforme activé avec succès",
        data: coupon,
      });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const deactivateCoupon = async (req, res) => {
  try {
    const coupon = await platformCouponService.deactivate(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    await auditCoupon(req, "deactivate", coupon);
    return res
      .status(200)
      .json({
        success: true,
        message: "Coupon plateforme désactivé avec succès",
        data: coupon,
      });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const coupon = await platformCouponService.update(req.params.id, { status });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon plateforme introuvable" });
    }
    await auditCoupon(req, "update", coupon, { newValue: { status } });
    return res
      .status(200)
      .json({
        success: true,
        message: "Statut du coupon plateforme mis à jour avec succès",
        data: coupon,
      });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const deleteManyCoupons = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids is required and must be a non-empty array",
      });
    }
    const result = await PlatformCoupon.updateMany(
      { _id: { $in: ids }, deletedAt: null },
      { deletedAt: new Date() }
    );
    await auditCoupon(req, "delete", null, {
      metadata: { ids, modifiedCount: result.modifiedCount },
      summary: `platform_coupon.delete ${result.modifiedCount} coupon(s)`,
    });
    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} coupon(s) plateforme supprimé(s) avec succès`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updateManyCoupons = async (req, res) => {
  try {
    const { ids, endDate, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids is required and must be a non-empty array",
      });
    }
    const updateData = {};
    if (endDate) updateData.endDate = new Date(endDate);
    if (status) updateData.status = status;
    const result = await PlatformCoupon.updateMany(
      { _id: { $in: ids }, deletedAt: null },
      { $set: updateData }
    );
    await auditCoupon(req, "update", null, {
      metadata: { ids, modifiedCount: result.modifiedCount },
      newValue: updateData,
      summary: `platform_coupon.update ${result.modifiedCount} coupon(s)`,
    });
    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} coupon(s) plateforme mis à jour avec succès`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const handleApplicationError = (res, error) => {
  if (error instanceof CouponApplicationError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Identifiant invalide" });
  }
  return res.status(500).json({
    success: false,
    message: "Erreur serveur",
    error: error.message,
  });
};

const previewCoupon = async (req, res) => {
  try {
    const { code, subscriptionId } = req.body;
    const result = await platformCouponApplicationService.preview({ code, subscriptionId });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleApplicationError(res, error);
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { code, subscriptionId } = req.body;
    const result = await platformCouponApplicationService.apply({
      code,
      subscriptionId,
      actorId: req.user?._id || null,
    });

    await auditCoupon(req, "apply", result.coupon, {
      metadata: {
        subscriptionId: String(result.subscriptionId),
        invoiceId: result.invoice ? String(result.invoice._id) : null,
        discountAmount: result.discountAmount,
        currency: result.currency,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Coupon appliqué avec succès",
      data: result,
    });
  } catch (error) {
    return handleApplicationError(res, error);
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  addCoupon,
  updateCoupon,
  deleteCoupon,
  restoreCoupon,
  activateCoupon,
  deactivateCoupon,
  updateStatus,
  deleteManyCoupons,
  updateManyCoupons,
  previewCoupon,
  applyCoupon,
};