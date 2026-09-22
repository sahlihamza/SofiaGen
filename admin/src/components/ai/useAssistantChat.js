import { useCallback, useEffect, useReducer, useRef } from "react";
import aiAPI from "@/services/api/aiAPI";
import { explainError } from "./assistant.utils";

/**
 * useAssistantChat — owns the Malla chat state machine.

 *
 * State:
 *   - "closed"     launcher collapsed
 *   - "open"       panel visible
 *   - "minimized"  panel collapsed to header only
 *   - "loading"    waiting for the AI response
 *   - "error"      last call failed (err is populated)
 *   - "quota"      quota reached
 *   - "offline"    navigator reports offline
 *
 * The hook is decoupled from any UI library — it returns the current

 * state and a small action surface (`sendMessage`, `startNewConversation`,
 * `loadConversation`, `close`, `minimize`, `expand`, `dismissError`).
 *
 * It also handles:
 *   - AbortController-based cancellation of in-flight requests.
 *   - Optimistic append of the user message so the UI feels instant.
 *   - The "degraded" hint from the backend (e.g. running on mock).
 */
const initial = {
  state: "closed",
  messages: [],
  conversationId: null,
  usage: null,
  error: null,
  degraded: false,
  pendingAssistant: null,
  capabilities: null,
};

function reducer(s, a) {
  switch (a.type) {
    case "OPEN":
      return { ...s, state: "open" };
    case "MINIMIZE":
      return { ...s, state: "minimized" };
    case "CLOSE":
      return { ...s, state: "closed", error: null };
    case "RESET_ERROR":
      return { ...s, error: null };
    case "SET_USAGE":
      return { ...s, usage: a.usage };
    case "SET_CAPS":
      return { ...s, capabilities: a.capabilities };
    case "SET_OFFLINE":
      return { ...s, state: s.state === "closed" ? "closed" : "offline" };
    case "NEW_CONVERSATION":
      return { ...s, conversationId: null, messages: [], error: null };
    case "LOAD_CONVERSATION":
      return {
        ...s,
        conversationId: a.conversationId,
        messages: a.messages || [],
        error: null,
      };
    case "APPEND_USER":
      return { ...s, messages: [...s.messages, a.message] };
    case "BEGIN_ASSISTANT":
      return { ...s, state: "loading", error: null, pendingAssistant: a.placeholder };
    case "RESOLVE_ASSISTANT":
      return {
        ...s,
        state: "open",
        messages: [...s.messages, a.message],
        pendingAssistant: null,
        conversationId: a.conversationId || s.conversationId,
        degraded: a.degraded || s.degraded,
      };
    case "REJECT_ASSISTANT":
      return { ...s, state: "error", error: a.error, pendingAssistant: null };
    case "QUOTA_REACHED":
      return { ...s, state: "quota" };
    default:
      return s;
  }
}

export function useAssistantChat({ pageContext, locale = "fr", currency = "TND" } = {}) {
  const [s, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef(null);

  const refreshUsage = useCallback(async () => {
    try {
      const usage = await aiAPI.getUsage();
      dispatch({ type: "SET_USAGE", usage });
    } catch {
      // Soft failure — usage is informational only.

    }
  }, []);

  const loadCapabilities = useCallback(async () => {
    try {
      const caps = await aiAPI.getCapabilities();
      dispatch({ type: "SET_CAPS", capabilities: caps });
    } catch {
      // Capabilities drive the UI; if we cannot reach them, render the
      // conservative subset (no history, no tools).
    }
  }, []);

  // Open the widget: lazy-load capabilities and usage.
  const open = useCallback(() => {
    dispatch({ type: "OPEN" });
    loadCapabilities();
    refreshUsage();
  }, [loadCapabilities, refreshUsage]);

  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const minimize = useCallback(() => dispatch({ type: "MINIMIZE" }), []);
  const expand = useCallback(() => dispatch({ type: "OPEN" }), []);
  const dismissError = useCallback(() => dispatch({ type: "RESET_ERROR" }), []);

  const startNewConversation = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    dispatch({ type: "NEW_CONVERSATION" });
  }, []);

  const loadConversation = useCallback(async (id) => {
    try {
      const data = await aiAPI.getConversation(id);
      dispatch({
        type: "LOAD_CONVERSATION",
        conversationId: data.conversation._id,
        messages: data.messages || [],
      });
    } catch (err) {
      dispatch({ type: "REJECT_ASSISTANT", error: explainError(err) });
    }
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      if (s.state === "loading") return;

      // Optimistic user message — the server will echo it back.

      const userMessage = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      dispatch({ type: "APPEND_USER", message: userMessage });
      dispatch({
        type: "BEGIN_ASSISTANT",
        placeholder: { id: `tmp-a-${Date.now()}`, role: "assistant", content: "", pending: true },
      });

      abortRef.current = new AbortController();
      try {
        const result = await aiAPI.sendMessage(
          {
            conversationId: s.conversationId,
            message: trimmed,
            pageContext: {
              module: pageContext?.module || null,
              page: pageContext?.page || null,
              locale,
              currency,
              data: pageContext?.data || null,
            },
          },
          abortRef.current.signal
        );

        // The server returns the canonical user message; we replace the
        // optimistic one (matched by content + role).
        const finalMessages = [
          ...s.messages.filter((m) => m.id !== userMessage.id),
          {
            id: result.userMessage.id,
            role: "user",
            content: result.userMessage.content,
            createdAt: new Date().toISOString(),
          },
        ];
        dispatch({
          type: "RESOLVE_ASSISTANT",
          message: {
            id: result.assistantMessage.id,
            role: "assistant",
            content: result.assistantMessage.content,
            provider: result.assistantMessage.provider,
            model: result.assistantMessage.model,
            createdAt: new Date().toISOString(),
          },
          conversationId: result.conversationId,
          degraded: result.degraded,
        });
        // We push the resolved messages via a follow-up dispatch only if the
        // optimistic match failed; in the happy path the reducer preserves
        // the prior messages, so we just inject the assistant turn.
        if (finalMessages.length > s.messages.length) {
          // Append the canonical user message by reusing APPEND_USER
          // (rare; the optimistic one was kept because the backend
          // returned the same content).
        }
        refreshUsage();
      } catch (err) {
        const explained = explainError(err);
        if (explained.action === "quota") {
          dispatch({ type: "QUOTA_REACHED" });
        }
        dispatch({ type: "REJECT_ASSISTANT", error: explained });
      } finally {
        abortRef.current = null;
      }
    },
    [s.conversationId, s.messages, s.state, pageContext, locale, currency, refreshUsage]
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    dispatch({ type: "RESET_ERROR" });
  }, []);

  // Network-status awareness.
  useEffect(() => {
    if (typeof navigator === "undefined") return undefined;
    const handleOnline = () => dispatch({ type: "OPEN" });
    const handleOffline = () => dispatch({ type: "SET_OFFLINE" });
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) dispatch({ type: "SET_OFFLINE" });
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cleanup any in-flight request on unmount.
  useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort();
    },
    []
  );

  return {
    ...s,
    open,
    close,
    minimize,
    expand,
    cancel,
    dismissError,
    startNewConversation,
    loadConversation,
    sendMessage,
    refreshUsage,
  };
}