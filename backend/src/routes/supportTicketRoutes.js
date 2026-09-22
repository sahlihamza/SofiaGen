const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const customerRouter = express.Router();
const {
  createTicket,
  getTickets,
  getTicket,
  assignTicket,
  changeTicketStatus,
  bulkActions,
  addTicketMessage,
  rateTicketMessage,
} = require("../controller/supportTicketController");
const {
  getSupportSummary,
  getSupportCsat,
  getAgentPerformance,
} = require("../controller/supportAnalyticsController");
const { hasPermission } = require("../middleware/auth");
const { requireCustomer } = require("../middleware/customerAuth");

// Staff/back-office  mounted with isAuth, loadUser in routes.js.
// Permission module is "Support Ticket" (see seedPermissions.js), so these
// resolve to support_ticket_view / support_ticket_create / etc  matches the
// exact keys from the SFG-80 spec, not the old glued-together "supporttickets".
//
// SUPPORT-9: the /analytics/* routes MUST come before "/:id"  Express would
// otherwise match "/analytics/summary" as GET /:id with id="analytics" and
// never reach these handlers at all.
router.get("/analytics/summary", hasPermission("support analytics", "view"), getSupportSummary);
router.get("/analytics/csat", hasPermission("support analytics", "view"), getSupportCsat);
router.get("/analytics/agents", hasPermission("support analytics", "view"), getAgentPerformance);

router.get("/", hasPermission("support ticket", "view"), getTickets);
router.get("/:id", hasPermission("support ticket", "view"), getTicket);
router.post("/", hasPermission("support ticket", "create"), createTicket);
router.post("/bulk-actions", hasPermission("support ticket", "update"), bulkActions);
router.patch("/:id/assign", hasPermission("support ticket", "assign"), assignTicket);
router.patch("/:id/status", hasPermission("support ticket", "update"), changeTicketStatus);
// SUPPORT-3: reply covers both public replies and internal notes  the
// agent/customer distinction (and the isInternalNote=agent-only rule) is
// enforced in the controller/service, not here.
router.post("/:id/messages", hasPermission("support ticket", "reply"), addTicketMessage);

// Storefront  mounted with loadCustomerOptional in routes.js, same split as
// productReviewRoutes (staff) / publicReviewRoutes (customer-facing).
customerRouter.post("/", requireCustomer, createTicket);
// SUPPORT-3: a customer viewing/replying to their own ticket, and rating an
// agent's reply. Ownership (does this ticket belong to this customer) is
// checked in the controller, not just requireCustomer.
customerRouter.get("/:id", requireCustomer, getTicket);
customerRouter.post("/:id/messages", requireCustomer, addTicketMessage);
customerRouter.patch("/:id/messages/:messageId/rating", requireCustomer, rateTicketMessage);

module.exports = { supportTicketRoutes: router, publicSupportTicketRoutes: customerRouter };
