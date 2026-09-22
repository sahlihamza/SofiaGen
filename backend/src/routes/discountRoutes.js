const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const discountController = require("../controller/discountController");

router.get("/", requirePermission(getCode("Platform Plan", "view")), discountController.getDiscounts);
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), discountController.getDiscountByCode);
router.post("/", requirePermission(getCode("Platform Plan", "create")), discountController.createDiscount);
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), discountController.updateDiscount);
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), discountController.deleteDiscount);
router.post("/apply", requirePermission(getCode("Platform Plan", "update")), discountController.applyDiscount);

module.exports = router;
