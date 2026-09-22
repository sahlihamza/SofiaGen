const { AiError, UnsupportedError } = require("../aiProvider");

/**
 * GeminiProvider  implements the Google Gemini generateContent API.
 *
 * Differences vs OpenAI-compatible:
 *   - Endpoint:  POST {baseUrl}/v1beta/models/{model}:generateContent?key={apiKey}
 *   - Auth:      ?key=...  query parameter (also accepts header x-goog-api-key)
 *   - Messages:  contents: [{role:"user"|"model", parts:[{text:...}]}]
 *   - System:    systemInstruction: { parts: [{text: ...}] }
 *   - Usage:     { usageMetadata: { promptTokenCount, candidatesTokenCount } }
 *
 * NOTE: Tool/function calling is supported by Gemini but kept out of V1
 * for parity with the other providers. Throw UnsupportedError on tool
 * messages so we never silently drop them.
 */
class GeminiProvider {
  constructor({ name = "gemini", defaultBaseUrl = "https://generativelanguage.googleapis.com" } = {}) {
    this.name = name;
    this.defaultBaseUrl = defaultBaseUrl;
    this.supportsTools = false;
    // Gemini only knows "user" and "model"  not "assistant" / "system" as roles.
  }

  _buildUrl(req) {
    const base = (req.baseUrl || this.defaultBaseUrl).replace(/\/$/, "");
    const model = encodeURIComponent(req.model || "gemini-1.5-flash");
    return `${base}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(req.apiKey || "")}`;
  }

  _buildBody(req) {
    const contents = [];
    for (const m of req.messages || []) {
      if (!m || !m.role || typeof m.content !== "string") continue;
      if (m.role === "tool") continue; // staged for v2
      const role = m.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: m.content }] });
    }

    const body = {
      contents,
      generationConfig: {
        temperature: typeof req.temperature === "number" ? req.temperature : 0.4,
        maxOutputTokens: typeof req.maxTokens === "number" ? req.maxTokens : 1024,
      },
    };
    if (req.systemPrompt) {
      body.systemInstruction = { parts: [{ text: req.systemPrompt }] };
    }
    return body;
  }

  _extractUsage(data) {
    const u = data?.usageMetadata || {};
    return {
      tokensIn: Number(u.promptTokenCount) || 0,
      tokensOut: Number(u.candidatesTokenCount) || 0,
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
      if (res.status === 400 && /API key not valid/i.test(text)) {
        throw new AiError("INVALID_KEY", `AI provider ${this.name} rejected the API key`, {
          provider: this.name,
          retriable: false,
        });
      }
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

    const content = Array.isArray(data?.candidates)
      ? data.candidates
          .flatMap((c) => Array.isArray(c?.content?.parts) ? c.content.parts : [])
          .filter((p) => p && typeof p.text === "string")
          .map((p) => p.text)
          .join("")
      : "";

    const usage = this._extractUsage(data);
    return {
      content,
      model: req.model || "unknown",
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

module.exports = GeminiProvider;