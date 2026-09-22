const crypto = require("crypto");

// IMPORTANT: require the modules, not the destructured functions. Destructuring
// would freeze the reference at load time and make the orchestrator untestable
// in isolation (the tests override individual functions on the live module
// objects). Every call below goes through the module namespace so the
// overrides take effect.
const aiAuthz = require("./aiAuthorizationService");
const aiContextBuilder = require("./aiContextBuilder");
const aiConversationService = require("./aiConversationService");
const aiQuota = require("./aiQuotaService");
const toolRegistry = require("./tools");
const AuditService = require("../AuditService");
const logger = require("../../config/logger");
const { normalizeIp } = AuditService;

/**
 * SYSTEM_PROMPT  the canonical Malla persona. Kept in code (not in a
 * settings collection) so that prompt changes are reviewable in PRs.
 *
 * Hard requirements baked in (cannot be removed by users):
 *  - Always respond in the locale of the request.
 *  - Never reveal other stores' data; trust only the provided context.
 *  - Never invent numbers  say "I don't have this data" otherwise.
 *  - Currency is the one from the context (TND for Tunisian stores).
 *  - Critical actions always require user confirmation.
 */
const SYSTEM_PROMPT = `Tu es Malla, l'assistant IA de la plateforme SaaS e-commerce Sofiagen.
Tu aides les utilisateurs  gérer leur activité e-commerce au quotidien.

Régles strictes que tu dois toujours respecter :
- Tu réponds dans la langue de l'utilisateur (français par défaut, arabe, anglais selon le contexte).
- Tu ne dois JAMAIS inventer de chiffres. Si une donné n'est pas présente dans le contexte fourni, dis clairement que tu ne peux pas la déterminer et propose d'aller la chercher via l'outil adapt.
- Tu n'accédes JAMAIS aux donnés d'une autre boutique. Le contexte que tu reçois est déjà filtré pour ta boutique uniquement.
- Tu dois TOUJOURS demander confirmation avant une action irréversible (annuler une commande, supprimer un produit, etc.).
- Tu utilises la devise fournie dans le contexte (par exemple TND pour la Tunisie).
- Tu restes professionnel, concis et orienté action.
- Tu peux analyser, résumer, recommander, expliquer ou calculer. Tu n'exécutes pas toi-même une action métier sensible  l'utilisateur la confirme.

Format de réponse :
- Réponse courte, factuelle.
- Liste  puces si plusieurs Éléments.
- Termine par UNE question de clarification si tu manques d'information.`;

class OrchestratorError extends Error {
  constructor(code, message, { httpStatus = 500, cause } = {}) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
    this.httpStatus = httpStatus;
    if (cause) this.cause = cause;
  }
}

/**
 * Main entry point: send one user message in the context of a (possibly
 * new) conversation and return the assistant reply + new message ids.
 *
 * Parameters (all resolved server-side except the user's text):
 *   req                express request (for auth context + IP)
 *   options: {
 *     conversationId   optional existing thread; a new one is created if missing
 *     message          the user text (required, non-empty after trim)
 *     pageContext      optional { module, page, locale, currency, data }
 *     systemOverride   optional; ADVANCED USE ONLY. Most callers leave this undefined.
 *   }
 */
async function sendMessage(req, options) {
  const { conversationId, message, pageContext, systemOverride } = options || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    throw new OrchestratorError("EMPTY_MESSAGE", "Le message est vide", { httpStatus: 400 });
  }
  if (message.length > 4000) {
    throw new OrchestratorError("MESSAGE_TOO_LONG", "Message trop long (max 4000 caractères)", {
      httpStatus: 400,
    });
  }

  const { storeId, userId } = await aiAuthz.assertCanUseAssistant(req);

  // Daily quota  1 per user message. Refunded on failure below.
  await aiQuota.assertAndConsume({ storeId, type: aiQuota.AI_MESSAGES_DAILY, amount: 1 });

  // Resolve or create the conversation. The storeId is server-side.
  let conversation = null;
  if (conversationId) {
    conversation = await aiConversationService.ensureOwnership({ storeId, id: conversationId });
    if (!conversation) {
      throw new OrchestratorError("CONVERSATION_NOT_FOUND", "Conversation introuvable", {
        httpStatus: 404,
      });
    }
  } else {
    conversation = await aiConversationService.createConversation({
      storeId,
      userId,
      origin: pageContext || {},
      title: deriveTitle(message),
    });
  }

  // Persist the user message BEFORE calling the provider so the user
  // sees their own message in the history even if the provider is slow.
  const ip = normalizeIp(req.headers["x-forwarded-for"] || req.ip || null);
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  const userMsg = await aiConversationService.appendMessage({
    storeId,
    conversationId: conversation._id,
    role: "user",
    content: message.trim(),
    meta: { requestId, ip },
  });

  // Build the LLM context.
  const ctx = await aiContextBuilder.build({ req, pageContext });
  const history = await aiConversationService.listMessages({
    storeId,
    conversationId: conversation._id,
    limit: 30,
  });
  // Keep the system prompt + last 30 messages to bound input tokens.
  const recentHistory = history.slice(-30);

  const systemPrompt = systemOverride || buildSystemPrompt(ctx);
  const messages = recentHistory
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  // Resolve provider.
  const { provider, config, degraded } = await aiAuthz.loadProviderForStore(storeId);
  const apiKey = config ? require("./aiProviderConfigService").decryptApiKey(config.apiKeyCipher) : undefined;
  // Tools require a storeId (every tool reads store-scoped data). In
  // platform mode (storeId is null) we run the assistant without tool
  // access: the LLM can still answer general questions using only its
  // own knowledge + the system prompt.
  const isPlatformMode = !storeId;
  const toolsSpec = isPlatformMode || provider.supportsTools === false ? null : toolRegistry.OPENAI_TOOL_SPEC;

  let response;
  try {
    // First round: send the user message + tool spec.
    response = await provider.chat({
      messages,
      systemPrompt,
      model: provider._configModel || undefined,
      baseUrl: provider._configBaseUrl || undefined,
      apiKey,
      timeoutMs: config?.softLimits?.timeoutMs,
      maxTokens: config?.softLimits?.maxOutputTokensPerMessage,
      context: ctx,
      tools: toolsSpec,
    });

    // Tool loop: keep dispatching tool calls until the model returns a
    // plain assistant message or we hit MAX_TOOL_ROUNDS. Each round is
    // still a single provider.chat()  we don't stream yet.
    const MAX_TOOL_ROUNDS = 4;
    let rounds = 0;
    while (Array.isArray(response.toolCalls) && response.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;

      // Re-append the assistant message that emitted the tool_calls so
      // the provider keeps a well-formed conversation (OpenAI requirement).
      const assistantForProvider = {
        role: "assistant",
        content: response.content || "",
        tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
        })),
      };

      // Persist the intermediate assistant message for transparency.
      await aiConversationService.appendMessage({
        storeId,
        conversationId: conversation._id,
        role: "assistant",
        content: response.content || "",
        meta: {
          provider: response.providerName,
          model: response.model,
          tokensIn: response.tokensIn,
          tokensOut: response.tokensOut,
          durationMs: response.durationMs,
          requestId,
          toolCalls: response.toolCalls.map((tc) => ({ name: tc.name, arguments: tc.arguments })),
        },
      });

      // Dispatch every tool call (in parallel) and collect results.
      const toolResults = await Promise.all(
        response.toolCalls.map(async (tc) => {
          const data = await toolRegistry.dispatch(
            {
              storeId,
              userId,
              locale: ctx.locale,
              currency: ctx.currency,
            },
            tc.name,
            tc.arguments || {}
          );
          return {
            id: tc.id,
            name: tc.name,
            result: data,
          };
        })
      );

      // Persist each tool result as a role:tool message.
      for (const r of toolResults) {
        await aiConversationService.appendMessage({
          storeId,
          conversationId: conversation._id,
          role: "tool",
          content: JSON.stringify(r.result).slice(0, 16000),
          meta: { toolName: r.name, toolCallId: r.id, requestId },
        });
      }

      // Next provider round: pass the previous assistant message verbatim
      // and the tool messages.
      const toolMessages = toolResults.map((r) => ({
        role: "tool",
        name: r.name,
        tool_call_id: r.id,
        content: JSON.stringify(r.result).slice(0, 16000),
      }));

      response = await provider.chat({
        messages,
        systemPrompt,
        model: provider._configModel || undefined,
        baseUrl: provider._configBaseUrl || undefined,
        apiKey,
        timeoutMs: config?.softLimits?.timeoutMs,
        maxTokens: config?.softLimits?.maxOutputTokensPerMessage,
        context: ctx,
        tools: toolsSpec,
        previousAssistantToolCall: assistantForProvider,
        toolMessages,
      });
    }
  } catch (err) {
    // Refund the daily counter on provider failure.
    await aiQuota.refundOnFailure({ storeId, type: aiQuota.AI_MESSAGES_DAILY, amount: 1 });
    logger.warn(`[ai] provider ${provider.name} failed: ${err.message}`);
    throw new OrchestratorError(
      err.code || "PROVIDER_ERROR",
      err.code === "INVALID_KEY"
        ? "Clé IA invalide. Vérifiez la configuration dans les paramètres IA."
        : err.code === "PROVIDER_TIMEOUT"
        ? "La réponse prend trop de temps. Réssayez."
        : "Malla est temporairement indisponible. Veuillez réssayer dans quelques instants.",
      { httpStatus: 502, cause: err.message }
    );
  }

  // Persist the assistant message.
  const assistantMsg = await aiConversationService.appendMessage({
    storeId,
    conversationId: conversation._id,
    role: "assistant",
    content: response.content,
    meta: {
      provider: response.providerName,
      model: response.model,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      durationMs: response.durationMs,
      requestId,
    },
  });

  // Monthly token quota is accounted AFTER we know the actual usage.
  try {
    if (response.tokensOut > 0) {
      await aiQuota.assertAndConsume({
        storeId,
        type: "ai_tokens_monthly",
        amount: response.tokensOut,
      });
    }
  } catch (err) {
    // We do not roll back the assistant reply on a token-cap miss; the
    // user already saw the answer. We log and continue.
    logger.warn(`[ai] token quota accounting failed: ${err.message}`);
  }

  // Audit (fire-and-forget; never blocks the user response).
  AuditService.logAction({
    actorType: "store_owner",
    actorId: userId,
    module: "AI Assistant",
    action: "chat.send",
    status: "success",
    severity: "low",
    storeId,
    summary: `Malla chat (${messages.length + 1} turns, ${response.tokensOut} tok out)`,
    entityType: "AIConversation",
    entityId: conversation._id,
    metadata: {
      provider: response.providerName,
      model: response.model,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      durationMs: response.durationMs,
      degraded,
    },
  }).catch(() => {});

  return {
    conversationId: conversation._id,
    userMessage: { id: userMsg._id, content: userMsg.content, role: "user" },
    assistantMessage: {
      id: assistantMsg._id,
      content: assistantMsg.content,
      role: "assistant",
      provider: response.providerName,
      model: response.model,
    },
    degraded,
    quotaState: "ok",
  };
}

function deriveTitle(text) {
  const first = String(text || "").split("\n")[0].trim();
  if (!first) return "Nouvelle conversation";
  return first.length > 80 ? `${first.slice(0, 77)}&` : first;
}

function buildSystemPrompt(ctx) {
  const lines = [SYSTEM_PROMPT, "", "## Contexte métier (déjà filtré pour ta boutique) :"];
  lines.push(`- Boutique : ${ctx.storeId || "(non résolue)"}`);
  if (ctx.module) lines.push(`- Page : ${ctx.module}${ctx.page ? ` / ${ctx.page}` : ""}`);
  lines.push(`- Langue de l'utilisateur : ${ctx.locale}`);
  lines.push(`- Devise : ${ctx.currency}`);
  if (ctx.storeSnapshot) {
    lines.push(`- Aperçu métier : ${JSON.stringify(ctx.storeSnapshot, null, 0).slice(0, 800)}`);
  }
  lines.push("", "N'utilise QUE les donnés ci-dessus. Si une information manque, dis-le.");
  return lines.join("\n");
}

/**
 * Streaming variant of sendMessage. Yields `{ type, ... }` events that
 * the controller pipes to the client as SSE frames:
 *   - { type: "chunk", delta }             one per token batch
 *   - { type: "tool", name, status }       tool call dispatched
 *   - { type: "done", payload }            final assistant message + ids
 *   - { type: "error", code, message }     failure
 *
 * The implementation mirrors sendMessage for the non-streaming
 * providers (Anthropic, Gemini, Mock): they buffer the full response
 * and yield a single chunk + done. SSE consumers stay the same.
 */
async function* streamMessage(req, options) {
  const { conversationId, message, pageContext, systemOverride } = options || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    yield { type: "error", code: "EMPTY_MESSAGE", message: "Le message est vide" };
    return;
  }
  if (message.length > 4000) {
    yield { type: "error", code: "MESSAGE_TOO_LONG", message: "Message trop long (max 4000 caractères)" };
    return;
  }

  let storeId; let userId;
  try {
    ({ storeId, userId } = await aiAuthz.assertCanUseAssistant(req));
  } catch (err) {
    yield { type: "error", code: err.code || "NO_PERMISSION", message: err.message };
    return;
  }

  try {
    await aiQuota.assertAndConsume({ storeId, type: aiQuota.AI_MESSAGES_DAILY, amount: 1 });
  } catch (err) {
    yield { type: "error", code: err.code || "AI_QUOTA_EXCEEDED", message: err.message, quota: err.info };
    return;
  }

  let conversation;
  try {
    if (conversationId) {
      conversation = await aiConversationService.ensureOwnership({ storeId, id: conversationId });
      if (!conversation) {
        yield { type: "error", code: "CONVERSATION_NOT_FOUND", message: "Conversation introuvable" };
        await aiQuota.refundOnFailure({ storeId, type: aiQuota.AI_MESSAGES_DAILY, amount: 1 });
        return;
      }
    } else {
      conversation = await aiConversationService.createConversation({
        storeId,
        userId,
        origin: pageContext || {},
        title: deriveTitle(message),
      });
    }
  } catch (err) {
    yield { type: "error", code: "INTERNAL", message: err.message };
    await aiQuota.refundOnFailure({ storeId, type: aiQuota.AI_MESSAGES_DAILY, amount: 1 });
    return;
  }

  const ip = normalizeIp(req.headers["x-forwarded-for"] || req.ip || null);
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();

  await aiConversationService.appendMessage({
    storeId,
    conversationId: conversation._id,
    role: "user",
    content: message.trim(),
    meta: { requestId, ip },
  });

  const ctx = await aiContextBuilder.build({ req, pageContext });
  const history = await aiConversationService.listMessages({ storeId, conversationId: conversation._id, limit: 30 });
  const recentHistory = history.slice(-30);
  const systemPrompt = systemOverride || buildSystemPrompt(ctx);
  const messages = recentHistory.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));

  const { provider, config, degraded } = await aiAuthz.loadProviderForStore(storeId);
  const apiKey = config ? require("./aiProviderConfigService").decryptApiKey(config.apiKeyCipher) : undefined;
  const toolsSpec = provider.supportsTools === false ? null : toolRegistry.OPENAI_TOOL_SPEC;

  let response;
  let accumulated = "";

  try {
    if (typeof provider.streamChat === "function" && provider.supportsTools !== false) {
      // First round: streaming provider.chat via streamChat. We don't yet
      // support tool_calls on the streaming path (tool_calls complicate
      // SSE  the provider sends tool_calls before content; for V1 we
      // run the tool loop on a buffered call, then stream the final
      // answer). If a tool call is detected, we buffer and switch.
      let streamResult = null;
      try {
        streamResult = await provider.streamChat(
          {
            messages,
            systemPrompt,
            model: provider._configModel || undefined,
            baseUrl: provider._configBaseUrl || undefined,
            apiKey,
            timeoutMs: config?.softLimits?.timeoutMs,
            maxTokens: config?.softLimits?.maxOutputTokensPerMessage,
            context: ctx,
            tools: toolsSpec,
          },
          (delta) => {
            accumulated += delta;
          }
        );
      } catch (err) {
        // Provider doesn't actually stream OR the call failed before any
        // content was produced. Fall back to a buffered chat call which
        // runs the tool loop, then yield the full result.
        const fallback = await provider.chat({
          messages,
          systemPrompt,
          model: provider._configModel || undefined,
          baseUrl: provider._configBaseUrl || undefined,
          apiKey,
          timeoutMs: config?.softLimits?.timeoutMs,
          maxTokens: config?.softLimits?.maxOutputTokensPerMessage,
          context: ctx,
          tools: toolsSpec,
        });
        response = await runToolLoop(fallback, { messages, systemPrompt, ctx, provider, config, apiKey, storeId, conversation, requestId });
        if (response.content) yield { type: "chunk", delta: response.content };
      }

      if (streamResult) {
        // If the stream surfaced tool_calls, run the tool loop now and
        // stream the final round. Otherwise yield the streamed content.
        if (Array.isArray(streamResult.toolCalls) && streamResult.toolCalls.length > 0) {
          const buffered = { ...streamResult, toolCalls: streamResult.toolCalls };
          const final = await runToolLoop(buffered, { messages, systemPrompt, ctx, provider, config, apiKey, storeId, conversation, requestId });
          if (final.content) yield { type: "chunk", delta: final.content };
          response = final;
        } else {
          response = streamResult;
        }
      }
    } else {
      // Provider without streaming: buffered call, then a single chunk.
      const buffered = await provider.chat({
        messages,
        systemPrompt,
        model: provider._configModel || undefined,
        baseUrl: provider._configBaseUrl || undefined,
        apiKey,
        timeoutMs: config?.softLimits?.timeoutMs,
        maxTokens: config?.softLimits?.maxOutputTokensPerMessage,
        context: ctx,
        tools: toolsSpec,
      });
      response = await runToolLoop(buffered, { messages, systemPrompt, ctx, provider, config, apiKey, storeId, conversation, requestId });
      if (response.content) yield { type: "chunk", delta: response.content };
    }
  } catch (err) {
    await aiQuota.refundOnFailure({ storeId, type: aiQuota.AI_MESSAGES_DAILY, amount: 1 });
    yield {
      type: "error",
      code: err.code || "PROVIDER_ERROR",
      message:
        err.code === "INVALID_KEY"
          ? "Clé IA invalide. Vérifiez la configuration dans les paramètres IA."
          : err.code === "PROVIDER_TIMEOUT"
          ? "La réponse prend trop de temps. Réssayez."
          : "Malla est temporairement indisponible. Veuillez réssayer dans quelques instants.",
    };
    return;
  }

  // Persist the final assistant message.
  const assistantMsg = await aiConversationService.appendMessage({
    storeId,
    conversationId: conversation._id,
    role: "assistant",
    content: response.content || "",
    meta: {
      provider: response.providerName,
      model: response.model,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      durationMs: response.durationMs,
      requestId,
    },
  });

  try {
    if (response.tokensOut > 0) {
      await aiQuota.assertAndConsume({ storeId, type: "ai_tokens_monthly", amount: response.tokensOut });
    }
  } catch (err) {
    logger.warn(`[ai] token quota accounting failed: ${err.message}`);
  }

  AuditService.logAction({
    actorType: "store_owner",
    actorId: userId,
    module: "AI Assistant",
    action: "chat.send",
    status: "success",
    severity: "low",
    storeId,
    summary: `Malla chat (${messages.length + 1} turns, ${response.tokensOut} tok out)`,
    entityType: "AIConversation",
    entityId: conversation._id,
    metadata: {
      provider: response.providerName,
      model: response.model,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      durationMs: response.durationMs,
      degraded,
      streamed: true,
    },
  }).catch(() => {});

  yield {
    type: "done",
    payload: {
      conversationId: conversation._id,
      userMessage: { id: null, content: message.trim(), role: "user" },
      assistantMessage: {
        id: assistantMsg._id,
        content: response.content || "",
        role: "assistant",
        provider: response.providerName,
        model: response.model,
      },
      degraded,
      quotaState: "ok",
    },
  };
}

/**
 * Shared tool loop, extracted so the streaming path can re-use the
 * exact same logic as the non-streaming path.
 */
async function runToolLoop(initialResponse, { messages, systemPrompt, ctx, provider, config, apiKey, storeId, conversation, requestId }) {
  const MAX_TOOL_ROUNDS = 4;
  let response = initialResponse;
  let rounds = 0;
  const baseReq = {
    systemPrompt,
    model: provider._configModel || undefined,
    baseUrl: provider._configBaseUrl || undefined,
    apiKey,
    timeoutMs: config?.softLimits?.timeoutMs,
    maxTokens: config?.softLimits?.maxOutputTokensPerMessage,
    context: ctx,
  };
  const toolsSpec = !storeId || provider.supportsTools === false ? null : toolRegistry.OPENAI_TOOL_SPEC;
  if (toolsSpec) baseReq.tools = toolsSpec;

  while (Array.isArray(response.toolCalls) && response.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const assistantForProvider = {
      role: "assistant",
      content: response.content || "",
      tool_calls: response.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
      })),
    };

    await aiConversationService.appendMessage({
      storeId,
      conversationId: conversation._id,
      role: "assistant",
      content: response.content || "",
      meta: {
        provider: response.providerName,
        model: response.model,
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        durationMs: response.durationMs,
        requestId,
        toolCalls: response.toolCalls.map((tc) => ({ name: tc.name, arguments: tc.arguments })),
      },
    });

    const toolResults = await Promise.all(
      response.toolCalls.map(async (tc) => {
        const data = await toolRegistry.dispatch(
          { storeId, userId: null, locale: ctx.locale, currency: ctx.currency },
          tc.name,
          tc.arguments || {}
        );
        return { id: tc.id, name: tc.name, result: data };
      })
    );

    for (const r of toolResults) {
      await aiConversationService.appendMessage({
        storeId,
        conversationId: conversation._id,
        role: "tool",
        content: JSON.stringify(r.result).slice(0, 16000),
        meta: { toolName: r.name, toolCallId: r.id, requestId },
      });
    }

    response = await provider.chat({
      ...baseReq,
      messages,
      previousAssistantToolCall: assistantForProvider,
      toolMessages: toolResults.map((r) => ({
        role: "tool",
        name: r.name,
        tool_call_id: r.id,
        content: JSON.stringify(r.result).slice(0, 16000),
      })),
    });
  }
  return response;
}

module.exports = {
  sendMessage,
  streamMessage,
  OrchestratorError,
  AuthzError: aiAuthz.AuthzError,
  AiQuotaError: aiQuota.AiQuotaError,
};