import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";
import useGetCData from "@/hooks/useGetCData";
import { useAssistantChat } from "./useAssistantChat";
import AssistantWidget from "./AssistantWidget";
import { PrimaryButton } from "@sofia/ui";

/**
 * Floating launcher + panel. This is the only thing the host app
 * (Layout.jsx) needs to mount. The launcher:
 *   - Renders only when the user holds `ai.assistant.use`.
 *   - Captures the current route + i18n locale to feed the
 *     orchestrator's pageContext.
 *   - Persists open/closed state in localStorage (ui-only).
 */
const STORAGE_KEY = "malla.ui.state";

const PERMISSION_USE = "ai.assistant.use";

function readPersistedState() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePersistedState(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage might be disabled (private mode); ignore.
  }
}

const AssistantLauncher = () => {
  const { can, isLoading: authLoading } = useAuthorizationContext();
  const { role: userRole } = useGetCData();
  const location = useLocation();
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The Malla widget was historically gated on `ai.assistant.use` (a
  // store-scoped permission). For super-admins who browse the admin
  // without an active store, that permission is not in their context
  // even though they are entitled to use Malla — so we add a fallback
  // that accepts anyone with the Super Admin role.
  const isSuperAdmin = userRole === "Super Admin";

  const allowed = !authLoading && (can(PERMISSION_USE) || isSuperAdmin);

  const chat = useAssistantChat({
    pageContext: {
      module: deriveModuleFromPath(location.pathname),
      page: location.pathname,
      locale: i18n.language || "fr",
    },
    locale: i18n.language || "fr",
  });

  // Persist the open/closed/minimized state for next visit.
  useEffect(() => {
    if (!mounted) return;
    if (chat.state === "closed") writePersistedState("closed");
    else if (chat.state === "minimized") writePersistedState("minimized");
    else writePersistedState("open");
  }, [chat.state, mounted]);

  // On first mount, restore the persisted state.
  useEffect(() => {
    if (!mounted) return;
    const persisted = readPersistedState();
    if (persisted === "open") chat.open();
    // We never auto-open minimized — that would be unexpected.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!allowed) return null;

  const isPanelOpen = chat.state !== "closed" && chat.state !== "minimized";

  return (
    <>
      <AssistantWidget chat={chat} pageContext={{
        module: deriveModuleFromPath(location.pathname),
        page: location.pathname,
        locale: i18n.language || "fr",
      }} />
      {!isPanelOpen && (
        <PrimaryButton
          type="button"
          onClick={chat.open}
          aria-label="Ouvrir Malla"
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 sm:bottom-6 sm:right-6"
        >
          <span aria-hidden="true">🐰</span>
        </PrimaryButton>
      )}
    </>
  );
};

function deriveModuleFromPath(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/analytics")) return "dashboard";
  if (pathname.startsWith("/coupons")) return "products";
  return null;
}

export default AssistantLauncher;