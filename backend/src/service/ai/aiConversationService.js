const AIConversation = require("../../models/AIConversation");
const AIMessage = require("../../models/AIMessage");
const cache = require("../../lib/cache");

/**
 * aiConversationService  persistence layer for Malla conversations and
 * messages. All queries are **store-scoped** (req.authContext.storeId).
 * The conversation owner is always the calling user; the API never
 * trusts `req.body.userId`.
 */

async function createConversation({ storeId, userId, origin, title = "", provider = null }) {
  const doc = await AIConversation.create({
    storeId,
    userId,
    origin: origin || {},
    title: title || "Nouvelle conversation",
    provider: provider || {},
    status: "active",
  });
  return doc;
}

async function getConversation({ storeId, id }) {
  return AIConversation.findOne({ _id: id, storeId, status: { $ne: "archived" } }).lean();
}

async function listConversations({ storeId, userId = null, limit = 50, status = "active" }) {
  const q = { storeId, status };
  if (userId) q.userId = userId;
  return AIConversation.find(q).sort({ lastMessageAt: -1, updatedAt: -1 }).limit(limit).lean();
}

async function archiveConversation({ storeId, id }) {
  return AIConversation.findOneAndUpdate(
    { _id: id, storeId },
    { $set: { status: "archived", archivedAt: new Date() } },
    { new: true }
  );
}

async function deleteConversation({ storeId, id }) {
  // Hard delete messages first, then the conversation. The audit log
  // is the system of record, not this collection.
  await AIMessage.deleteMany({ storeId, conversationId: id });
  return AIConversation.deleteOne({ _id: id, storeId });
}

async function appendMessage({ storeId, conversationId, role, content, meta = {} }) {
  const doc = await AIMessage.create({
    storeId,
    conversationId,
    role,
    content,
    provider: meta.provider || null,
    model: meta.model || null,
    tokensIn: meta.tokensIn || 0,
    tokensOut: meta.tokensOut || 0,
    durationMs: meta.durationMs || 0,
    errorCode: meta.errorCode || null,
    toolCall: meta.toolCall || (Array.isArray(meta.toolCalls) && meta.toolCalls.length > 0
        ? { name: meta.toolCalls[0].name, argumentsDigest: JSON.stringify(meta.toolCalls[0].arguments || {}).slice(0, 1000), status: "pending" }
        : undefined),
    requestId: meta.requestId || null,
    ip: meta.ip || null,
  });

  await AIConversation.updateOne(
    { _id: conversationId, storeId },
    {
      $inc: { messageCount: 1, tokensIn: meta.tokensIn || 0, tokensOut: meta.tokensOut || 0 },
      $set: {
        lastMessageAt: doc.createdAt,
        provider: {
          name: meta.provider || undefined,
          model: meta.model || undefined,
        },
      },
    }
  );

  await cache.delPattern(`ai:convs:${storeId}:*`);
  return doc;
}

async function listMessages({ storeId, conversationId, limit = 200 }) {
  return AIMessage.find({ storeId, conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

async function ensureOwnership({ storeId, id }) {
  // Returns the conversation only if it belongs to the active store.
  return AIConversation.findOne({ _id: id, storeId }).lean();
}

module.exports = {
  createConversation,
  getConversation,
  listConversations,
  archiveConversation,
  deleteConversation,
  appendMessage,
  listMessages,
  ensureOwnership,
};