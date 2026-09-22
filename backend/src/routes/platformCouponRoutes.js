const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
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
} = require("../controller/platformCouponController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("platform_coupons", "view"), getAllCoupons);
router.post("/preview", hasPermission("platform_coupons", "view"), previewCoupon);
router.post("/apply", hasPermission("platform_coupons", "update"), applyCoupon);
router.get("/:id", hasPermission("platform_coupons", "view"), getCouponById);
router.post("/", hasPermission("platform_coupons", "create"), addCoupon);
router.put("/:id", hasPermission("platform_coupons", "update"), updateCoupon);
router.delete("/:id", hasPermission("platform_coupons", "delete"), deleteCoupon);
router.delete("/delete/many", hasPermission("platform_coupons", "delete"), deleteManyCoupons);
router.patch("/update/many", hasPermission("platform_coupons", "update"), updateManyCoupons);
router.put("/:id/status", hasPermission("platform_coupons", "update"), updateStatus);
router.put("/:id/restore", hasPermission("platform_coupons", "update"), restoreCoupon);
router.post("/:id/activate", hasPermission("platform_coupons", "update"), activateCoupon);
router.post("/:id/deactivate", hasPermission("platform_coupons", "update"), deactivateCoupon);

module.exports = router;
