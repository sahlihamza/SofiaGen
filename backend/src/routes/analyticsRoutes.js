const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireFeatureMiddleware } = require("../service/EntitlementService");
const requireAnalytics = requireFeatureMiddleware("analytics");
const {
  getDashboard,
  getSales,
  getOrders,
  getCustomers,
  getProducts,
  getCategories,
  getCoupons,
  getInventory,
  getRevenue,
  getExport,
} = require("../controller/analyticsController");
const { hasPermission } = require("../middleware/auth");

router.get("/dashboard", requireAnalytics, hasPermission("analytics", "view"), getDashboard);
router.get("/sales", requireAnalytics, hasPermission("analytics", "view"), getSales);
router.get("/orders", hasPermission("analytics", "view"), getOrders);
router.get("/customers", hasPermission("analytics", "view"), getCustomers);
router.get("/products", hasPermission("analytics", "view"), getProducts);
router.get("/categories", hasPermission("analytics", "view"), getCategories);
router.get("/coupons", hasPermission("analytics", "view"), getCoupons);
router.get("/inventory", hasPermission("analytics", "view"), getInventory);
router.get("/revenue", hasPermission("analytics", "view"), getRevenue);
router.get("/export", hasPermission("analytics", "view"), getExport);

module.exports = router;
