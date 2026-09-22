const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  addOrderNote,
  deleteOrder,
  getDashboardOrders,
  getDashboardRecentOrder,
  getBestSellerProductChart,
  getDashboardCount,
  getDashboardAmount,
  createCheckoutOrder,
} = require("../controller/orderController");
const {
  printPackingLabels,
  printPackingManifest,
  printOrderLabel,
  markLabelsPrinted,
  getLabelStatuses,
} = require("../controller/orderLabelController");

// SO-08/SO-10: every back-office order route requires an active, verified
// membership in the store resolved by authContext  checkout is the one
// customer-facing exception, it resolves its store from the cart, not from
// a staff session.
//
// requireStoreAccess()'s default "auto" source falls back to req.params.id,
// which on this router is the ORDER id, not a store id  an explicit source
// keeps it pinned to the authenticated context on every route below.
const requireOrderStoreAccess = () =>
  requireStoreAccess({ source: (req) => req.authContext?.storeId || req.currentStoreId });

// SO-19: requireOrderStoreAccess() alone only proved the caller belongs to
// the store  any active membership, regardless of role, passed. It never
// checked the role actually grants an Orders permission, so a staff member
// with e.g. a Products-only role could still view/update/delete every order.
// requirePermission(getCode("Orders", ...)) closes that gap.
const canViewOrders = requirePermission(getCode("Orders", "view"));
const canUpdateOrders = requirePermission(getCode("Orders", "update"));
const canDeleteOrders = requirePermission(getCode("Orders", "delete"));
// SFG-155: printing shipping paperwork is its own permission  a role that
// may read orders does not automatically get to produce delivery notes
// carrying the customer's full address and the amount to collect.
const canPrintLabels = requirePermission(getCode("Orders", "print_label"));

router.post("/checkout", createCheckoutOrder);
router.get("/", requireOrderStoreAccess(), canViewOrders, getAllOrders);

// get dashboard orders data
router.get("/dashboard", requireOrderStoreAccess(), canViewOrders, getDashboardOrders);

// dashboard recent-order
router.get("/dashboard-recent-order", requireOrderStoreAccess(), canViewOrders, getDashboardRecentOrder);

// dashboard order count
router.get("/dashboard-count", requireOrderStoreAccess(), canViewOrders, getDashboardCount);

// dashboard order amount
router.get("/dashboard-amount", requireOrderStoreAccess(), canViewOrders, getDashboardAmount);

// chart data for product
router.get("/best-seller/chart", requireOrderStoreAccess(), canViewOrders, getBestSellerProductChart);

//get all order by a user
router.get("/customer/:id", requireOrderStoreAccess(), canViewOrders, getOrderCustomer);

// SFG-155  Print Labels. Declared before "/:id" so the static "/labels"
// segment is never swallowed by the order-id route.
//
// bulk packing labels (one PDF, one page per selected order)
router.post("/labels", requireOrderStoreAccess(), canPrintLabels, printPackingLabels);
// packing manifest for the same selection (one A4 recap table)
router.post("/labels/manifest", requireOrderStoreAccess(), canPrintLabels, printPackingManifest);
// close the label lifecycle: label_generated  printed
router.post("/labels/printed", requireOrderStoreAccess(), canPrintLabels, markLabelsPrinted);
// label state for a selection, so the list can show "printed" badges
router.get("/labels/status", requireOrderStoreAccess(), canPrintLabels, getLabelStatuses);
// single-order label (row Actions menu)
router.get("/:id/label", requireOrderStoreAccess(), canPrintLabels, printOrderLabel);

//get a order by id
router.get("/:id", requireOrderStoreAccess(), canViewOrders, getOrderById);

//update a order  status and/or the order details
router.put("/:id", requireOrderStoreAccess(), canUpdateOrders, updateOrder);

//add a back-office note to an order
router.post("/:id/notes", requireOrderStoreAccess(), canUpdateOrders, addOrderNote);

//delete a order
router.delete("/:id", requireOrderStoreAccess(), canDeleteOrders, deleteOrder);

module.exports = router;
