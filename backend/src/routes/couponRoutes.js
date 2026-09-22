const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
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
} = require("../controller/couponController");
const {
  getCouponConditions,
  updateCouponConditions,
} = require("../controller/couponConditionController");
const {
  getCouponRules,
  addRuleCondition,
  updateRuleCondition,
  deleteRuleCondition,
  addRuleGroup,
  updateRuleGroup,
  deleteRuleGroup,
} = require("../controller/couponRuleController");
const { getCouponUsages } = require("../controller/couponUsageController");
const {
  validateAndCalculate,
  applyCoupon,
  removeCoupon,
} = require("../controller/couponValidationController");
const { hasPermission } = require("../middleware/auth");

// Declared before "/:id" so they can never be shadowed if a POST "/:id"
// route is added later.
router.post("/validate", hasPermission("coupons", "view"), validateAndCalculate);
router.post("/apply", hasPermission("coupons", "update"), applyCoupon);
router.post("/remove", hasPermission("coupons", "update"), removeCoupon);

router.get("/", hasPermission("coupons", "view"), getAllCoupons);
router.get("/:id", hasPermission("coupons", "view"), getCouponById);
router.post("/", hasPermission("coupons", "create"), addCoupon);
router.put("/:id", hasPermission("coupons", "update"), updateCoupon);
router.post("/:id/duplicate", hasPermission("coupons", "duplicate"), duplicateCoupon);
router.put("/:id/archive", hasPermission("coupons", "update"), archiveCoupon);
router.put("/:id/activate", hasPermission("coupons", "activate"), activateCoupon);
router.put("/:id/deactivate", hasPermission("coupons", "deactivate"), deactivateCoupon);
router.put("/:id/restore", hasPermission("coupons", "update"), restoreCoupon);
router.delete("/:id", hasPermission("coupons", "delete"), deleteCoupon);

router.get("/:id/conditions", hasPermission("coupons", "view"), getCouponConditions);
router.put("/:id/conditions", hasPermission("coupons", "update"), updateCouponConditions);

router.get("/:id/rules", hasPermission("coupons", "view"), getCouponRules);
router.post("/:id/rules/conditions", hasPermission("coupons", "update"), addRuleCondition);
router.put("/:id/rules/conditions/:ruleId", hasPermission("coupons", "update"), updateRuleCondition);
router.delete("/:id/rules/conditions/:ruleId", hasPermission("coupons", "update"), deleteRuleCondition);
router.post("/:id/rules/groups", hasPermission("coupons", "update"), addRuleGroup);
router.put("/:id/rules/groups/:groupId", hasPermission("coupons", "update"), updateRuleGroup);
router.delete("/:id/rules/groups/:groupId", hasPermission("coupons", "update"), deleteRuleGroup);

router.get("/:id/usages", hasPermission("coupons", "view"), getCouponUsages);

module.exports = router;
