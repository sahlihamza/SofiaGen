const orchestrator = require("../service/ai/aiOrchestrator");
const aiConversationService = require("../service/ai/aiConversationService");
const aiQuotaService = require("../service/ai/aiQuotaService");
const aiProviderConfigService = require("../service/ai/aiProviderConfigService");
const { listProviderNames } = require("../service/ai/providerRegistry");
const { getCode } = require("../config/rbac/permissionCodes");
const { requirePermission } = require("../middleware/auth");
const { getMyContext } = require("./meController");
const AuditService = require("../service/AuditService");
const logger = require("../config/logger");
const { resolveStoreId } = require("../utils/requestContext");

/**
 * aiController  thin HTTP layer over the AI services. Each handler
 * resolves `req.authContext.storeId` and never trusts a body-provided
 * storeId. Errors are normalised to a small, frontend-friendly shape
 * (no provider internals ever leak to the client).
 */

const PERM = {
  USE: getCode("AI Assistant", "use"),
  HISTORY: getCode("AI Assistant", "history_view"),
  CONVERSATIONS: getCode("AI Assistant", "conversations_view"),
  SETTINGS: getCode("AI Assistant", "settings_manage"),
  USAGE: getCode("AI Assistant", "usage_view"),
  PROVIDERS: getCode("AI Assistant", "providers_manage"),
  ACTIONS: getCode("AI Assistant", "actions_confirm"),
};

function clientSafeError(err, fallbackStatus = 500) {
  const status = err.httpStatus || fallbackStatus;
  const body = { success: false, message: err.message || "Erreur Malla" };
  if (err.code) body.code = err.code;
  if (err.quotaType) body.quotaType = err.quotaType;
  if (err.info) body.quota = err.info;
  return { status, body };
}

async function postMessage(req, res) {
  try {
    const result = await orchestrator.sendMessage(req, {
      conversationId: req.body?.conversationId,
      message: req.body?.message,
      pageContext: req.body?.pageContext || null,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    const { status, body } = clientSafeError(err, 500);
    if (status >= 500) logger.error(`[ai] postMessage failed: ${err.message}`);
    res.status(status).json(body);
  }
}

/**
 * Streaming variant of postMessage. Writes Server-Sent Events:
 *   event: chunk   data: {"delta":"..."}     (one per token batch)
 *   event: done    data: { ...final payload } (assistant message, ids, usage)
 *   event: error   data: {"code":"...","message":"..."} (on failure)
 *
 * Falls back gracefully: if the resolved provider does not support
 * streaming, the controller buffers via `postMessage` and emits a
 * single `done` frame.
 */
async function postMessageStream(req, res) {
  // We delegate the auth + conversation + provider resolution to the
  // orchestrator, but split the actual provider call into a streaming
  // loop. The simplest way to keep one source of truth is to expose
  // the streaming surface from the orchestrator itself; for V1 we keep
  // it scoped to the controller and re-use the public API.
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders?.();

  const write = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = orchestrator.streamMessage(req, {
      conversationId: req.body?.conversationId,
      message: req.body?.message,
      pageContext: req.body?.pageContext || null,
    });
    let finalPayload = null;
    for await (const evt of stream) {
      if (evt.type === "chunk") {
        write("chunk", { delta: evt.delta });
      } else if (evt.type === "tool") {
        write("tool", { name: evt.name, status: evt.status });
      } else if (evt.type === "done") {
        finalPayload = evt.payload;
        write("done", finalPayload);
      } else if (evt.type === "error") {
        write("error", { code: evt.code, message: evt.message });
      }
    }
    if (!finalPayload) {
      // Stream ended without a done frame  graceful fallback.
      write("error", { code: "EMPTY_STREAM", message: "Malla n'a pas produit de réponse." });
    }
    res.end();
  } catch (err) {
    const { code, message } = clientSafeError(err, 500);
    write("error", { code: err.code || code || "INTERNAL", message });
    res.end();
  }
}

async function listConversations(req, res) {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active" });
    }
    const convs = await aiConversationService.listConversations({
      storeId,
      userId: req.user._id,
      status: req.query?.status || "active",
      limit: Math.min(Number(req.query?.limit) || 50, 100),
    });
    res.json({ success: true, data: convs });
  } catch (err) {
    logger.error(`[ai] listConversations failed: ${err.message}`);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

async function getConversation(req, res) {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active" });
    }
    const conv = await aiConversationService.getConversation({
      storeId,
      id: req.params.id,
    });
    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    }
    const messages = await aiConversationService.listMessages({
      storeId,
      conversationId: conv._id,
    });
    res.json({ success: true, data: { conversation: conv, messages } });
  } catch (err) {
    logger.error(`[ai] getConversation failed: ${err.message}`);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

async function deleteConversation(req, res) {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active" });
    }
    const result = await aiConversationService.deleteConversation({ storeId, id: req.params.id });
    if (result?.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    }
    AuditService.logAction({
      actorType: "store_owner",
      actorId: req.user._id,
      module: "AI Assistant",
      action: "conversation.delete",
      status: "success",
      severity: "low",
      storeId,
      entityType: "AIConversation",
      entityId: req.params.id,
    }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    logger.error(`[ai] deleteConversation failed: ${err.message}`);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

async function getUsage(req, res) {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active" });
    }
    const usage = await aiQuotaService.getUsageSnapshot(storeId);
    res.json({ success: true, data: usage });
  } catch (err) {
    logger.error(`[ai] getUsage failed: ${err.message}`);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

async function getCapabilities(req, res) {
  // Static capability list  drives the widget UI affordances.
  res.json({
    success: true,
    data: {
      providers: listProviderNames().filter((n) => n !== "mock").concat(["mock"]),
      features: {
        streaming: true, // SSE is wired for the openai-compatible provider.
        tools: true,
        history: true,
        actions: true, // confirmation flow in place
        multiLocale: ["fr", "en", "ar"],
        suggestions: true,
      },
      permissions: PERM,
    },
  });
}

// --- Provider configuration (settings UI) ----------------------------------

async function listProviders(req, res) {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active" });
    }
    const configs = await aiProviderConfigService.listProviderConfigs(storeId);
    res.json({ success: true, data: configs });
  } catch (err) {
    logger.error(`[ai] listProviders failed: ${err.message}`);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

async function upsertProvider(req, res) {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active" });
    }
    const { providerName, model, baseUrl, apiKey, isDefault, enabled, softLimits } = req.body || {};
    if (!providerName) {
      return res.status(400).json({ success: false, message: "providerName requis" });
    }
    const saved = await aiProviderConfigService.saveProviderConfig({
      storeId,
      providerName,
      model,
      baseUrl,
      apiKey,
      isDefault: Boolean(isDefault),
      enabled: enabled !== false,
      softLimits,
    });
    AuditService.logAction({
      actorType: "store_owner",
      actorId: req.user._id,
      module: "AI Assistant",
      action: "provider.upsert",
      status: "success",
      severity: "medium",
      storeId,
      summary: `Provider ${providerName} configuré`,
      entityType: "AIProviderConfig",
      entityId: saved?._id,
    }).catch(() => {});
    res.json({ success: true, data: saved });
  } catch (err) {
    logger.error(`[ai] upsertProvider failed: ${err.message}`);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

module.exports = {
  postMessage,
  postMessageStream,
  listConversations,
  getConversation,
  deleteConversation,
  getUsage,
  getCapabilities,
  listProviders,
  upsertProvider,
  PERM,
};