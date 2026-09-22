const test = require("node:test");
const assert = require("node:assert/strict");

// Pre-load the dependencies we want to stub so we can mutate their
// `module.exports` BEFORE the orchestrator is required. The orchestrator
// does `const { foo } = require("./aiXyz")`, so we replace the live
// `module.exports` object — destructuring then resolves to our stub.
const aiConversationServiceModule = require("../../../src/service/ai/aiConversationService");
const aiAuthzModule = require("../../../src/service/ai/aiAuthorizationService");
const aiQuotaModule = require("../../../src/service/ai/aiQuotaService");
const aiContextModule = require("../../../src/service/ai/aiContextBuilder");
const MockProvider = require("../../../src/service/ai/providers/MockProvider");
const aiOrchestratorModule = require("../../../src/service/ai/aiOrchestrator");

// The orchestrator holds direct references to these functions. To swap
// them cleanly without touching production code, we replace the live
// module.exports objects so any `require()` after this point sees the
// stub — and we also patch the already-destructured local refs by
// keeping the same function identity across the test.
function replaceAll(obj, methods) {
  for (const [k, v] of Object.entries(methods)) {
    obj[k] = v;
  }
}

function fakeReq({ user, storeId, permissions, ip = "127.0.0.1" } = {}) {
  return {
    user,
    authContext: {
      storeId,
      userId: user?._id,
      permissions: new Set(permissions || []),
    },
    headers: { "x-forwarded-for": ip },
    ip,
  };
}

let sharedCalls;
let sharedProvider;

function installStubs({ providerChatImpl } = {}) {
  const calls = {
    appendUser: [],
    appendAssistant: [],
    quotaConsume: [],
    quotaRefund: [],
    ensureOwnership: [],
  };
  sharedCalls = calls;

  const convId = "64a0000000000000000000aa";
  const fakeConv = { _id: convId, storeId: "STORE-A", userId: "user-1" };

  // The orchestrator does `const aiConversationService = require(...)` and
  // then calls `aiConversationService.createConversation(...)` via the
  // captured binding. To override, we mutate the same exported object
  // (the orchestrator captured the OBJECT, not the function), so this
  // works as long as we keep the object identity stable.
  // Replace the entire exports object so destructured refs pick up
  // the new methods too.
  Object.assign(aiConversationServiceModule, {
    createConversation: async ({ title, origin }) => ({ ...fakeConv, title, origin }),
    ensureOwnership: async ({ storeId, id }) => {
      calls.ensureOwnership.push({ storeId, id });
      if (id !== convId) return null;
      return { ...fakeConv, _id: id };
    },
    appendMessage: async (payload) => {
      calls[calls._seq = (calls._seq || 0) + 1];
      const row = { _id: `m${calls.appendUser.length + calls.appendAssistant.length + 1}`, createdAt: new Date(), ...payload };
      if (payload.role === "user") calls.appendUser.push(row);
      else if (payload.role === "assistant") calls.appendAssistant.push(row);
      return row;
    },
    listMessages: async () => [],
  });

  Object.assign(aiAuthzModule, {
    assertCanUseAssistant: async (req) => {
      if (!req.user) throw new Error("NO USER");
      return { storeId: String(req.authContext.storeId), userId: String(req.user._id) };
    },
    loadProviderForStore: async () => {
      // Always create a fresh provider so a previous test's chat override
      // does not leak into the next one.
      sharedProvider = new MockProvider();
      if (providerChatImpl) sharedProvider.chat = providerChatImpl;
      return { provider: sharedProvider, config: null, degraded: true };
    },
    AuthzError: class AuthzError extends Error {},
  });

  Object.assign(aiQuotaModule, {
    assertAndConsume: async ({ storeId, type, amount }) => {
      calls.quotaConsume.push({ storeId, type, amount });
      return { allowed: true, used: 0, limit: 100, remaining: 100, state: "ok" };
    },
    refundOnFailure: async ({ storeId, type, amount }) => {
      calls.quotaRefund.push({ storeId, type, amount });
    },
    AiQuotaError: class AiQuotaError extends Error {},
  });

  Object.assign(aiContextModule, {
    build: async ({ pageContext }) => ({
      module: pageContext?.module || "dashboard",
      page: pageContext?.page || "dashboard",
      storeId: "STORE-A",
      userId: "user-1",
      locale: pageContext?.locale || "fr",
      currency: pageContext?.currency || "TND",
      pageData: {},
    }),
  });

  return { calls, convId };
}

const { sendMessage, OrchestratorError } = aiOrchestratorModule;

test("orchestrator — happy path returns assistant message + conversationId", async () => {
  const { calls, convId } = installStubs();
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  const result = await sendMessage(req, { message: "Bonjour Malla" });
  assert.equal(result.conversationId, convId);
  assert.equal(result.assistantMessage.role, "assistant");
  assert.equal(result.assistantMessage.provider, "mock");
  assert.match(result.assistantMessage.content, /Malla/);
  assert.equal(calls.appendUser.length, 1);
  assert.equal(calls.appendAssistant.length, 1);
  assert.equal(calls.appendUser[0].role, "user");
  assert.equal(calls.appendUser[0].content, "Bonjour Malla");
  assert.ok(calls.appendUser[0].meta?.requestId, "user message must carry a requestId for audit");
});

test("orchestrator — empty message → 400 EMPTY_MESSAGE", async () => {
  installStubs();
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  await assert.rejects(
    () => sendMessage(req, { message: "   " }),
    (err) => err instanceof OrchestratorError && err.code === "EMPTY_MESSAGE" && err.httpStatus === 400
  );
});

test("orchestrator — message too long → 400", async () => {
  installStubs();
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  await assert.rejects(
    () => sendMessage(req, { message: "x".repeat(5000) }),
    (err) => err instanceof OrchestratorError && err.code === "MESSAGE_TOO_LONG"
  );
});

test("orchestrator — unauthenticated propagates", async () => {
  installStubs();
  const req = fakeReq({ user: null, storeId: null, permissions: [] });
  await assert.rejects(() => sendMessage(req, { message: "hi" }));
});

test("orchestrator — uses authContext.storeId, NEVER the body", async () => {
  const { calls } = installStubs();
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  await sendMessage(req, {
    message: "x",
    storeId: "STORE-B-HACK",
    pageContext: { storeId: "STORE-B-HACK", module: "dashboard" },
  });
  assert.equal(calls.appendUser[0].storeId, "STORE-A");
  assert.equal(calls.appendAssistant[0].storeId, "STORE-A");
  assert.equal(calls.quotaConsume[0].storeId, "STORE-A");
  assert.equal(calls.ensureOwnership.length, 0, "no ownership check when conversationId is omitted");
});

test("orchestrator — on provider failure, the daily quota is refunded", async () => {
  const { calls } = installStubs({
    providerChatImpl: async () => {
      const err = new Error("upstream down");
      err.code = "PROVIDER_ERROR";
      throw err;
    },
  });
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  await assert.rejects(() => sendMessage(req, { message: "x" }));
  assert.equal(calls.quotaRefund.length, 1, "refundOnFailure must be called on provider error");
  assert.equal(calls.quotaRefund[0].storeId, "STORE-A");
  assert.equal(calls.appendAssistant.length, 0, "no assistant message must be persisted on failure");
});

test("orchestrator — on invalid key, returns a client-safe 502", async () => {
  installStubs({
    providerChatImpl: async () => {
      const err = new Error("bad key");
      err.code = "INVALID_KEY";
      throw err;
    },
  });
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  await assert.rejects(
    () => sendMessage(req, { message: "x" }),
    (err) =>
      err instanceof OrchestratorError &&
      err.code === "INVALID_KEY" &&
      /Clé IA invalide/.test(err.message) &&
      err.httpStatus === 502
  );
});

test("orchestrator — reuses an existing conversation when conversationId matches", async () => {
  const { calls, convId } = installStubs();
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  const result = await sendMessage(req, {
    message: "Salut",
    conversationId: convId,
  });
  assert.equal(result.conversationId, convId);
  assert.equal(calls.ensureOwnership[0].id, convId);
  assert.equal(calls.ensureOwnership[0].storeId, "STORE-A");
});

test("orchestrator — conversationId from another store is rejected as 404", async () => {
  installStubs();
  const req = fakeReq({
    user: { _id: "user-1" },
    storeId: "STORE-A",
    permissions: ["ai.assistant.use"],
  });
  await assert.rejects(
    () => sendMessage(req, { message: "x", conversationId: "64a0000000000000000000bb" }),
    (err) =>
      err instanceof OrchestratorError &&
      err.code === "CONVERSATION_NOT_FOUND" &&
      err.httpStatus === 404
  );
});