const OpenAICompatibleProvider = require("./providers/OpenAICompatibleProvider");
const MockProvider = require("./providers/MockProvider");
const AnthropicProvider = require("./providers/AnthropicProvider");
const GeminiProvider = require("./providers/GeminiProvider");

/**
 * ProviderRegistry  single source of truth for "which provider handles
 * this store". The factory pattern keeps the AIOrchestrator free of
 * provider-specific code.
 *
 * Selection rules:
 *  1. If the active AIProviderConfig for the store exists and is enabled,
 *     instantiate the corresponding provider with its (decrypted) key.
 *  2. Else, fall back to MockProvider (so the widget never throws and the
 *     user can still see UI/streaming/local context).
 *
 * No provider secrets are ever passed to the orchestrator's callers.
 */

const REGISTRY = {
  mock: () => new MockProvider(),
  openai: () =>
    new OpenAICompatibleProvider({
      name: "openai",
      defaultBaseUrl: "https://api.openai.com/v1",
    }),
  "openai-compatible": () =>
    new OpenAICompatibleProvider({
      name: "openai-compatible",
      defaultBaseUrl: "https://api.openai.com/v1",
    }),
  groq: () =>
    new OpenAICompatibleProvider({
      name: "groq",
      defaultBaseUrl: "https://api.groq.com/openai/v1",
    }),
  openrouter: () =>
    new OpenAICompatibleProvider({
      name: "openrouter",
      defaultBaseUrl: "https://openrouter.ai/api/v1",
    }),
  mistral: () =>
    new OpenAICompatibleProvider({
      name: "mistral",
      defaultBaseUrl: "https://api.mistral.ai/v1",
    }),
  // Gemini uses a different transport (generateContent API).
  gemini: () =>
    new GeminiProvider({
      name: "gemini",
      defaultBaseUrl: "https://generativelanguage.googleapis.com",
    }),
  // Anthropic uses x-api-key + anthropic-version, separate top-level system field.
  anthropic: () =>
    new AnthropicProvider({
      name: "anthropic",
      defaultBaseUrl: "https://api.anthropic.com",
    }),
};

function getProvider(name) {
  const factory = REGISTRY[name];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${name}`);
  }
  return factory();
}

function listProviderNames() {
  return Object.keys(REGISTRY);
}

module.exports = { getProvider, listProviderNames, REGISTRY };