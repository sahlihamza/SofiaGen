/**
 * Pure helpers for the Malla widget. No React, no network.
 * Kept in a separate module so they can be unit-tested in isolation.
 */

export const SUGGESTIONS_BY_MODULE = Object.freeze({
  dashboard: [
    { id: "d-sales", key: "suggestion.sales.summary", icon: "📊" },
    { id: "d-orders", key: "suggestion.orders.summary", icon: "🛒" },
    { id: "d-stock", key: "suggestion.stock.low", icon: "⚠️" },
  ],
  orders: [
    { id: "o-needs-attention", key: "suggestion.orders.attention", icon: "📦" },
    { id: "o-summary", key: "suggestion.orders.summary", icon: "📊" },
    { id: "o-sales", key: "suggestion.sales.summary", icon: "💰" },
  ],
  products: [
    { id: "p-low-stock", key: "suggestion.stock.low", icon: "📦" },
    { id: "p-top", key: "suggestion.products.top", icon: "📈" },
    { id: "p-ideas", key: "suggestion.products.ideas", icon: "💡" },
  ],
  customers: [
    { id: "c-top", key: "suggestion.customers.top", icon: "👥" },
    { id: "c-summary", key: "suggestion.customers.summary", icon: "📊" },
  ],
  default: [
    { id: "x-help", key: "suggestion.help", icon: "❓" },
    { id: "x-summary", key: "suggestion.sales.summary", icon: "📊" },
  ],
});

/**
 * Returns the suggestion list for a given page module.
 * @param {string|null} moduleKey
 */
export function getSuggestionsForPage(moduleKey) {
  if (!moduleKey) return SUGGESTIONS_BY_MODULE.default;
  return SUGGESTIONS_BY_MODULE[moduleKey] || SUGGESTIONS_BY_MODULE.default;
}

/**
 * Quota helpers — return a percentage + a state suitable for the
 * progress bar in the widget footer.
 */
export function summarizeQuota(quota) {
  if (!quota) return { percent: 0, state: "unknown", label: "—" };
  if (quota.limit === null || quota.limit === undefined) {
    return { percent: 0, state: "unlimited", label: "∞" };
  }
  const percent = Math.min(100, Math.round((quota.used / Math.max(quota.limit, 1)) * 100));
  return {
    percent,
    state: quota.state || "normal",
    label: `${quota.used} / ${quota.limit}`,
  };
}

/**
 * Maps a backend error code to a human-friendly, client-safe message.
 * The orchestrator already strips provider internals, so we just need
 * to pick the right copy for the UI.
 */
export function explainError(err) {
  const code = err?.response?.data?.code || err?.code;
  const message = err?.response?.data?.message || err?.message;
  switch (code) {
    case "AI_QUOTA_EXCEEDED":
      return {
        title: "Limite atteinte",
        body: "Vous avez utilisé toutes les interactions IA incluses dans votre plan.",
        action: "quota",
      };
    case "PROVIDER_TIMEOUT":
      return {
        title: "Réponse lente",
        body: "Malla met trop de temps à répondre. Réessayez dans quelques instants.",
        action: "retry",
      };
    case "INVALID_KEY":
      return {
        title: "Clé IA invalide",
        body: "La clé du fournisseur IA est rejetée. Vérifiez la configuration dans les paramètres IA.",
        action: "settings",
      };
    case "NO_PERMISSION":
      return {
        title: "Accès refusé",
        body: "Vous n'avez pas la permission d'utiliser l'assistant IA.",
        action: "none",
      };
    case "CONVERSATION_NOT_FOUND":
      return {
        title: "Conversation introuvable",
        body: "Cette conversation a peut-être été supprimée. Démarrez-en une nouvelle.",
        action: "reset",
      };
    default:
      return {
        title: "Malla indisponible",
        body: message || "Une erreur est survenue. Réessayez.",
        action: "retry",
      };
  }
}

/**
 * Title-derivation helper for new conversations. Mirrors the backend.
 */
export function deriveConversationTitle(text, max = 80) {
  const first = String(text || "").split("\n")[0].trim();
  if (!first) return "Nouvelle conversation";
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}