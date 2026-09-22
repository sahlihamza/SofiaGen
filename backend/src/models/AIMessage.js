const mongoose = require("mongoose");

/**
 * AIMessage  single message in a Malla conversation.
 *
 * Sensitive content rules (security model):
 *  - The `content` field stores what was actually shown to the user and
 *    what the user typed. NEVER store provider API keys, customer PII
 *    payloads, or full request/response envelopes.
 *  - The `metadata` field is opt-in: only safe counters, model names,
 *    tool-call summaries. If a tool returned a sensitive payload, store
 *    its shape (counts, ids)  not the values.
 */
const aiMessageSchema = new mongoose.Schema(
  {
    storeId: {
      // Required for store-scoped messages; null for platform messages.
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIConversation",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      maxlength: 16000,
    },

    // Provider/model that produced this message (assistant only).
    provider: { type: String, default: null },
    model: { type: String, default: null },

    // Token accounting (assistant + tool messages).
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },

    // Free-text error code when an assistant message failed.
    // NEVER a stack trace or a raw provider response.
    errorCode: { type: String, default: null },

    // When the message originated from a tool call. We persist a small,
    // safe summary of the call so the user can see what Malla did, but
    // not the underlying customer/order payloads.
    toolCall: {
      name: { type: String, default: null },
      argumentsDigest: { type: String, default: null },
      status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "failed", "rejected"],
        default: "pending",
      },
      entityType: { type: String, default: null },
      entityId: { type: String, default: null },
    },

    // Audit fields  set by the orchestrator, never by the client.
    requestId: { type: String, default: null },
    ip: { type: String, default: null },
  },
  {
    collection: "ai_messages",
    timestamps: true,
  }
);

aiMessageSchema.index(
  { storeId: 1, conversationId: 1, createdAt: 1 },
  { name: "store_conversation_created" }
);

const AIMessage = mongoose.model("AIMessage", aiMessageSchema);

module.exports = AIMessage;