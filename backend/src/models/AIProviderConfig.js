const mongoose = require("mongoose");

/**
 * AIProviderConfig  per-store configuration of which AI provider/model
 * Malla should use, plus the encrypted API key.
 *
 * Security:
 *  - `apiKey` is stored as ciphertext. Encryption is performed by the
 *    `AiProviderConfigService.encrypt` helper (AES-256-GCM, key derived
 *    from `process.env.AI_PROVIDER_ENCRYPTION_KEY`).
 *  - The plaintext key is NEVER returned by any GET endpoint; only a
 *    `hasApiKey: true|false` flag is exposed.
 *  - One doc per (storeId, providerName).
 */
const aiProviderConfigSchema = new mongoose.Schema(
  {
    storeId: {
      // Required for store-scoped configs; null for the single
      // platform-wide default config (one per provider).
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },
    providerName: {
      type: String,
      enum: ["openai", "openai-compatible", "gemini", "groq", "openrouter", "mistral", "mock"],
      required: true,
    },
    model: {
      type: String,
      default: "",
    },
    baseUrl: {
      type: String,
      default: "",
    },
    // Ciphertext, never plaintext.
    apiKeyCipher: { type: String, default: null },
    apiKeyLast4: { type: String, default: null },

    // Default selection: only one provider can be `isDefault=true` per store.
    isDefault: { type: Boolean, default: false, index: true },

    enabled: { type: Boolean, default: true },

    // Soft caps applied at the orchestrator level (independent of plan quota).
    softLimits: {
      maxInputTokensPerMessage: { type: Number, default: 4000 },
      maxOutputTokensPerMessage: { type: Number, default: 1000 },
      timeoutMs: { type: Number, default: 25000 },
    },
  },
  {
    collection: "ai_provider_configs",
    timestamps: true,
  }
);

aiProviderConfigSchema.index(
  { storeId: 1, providerName: 1 },
  { unique: true, name: "store_provider_unique" }
);

// Only one default per store  enforced by a partial index.
aiProviderConfigSchema.index(
  { storeId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: "store_default_unique",
  }
);

const AIProviderConfig = mongoose.model("AIProviderConfig", aiProviderConfigSchema);

module.exports = AIProviderConfig;