const { AiError, UnsupportedError } = require("../aiProvider");

function safeParseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * OpenAI-compatible provider. Works against any endpoint that implements
 * `POST /chat/completions` with the same shape as OpenAI:
 *   - OpenAI:        https://api.openai.com/v1
 *   - Groq:          https://api.groq.com/openai/v1
 *   - OpenRouter:    https://openrouter.ai/api/v1
 *   - Mistral:       https://api.mistral.ai/v1
 *   - OpenAI-compat: any self-hosted / proxied model
 *
 * Auth header: `Authorization: Bearer <apiKey>`.
 *
 * Streaming format: `data: {json}\n\n` chunks, terminated by `data: [DONE]`.
 */
class OpenAICompatibleProvider {
  constructor({ name = "openai-compatible", defaultBaseUrl = "https://api.openai.com/v1" } = {}) {
    this.name = name;
    this.defaultBaseUrl = defaultBaseUrl;
    this.supportsTools = true;
  }

  _buildUrl(req) {
    const base = (req.baseUrl || this.defaultBaseUrl).replace(/\/$/, "");
    return `${base}/chat/completions`;
  }

  _buildBody(req) {
    const messages = this._buildMessages(req);
    // Interleave previous assistant tool_call message + tool results
    // before the next user turn when the orchestrator is running a
    // tool-loop iteration.
    if (req.previousAssistantToolCall) {
      messages.push(req.previousAssistantToolCall);
    }
    if (Array.isArray(req.toolMessages) && req.toolMessages.length > 0) {
      for (const tm of req.toolMessages) {
        messages.push({
          role: "tool",
          tool_call_id: tm.tool_call_id,
          name: tm.name || undefined,
          content: tm.content,
        });
      }
    }

    const body = {
      model: req.model || undefined,
      messages,
      temperature: typeof req.temperature === "number" ? req.temperature : 0.4,
      max_tokens: typeof req.maxTokens === "number" ? req.maxTokens : 800,
      stream: false,
    };

    if (Array.isArray(req.tools) && req.tools.length > 0) {
      body.tools = req.tools;
      body.tool_choice = req.toolChoice || "auto";
    }

    return body;
  }

  _buildMessages(req) {
    const out = [];
    if (req.systemPrompt) {
      out.push({ role: "system", content: req.systemPrompt });
    }
    for (const m of req.messages || []) {
      if (!m || !m.role || typeof m.content !== "string") continue;
      if (m.role === "tool") {
        // Forward tool results so the model sees its own tool_call responses
        // on subsequent turns. OpenAI expects { role: "tool", tool_call_id, content }.
        if (!m.tool_call_id) continue;
        out.push({
          role: "tool",
          tool_call_id: m.tool_call_id,
          name: m.name || undefined,
          content: m.content,
        });
        continue;
      }
      out.push({ role: m.role, content: m.content });
    }
    // Preserve any pending tool_calls emitted by the model on its previous turn.
    // The orchestrator handles that via `req.previousAssistantToolCall`.

    return out;
  }

  _extractUsage(data) {
    const u = data?.usage || {};
    return {
      tokensIn: Number(u.prompt_tokens) || 0,
      tokensOut: Number(u.completion_tokens) || 0,
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
          Authorization: `Bearer ${req.apiKey || ""}`,
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
      const retriable = res.status === 429 || res.status >= 500;
      if (res.status === 401 || res.status === 403) {
        throw new AiError("INVALID_KEY", `AI provider ${this.name} rejected the API key`, {
          provider: this.name,
          retriable: false,
        });
      }
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

    const choice = data?.choices?.[0] || {};
    const message = choice.message || {};
    const content = message.content || "";
    const usage = this._extractUsage(data);
    const out = {
      content,
      model: data?.model || req.model || "unknown",
      providerName: this.name,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      durationMs: Date.now() - started,
      finishReason: choice.finish_reason || null,
    };
    // Surface tool_calls so the orchestrator can run the tool loop.
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      out.toolCalls = message.tool_calls
        .filter((tc) => tc && tc.type === "function" && tc.function && tc.function.name)
        .map((tc) => ({
          id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
          name: tc.function.name,
          arguments: safeParseArgs(tc.function.arguments),
        }));
    }
    return out;
  }

  async chat(req) {
    return this._postJson(req);
  }

  async streamChat(req, onChunk) {
    // SSE transport for OpenAI-compatible providers. The endpoint URL
    // is the same /chat/completions used by `chat`, with `stream: true`
    // and `data: {...}\n\n` frames terminated by `data: [DONE]`.
    if (typeof onChunk !== "function") {
      throw new UnsupportedError(this.name, "streamChat requires onChunk callback");
    }

    const url = this._buildUrl(req);
    const body = this._buildBody(req);
    body.stream = true;
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
          Accept: "text/event-stream",
          Authorization: `Bearer ${req.apiKey || ""}`,
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
      throw new AiError(
        res.status === 401 || res.status === 403 ? "INVALID_KEY" : "PROVIDER_ERROR",
        `AI provider ${this.name} returned ${res.status}: ${text.slice(0, 200)}`,
        {
          provider: this.name,
          retriable: res.status === 429 || res.status >= 500,
          cause: text.slice(0, 500),
        }
      );
    }

    const reader = res.body?.getReader?.();
    if (!reader) {
      throw new AiError("PROVIDER_ERROR", `AI provider ${this.name}: streaming not supported`, {
        provider: this.name,
        retriable: false,
      });
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let promptTokens = 0;
    let completionTokens = 0;

    // Parse the SSE stream. Frame format:
    //   data: { "choices":[{"delta":{"content":"..."}}] }
    //   data: [DONE]
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, "").trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          buffer = "";
          break;
        }
        try {
          const evt = JSON.parse(payload);
          const delta = evt?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            fullText += delta;
            try {
              onChunk(delta);
            } catch (err) {
              // A consumer throw is the caller's problem; do not abort the
              // stream silently  surface to the logger and continue.
              require("../../../config/logger").warn(
                `[ai] stream consumer threw: ${err.message}`
              );
            }
          }
          if (evt?.usage) {
            promptTokens = Number(evt.usage.prompt_tokens) || promptTokens;
            completionTokens = Number(evt.usage.completion_tokens) || completionTokens;
          }
        } catch {
          // Skip malformed lines.
        }
      }
    }

    return {
      content: fullText,
      model: body.model || "unknown",
      providerName: this.name,
      tokensIn: promptTokens,
      tokensOut: completionTokens,
      durationMs: Date.now() - started,
    };
  }
}

module.exports = OpenAICompatibleProvider;