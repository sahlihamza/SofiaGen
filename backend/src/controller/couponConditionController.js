const couponConditionService = require("../service/couponConditionService");
const { resolveStoreId } = require("../utils/requestContext");

const getCouponConditions = async (req, res) => {
  try {
    const condition = await couponConditionService.getByCouponId(req.params.id, resolveStoreId(req));
    if (!condition) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({ success: true, data: condition });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updateCouponConditions = async (req, res) => {
  try {
    const condition = await couponConditionService.upsert(req.params.id, resolveStoreId(req), req.body);
    if (!condition) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({
      success: true,
      message: "Restrictions du coupon mises  jour avec succès",
      data: condition,
    });
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

module.exports = {
  getCouponConditions,
  updateCouponConditions,
};

