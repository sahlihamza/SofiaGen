const express = require("express");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const { getCode } = require("../config/rbac/permissionCodes");
const controller = require("../controller/aiController");

/**
 * Malla HTTP surface. Mounted under `/api/ai` in routes.js.
 *
 * Auth chain (reused verbatim from the rest of the app):
 *   isAuth  loadUser  resolveAuthorizationContext  requirePermission(<module>.<action>)
 *
 * The storeId is NEVER read from the request body. The orchestrator and
 * the conversation service both resolve it from `req.authContext.storeId`
 * (or `req.user.currentStoreId` as a fallback) inside the
 * requireStoreAccess-aware layer.
 */
const router = express.Router();

// All routes require auth + auth context.
router.use(isAuth, loadUser, resolveAuthorizationContext);

const USE = getCode("AI Assistant", "use");
const CONVERSATIONS = getCode("AI Assistant", "conversations_view");
const HISTORY = getCode("AI Assistant", "history_view");
const SETTINGS = getCode("AI Assistant", "settings_manage");
const USAGE = getCode("AI Assistant", "usage_view");
const PROVIDERS = getCode("AI Assistant", "providers_manage");

// Capabilities (no permission gate  needed by the widget to decide
// whether to render itself, even before the per-action permission check).
router.get("/capabilities", controller.getCapabilities);

// Usage (read-only counter).
router.get("/usage", requirePermission(USAGE), controller.getUsage);

// Conversations list.
router.get("/conversations", requirePermission(CONVERSATIONS), controller.listConversations);

// Conversation detail.
router.get(
  "/conversations/:id",
  requirePermission(HISTORY),
  controller.getConversation
);

// Conversation delete.
router.delete(
  "/conversations/:id",
  requirePermission(CONVERSATIONS),
  controller.deleteConversation
);

// Send a message  the main entry point used by the widget.
router.post(
  "/conversations/:id?/messages",
  requirePermission(USE),
  controller.postMessage
);

// Streaming variant: Server-Sent Events. Same auth as POST /messages.
// Widgets call this when capabilities.features.streaming is true.
router.post(
  "/conversations/:id?/messages/stream",
  requirePermission(USE),
  controller.postMessageStream
);

// Provider configuration (settings UI).
router.get("/providers", requirePermission(PROVIDERS), controller.listProviders);
router.post("/providers", requirePermission(PROVIDERS), controller.upsertProvider);

module.exports = router;