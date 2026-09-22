import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSuggestionsForPage, summarizeQuota } from "./assistant.utils";
import { IconButton, SecondaryButton, Button } from "@sofia/ui";


/**
 * Pure UI: header, message list, input, suggestions, quota footer.
 * The state machine lives in `useAssistantChat`; this component only
 * renders and dispatches UI intents.
 */
const AssistantWidget = ({
  chat, // result of useAssistantChat()
  pageContext,
}) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir ? i18n.dir() : "ltr";
  const [input, setInput] = useState("");
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chat.messages, chat.pendingAssistant]);

  const suggestions = getSuggestionsForPage(pageContext?.module);
  const daily = chat.usage?.ai_messages_daily;
  const dailySummary = summarizeQuota(daily);
  const isLoading = chat.state === "loading";
  const isOpen = chat.state !== "closed" && chat.state !== "minimized";
  const isQuota = chat.state === "quota";
  const isOffline = chat.state === "offline";
  const isError = chat.state === "error";

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    chat.sendMessage(text);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label={t("ai.title", "Malla — Assistant IA")}
      aria-busy={isLoading}
      data-state={chat.state}
      dir={dir}
      className="fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] max-w-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:bottom-6 sm:right-6"
      style={{ height: "min(640px, calc(100vh - 4rem))" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-white dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-2xl">🐰</span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{t("ai.title", "Malla Assistant IA")}</h2>
            <p className="flex items-center gap-1 text-[11px] text-emerald-50">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-200" />
              {isOffline
                ? t("ai.status.offline", "Hors ligne")
                : t("ai.status.online", "En ligne")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            onClick={chat.minimize}
            aria-label={t("ai.action.minimize", "Réduire")}
            className="rounded p-1 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </IconButton>
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            onClick={chat.close}
            aria-label={t("ai.action.close", "Fermer")}
            className="rounded p-1 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </div>
      </header>

      {/* Conversation list (history) */}
      {chat.capabilities?.features?.history && (
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 text-xs dark:border-gray-700">
          <SecondaryButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={chat.startNewConversation}
            className="rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            + {t("ai.action.new", "Nouvelle conversation")}
          </SecondaryButton>
          {chat.conversationId && (
            <span className="truncate text-gray-500 dark:text-gray-400">
              {t("ai.conversation.active", "Conversation active")}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesRef}
        className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-3 dark:bg-gray-900"
      >
        {chat.messages.length === 0 && (
          <EmptyState t={t} />
        )}

        {chat.messages.map((m) => (
          <Bubble key={m.id} message={m} t={t} />
        ))}

        {chat.pendingAssistant && <Bubble message={chat.pendingAssistant} t={t} pending />}

        {/* Suggestions — only when there's no message yet. */}
        {chat.messages.length === 0 && !chat.pendingAssistant && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <SecondaryButton
                key={s.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => chat.sendMessage(t(s.key, s.id))}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="me-1" aria-hidden="true">{s.icon}</span>
                {t(s.key, s.id)}
              </SecondaryButton>
            ))}
          </div>
        )}

        {isError && chat.error && (
          <ErrorBanner error={chat.error} onDismiss={chat.dismissError} t={t} />
        )}

        {isQuota && (
          <QuotaBanner t={t} onUsage={chat.refreshUsage} />
        )}

        {isOffline && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            {t("ai.error.offline", "Vous êtes hors ligne. Malla reprendra dès que la connexion sera rétablie.")}
          </p>
        )}
      </div>

      {/* Quota footer */}
      {daily && (
        <div className="border-t border-gray-200 px-4 py-2 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>
              {t("ai.usage.today", "IA aujourd'hui")}
            </span>
            <span className="tabular-nums">
              {dailySummary.label}
            </span>
          </div>
          {dailySummary.state !== "unlimited" && (
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={[
                  "h-full transition-all",
                  dailySummary.state === "blocked"
                    ? "bg-red-500"
                    : dailySummary.state === "critical"
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                ].join(" ")}
                style={{ width: `${dailySummary.percent}%` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <label htmlFor="ai-assistant-input" className="sr-only">
            {t("ai.input.label", "Écrire un message")}
          </label>
          <textarea
            id="ai-assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isLoading || isQuota || isOffline}
            placeholder={t("ai.input.placeholder", "Écrire un message…")}
            rows={1}
            className="min-h-[40px] flex-1 resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          {isLoading ? (
            <SecondaryButton
              type="button"
              onClick={chat.cancel}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {t("ai.action.stop", "Stop")}
            </SecondaryButton>
          ) : (
            <PrimaryButton
              type="button"
              onClick={onSend}
              disabled={!input.trim() || isQuota || isOffline}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-40"
              aria-label={t("ai.action.send", "Envoyer")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </PrimaryButton>
          )}
        </div>
        {chat.degraded && (
          <p className="mt-1 text-[10px] text-gray-400">
            {t("ai.degraded", "Malla tourne en mode dégradé (pas de clé fournisseur configurée).")}
          </p>
        )}
      </div>
    </div>
  );
};

const Bubble = ({ message, t, pending }) => {
  const isUser = message.role === "user";
  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isUser
            ? "rounded-br-sm bg-emerald-600 text-white"
            : "rounded-bl-sm bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100",
        ].join(" ")}
      >
        {!isUser && (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            🐰 {t("ai.assistantName", "Malla")}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">
          {message.content || (pending ? t("ai.thinking", "Malla réfléchit…") : "")}
        </p>
        {pending && (
          <span className="mt-1 inline-flex gap-1" aria-label={t("ai.thinking", "Malla réfléchit…")}>
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ t }) => (
  <div className="rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
    <p className="text-base font-semibold">{t("ai.welcome", "Bonjour 👋")}</p>
    <p className="mt-1 text-gray-600 dark:text-gray-400">
      {t(
        "ai.welcome.body",
        "Comment puis-je vous aider ? Posez-moi une question sur vos ventes, vos commandes, vos produits ou vos clients."
      )}
    </p>
  </div>
);

const ErrorBanner = ({ error, onDismiss, t }) => (
  <div
    role="alert"
    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
  >
    <p className="font-semibold">{error.title}</p>
    <p className="mt-1">{error.body}</p>
    <SecondaryButton
      type="button"
      variant="ghost"
      size="sm"
      onClick={onDismiss}
      className="mt-2 rounded-md border border-red-300 px-2 py-1 text-[11px] font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/50"
    >
      {t("ai.action.dismiss", "OK")}
    </SecondaryButton>
  </div>
);

const QuotaBanner = ({ t, onUsage }) => (
  <div
    role="status"
    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
  >
    <p className="font-semibold">
      🐰 {t("ai.quota.title", "Limite quotidienne atteinte")}
    </p>
    <p className="mt-1">
      {t(
        "ai.quota.body",
        "Vous avez utilisé toutes les interactions IA incluses dans votre plan. Votre quota sera renouvelé demain."
      )}
    </p>
    <div className="mt-2 flex gap-2">
      <SecondaryButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={onUsage}
        className="rounded-md border border-amber-300 px-2 py-1 text-[11px] font-medium hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
      >
        {t("ai.quota.usage", "Voir mon utilisation")}
      </SecondaryButton>
    </div>
  </div>
);

export default AssistantWidget;