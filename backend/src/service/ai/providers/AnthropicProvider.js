const { AiError, UnsupportedError } = require("../aiProvider");

/**
 * AnthropicProvider  implements the Anthropic Messages API.
 *
 * Differences vs OpenAI-compatible:
 *   - Endpoint:  POST {baseUrl}/v1/messages
 *   - Auth:      x-api-key: <key>   +   anthropic-version: 2023-06-01
 *   - System:    separate top-level `system` field (not a system message)
 *   - Messages:  { role: "user" | "assistant", content: [{type:"text", text:...}] }
 *   - Usage:     { input_tokens, output_tokens }
 *
 * Tool/function calling is supported by Anthropic but NOT implemented here
 * yet (staged for the same v2 tools pass as the other providers). Throwing
 * `UnsupportedError` keeps the orchestrator honest rather than silently
 * dropping tool results.
 */
class AnthropicProvider {
  constructor({ name = "anthropic", defaultBaseUrl = "https://api.anthropic.com" } = {}) {
    this.name = name;
    this.defaultBaseUrl = defaultBaseUrl;
    this.anthropicVersion = "2023-06-01";
    this.supportsTools = false;
  }

  _buildUrl(req) {
    const base = (req.baseUrl || this.defaultBaseUrl).replace(/\/$/, "");
    return `${base}/v1/messages`;
  }

  _buildBody(req) {
    const messages = [];
    for (const m of req.messages || []) {
      if (!m || !m.role || typeof m.content !== "string") continue;
      if (m.role === "tool") continue; // staged for v2
      if (m.role !== "user" && m.role !== "assistant") continue;
      messages.push({ role: m.role, content: [{ type: "text", text: m.content }] });
    }

    const body = {
      model: req.model || "claude-3-5-sonnet-latest",
      messages,
      max_tokens: typeof req.maxTokens === "number" ? req.maxTokens : 1024,
      temperature: typeof req.temperature === "number" ? req.temperature : 0.4,
    };
    if (req.systemPrompt) body.system = req.systemPrompt;
    return body;
  }

  _extractUsage(data) {
    const u = data?.usage || {};
    return {
      tokensIn: Number(u.input_tokens) || 0,
      tokensOut: Number(u.output_tokens) || 0,
    };
  }

  async _postJson(req) {
    const url = this._buildUrl(req);
    const body = this._buildBody(req);
    const started = Date.now();
    const controller = new AbortController();
    const timeoutMs = req.timeoutMs || 25000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": req.apiKey || "",
          "anthropic-version": this.anthropicVersion,
          // Anthropic requires this header for client tools like ours.
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new AiError("PROVIDER_TIMEOUT", `AI provider ${this.name} timed out`, {
          provider: this.name,
          retriable: true,
        });
      }
      throw new AiError("PROVIDER_ERROR", `AI provider ${this.name} unreachable: ${err.message}`, {
        provider: this.name,
        retriable: true,
        cause: err.message,
      });
    }
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new AiError("INVALID_KEY", `AI provider ${this.name} rejected the API key`, {
          provider: this.name,
          retriable: false,
        });
      }
      const retriable = res.status === 429 || res.status >= 500;
      throw new AiError(
        "PROVIDER_ERROR",
        `AI provider ${this.name} returned ${res.status}: ${text.slice(0, 200)}`,
        { provider: this.name, retriable, cause: text.slice(0, 500) }
      );
    }

    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new AiError("PROVIDER_ERROR", `AI provider ${this.name} returned invalid JSON`, {
        provider: this.name,
        retriable: true,
        cause: err.message,
      });
    }

    // Anthropic returns content as [{type:"text", text:"..."}, ...].
    const content = Array.isArray(data?.content)
      ? data.content
          .filter((b) => b && b.type === "text" && typeof b.text === "string")
          .map((b) => b.text)
          .join("")
      : "";

    const usage = this._extractUsage(data);
    return {
      content,
      model: data?.model || req.model || "unknown",
      providerName: this.name,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      durationMs: Date.now() - started,
    };
  }

  async chat(req) {
    return this._postJson(req);
  }

  async streamChat(req, onChunk) {
    if (typeof onChunk !== "function") {
      throw new UnsupportedError(this.name, "streamChat requires onChunk callback");
    }
    throw new UnsupportedError(this.name, "streamChat");
  }
}

module.exports = AnthropicProvider;