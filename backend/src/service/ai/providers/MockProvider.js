const { AiError, UnsupportedError } = require("../aiProvider");

/**
 * MockProvider  deterministic, dependency-free provider used in:
 *   - unit tests,
 *   - dev / preview environments without an API key,
 *   - safe fallback when the configured provider is unavailable.
 *
 * Behavior: echoes a short, multilingual acknowledgement plus, if a
 * business context is provided, a tiny digest of the most relevant keys.
 * NEVER reveals raw payloads.
 */
class MockProvider {
  constructor() {
    this.name = "mock";
    this.supportsTools = false;
  }

  _replyText(req) {
    const last = [...(req.messages || [])].reverse().find((m) => m.role === "user");
    const userText = (last?.content || "").trim();

    const locale = (req.context && req.context.locale) || "fr";
    const hello = locale === "ar" ? "E1-('" : locale === "en" ? "Hi" : "Bonjour";

    const head = `${hello} ! Je suis Malla, l'assistant Sofiagen. `;
    const echo = userText
      ? `Vous m'avez demandé :  ${userText.slice(0, 200)}${userText.length > 200 ? "&" : ""}. `
      : "";

    let body =
      "Je peux vous aider avec vos ventes, commandes, produits, stock, clients et configuration de votre boutique. " +
      "Dites-moi ce que vous souhaitez analyser.";

    if (req.context && req.context.module) {
      body = `Je vois que vous êtes sur la page **${req.context.module}**${req.context.page ? ` (${req.context.page})` : ""}. ` +
        "Que souhaitez-vous savoir  ce sujet ?";
    }

    return `${head}${echo}${body}`;
  }

  _fakeUsage(req) {
    const text = this._replyText(req);
    // Rough heuristic so the counters look believable in dev.
    const tokensIn = Math.ceil(JSON.stringify(req.messages || []).length / 4);
    const tokensOut = Math.ceil(text.length / 4);
    return { tokensIn, tokensOut, content: text };
  }

  async chat(req) {
    const started = Date.now();
    const { tokensIn, tokensOut, content } = this._fakeUsage(req);
    return {
      content,
      model: "mock",
      providerName: this.name,
      tokensIn,
      tokensOut,
      durationMs: Date.now() - started,
    };
  }

  async streamChat(req, onChunk) {
    if (typeof onChunk !== "function") {
      throw new UnsupportedError(this.name, "streamChat requires onChunk callback");
    }
    const text = this._replyText(req);
    // Emit 4-character chunks with a tiny delay to mimic a real stream.
    const started = Date.now();
    for (let i = 0; i < text.length; i += 4) {
      onChunk(text.slice(i, i + 4));
      await new Promise((r) => setTimeout(r, 8));
    }
    return {
      content: text,
      model: "mock",
      providerName: this.name,
      tokensIn: Math.ceil(JSON.stringify(req.messages || []).length / 4),
      tokensOut: Math.ceil(text.length / 4),
      durationMs: Date.now() - started,
    };
  }
}

module.exports = MockProvider;