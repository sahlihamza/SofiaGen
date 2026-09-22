const couponUsageService = require("../service/couponUsageService");
const { resolveStoreId } = require("../utils/requestContext");

const getCouponUsages = async (req, res) => {
  try {
    const { customerId, page, limit } = req.query;
    const result = await couponUsageService.getUsageHistory({
      storeId: resolveStoreId(req),
      couponId: req.params.id,
      customerId,
      page,
      limit,
    });
    if (!result) {
      return res.status(404).json({ success: false, message: "Coupon introuvable" });
    }
    return res.status(200).json({
      success: true,
      data: result.usages,
      totalDoc: result.totalDoc,
      limits: result.limits,
      pages: result.pages,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getCouponUsages,
};

