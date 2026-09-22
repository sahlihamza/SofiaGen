const mongoose = require("mongoose");

/**
 * AIConversation  Malla chat thread.
 *
 * Multi-tenant: every conversation is bound to ONE store (the store the
 * user was on when they created it). The storeId is the primary access
 * path; a user from store A can never see or mutate a conversation that
 * belongs to store B, even if they share the same role name.
 *
 * Identity: userId is the staff who owns the conversation. It is taken
 * from `req.authContext.userId` server-side, NEVER from the request body.
 */
const aiConversationSchema = new mongoose.Schema(
  {
    storeId: {
      // Required for store-scoped conversations; null is reserved for
      // super-admin / platform-scope conversations (no active store).
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    // The page/context where the conversation was started. Useful to
    // re-hydrate the system prompt if the user comes back later.
    origin: {
      module: { type: String, default: null },
      page: { type: String, default: null },
      locale: { type: String, default: "fr" },
      currency: { type: String, default: "TND" },
    },

    // The provider that answered the LAST assistant message in this
    // conversation. Stamped at save time, never trusted from the client.
    provider: {
      name: { type: String, default: null },
      model: { type: String, default: null },
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },

    // Soft totals  useful for dashboard counters without scanning messages.
    messageCount: { type: Number, default: 0 },
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: null },

    archivedAt: { type: Date, default: null },
  },
  {
    collection: "ai_conversations",
    timestamps: true,
  }
);

aiConversationSchema.index(
  { storeId: 1, userId: 1, status: 1, lastMessageAt: -1 },
  { name: "store_user_status_lastmsg" }
);

aiConversationSchema.index(
  { storeId: 1, status: 1, updatedAt: -1 },
  { name: "store_status_updated" }
);

const AIConversation = mongoose.model("AIConversation", aiConversationSchema);

module.exports = AIConversation;