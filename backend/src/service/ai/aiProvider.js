/**
 * AIProvider  provider-agnostic interface for Malla.
 *
 * Implementations live in `./providers/*` and are stateless: every call
 * carries the full request. Implementations MUST NOT log or persist the
 * API key, the user message, or any payload beyond the `usage` counters
 * returned in the response.
 *
 * The contract:
 *   - `chat(request)` returns a full AIResponse (no streaming yet).
 *   - `streamChat(request, onChunk)` pushes text chunks via onChunk and
 *     returns the final AIResponse with token usage. Implementations
 *     that do not support streaming may throw an `UnsupportedError`.
 *   - Errors are normalized to the same shape (see AiError).
 */

class AiError extends Error {
  constructor(code, message, { provider, retriable = false, cause } = {}) {
    super(message);
    this.name = "AiError";
    this.code = code; // "PROVIDER_TIMEOUT" | "PROVIDER_ERROR" | "INVALID_KEY" | "UNSUPPORTED" | "RATE_LIMITED"
    this.provider = provider;
    this.retriable = retriable;
    if (cause) this.cause = cause;
  }
}

class UnsupportedError extends AiError {
  constructor(provider, feature) {
    super("UNSUPPORTED", `${provider} does not support ${feature}`, { provider });
  }
}

/**
 * @typedef {Object} AIMessage
 * @property {"system"|"user"|"assistant"|"tool"} role
 * @property {string} content
 * @property {string} [name]   tool name (for role="tool")
 *
 * @typedef {Object} AIRequest
 * @property {AIMessage[]} messages
 * @property {string} [systemPrompt]
 * @property {string} [model]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {Object} [context]        free-form business context
 * @property {string} providerName     "openai" | "openai-compatible" | ...
 * @property {string} apiKey           plaintext, never logged
 * @property {string} [baseUrl]
 * @property {number} [timeoutMs]
 *
 * @typedef {Object} AIResponse
 * @property {string} content
 * @property {string} model
 * @property {string} providerName
 * @property {number} tokensIn
 * @property {number} tokensOut
 * @property {number} durationMs
 *
 * @typedef {Object} AIProvider
 * @property {string} name
 * @property {(req: AIRequest) => Promise<AIResponse>} chat
 * @property {(req: AIRequest, onChunk: (chunk: string) => void) => Promise<AIResponse>} streamChat
 */

module.exports = { AiError, UnsupportedError };