import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WindmillContext } from "@windmill/react-ui";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import WebsiteVisibilityServices from "@/services/WebsiteVisibilityServices";
import { notifyError, notifySuccess } from "@/utils/toast";
const useWebsiteVisibilitySubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { handleDisableForDemo } = useDisableForDemo();
  const { mode: windmillMode } = useContext(WindmillContext) || {};

  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingSessions, setIsResettingSessions] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const loadSettings = async () => {
    if (!currentStoreId) {
      setSettings(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await WebsiteVisibilityServices.getSettings(currentStoreId);
      setSettings(res?.data || null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [currentStoreId]);

  const saveSettings = async (updates) => {
    if (handleDisableForDemo() || !currentStoreId) return;

    setIsSaving(true);
    try {
      const res = await WebsiteVisibilityServices.updateSettings(
        currentStoreId,
        updates
      );
      setSettings(res?.data || null);
      notifySuccess(t("SettingsUpdateSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSessions = async () => {
    if (handleDisableForDemo() || !currentStoreId) return;

    setIsResettingSessions(true);
    try {
      const res = await WebsiteVisibilityServices.resetSessions(currentStoreId);
      setSettings(res?.data || null);
      notifySuccess(t("WebsiteVisibilitySessionsResetSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsResettingSessions(false);
    }
  };

  const previewMode = async (mode) => {
    if (!currentStoreId) return;

    setIsPreviewLoading(true);
    try {
      const html = await WebsiteVisibilityServices.previewMode(
        currentStoreId,
        mode,
        windmillMode === "dark" ? "dark" : "light"
      );
      setPreviewHtml(typeof html === "string" ? html : "");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => setPreviewHtml("");

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    isResettingSessions,
    resetSessions,
    previewHtml,
    isPreviewLoading,
    previewMode,
    closePreview,
    previewTheme: windmillMode === "dark" ? "dark" : "light",
  };
};

export default useWebsiteVisibilitySubmit;
