import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import EmailSettingsServices from "@/services/EmailSettingsServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// Email notifications are list-based (enable/disable, per-notification
// config) rather than a flat form, so this gets its own hook instead of
// living inside useSettingSubmit  same approach as payment settings.
const useEmailSettingsSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { handleDisableForDemo } = useDisableForDemo();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [template, setTemplate] = useState(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [previewHtml, setPreviewHtml] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  useEffect(() => {
    if (!currentStoreId) {
      setNotifications([]);
      setTemplate(null);
      return;
    }

    const requestedStoreId = currentStoreId;

    (async () => {
      setIsLoading(true);
      try {
        const res = await EmailSettingsServices.getEmailSettings(
          requestedStoreId
        );
        if (requestedStoreId !== latestStoreIdRef.current) return;
        setNotifications(res?.data?.notifications || []);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        if (requestedStoreId === latestStoreIdRef.current) {
          setIsLoading(false);
        }
      }
    })();

    (async () => {
      setIsTemplateLoading(true);
      try {
        const res = await EmailSettingsServices.getTemplate(requestedStoreId);
        if (requestedStoreId !== latestStoreIdRef.current) return;
        setTemplate(res?.data || null);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        if (requestedStoreId === latestStoreIdRef.current) {
          setIsTemplateLoading(false);
        }
      }
    })();
  }, [currentStoreId]);

  const toggleNotification = async (key, enabled) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    const previous = notifications;
    setNotifications((prev) =>
      prev.map((n) => (n.key === key ? { ...n, enabled } : n))
    );
    setTogglingKey(key);

    try {
      const res = await EmailSettingsServices.toggleNotification(
        currentStoreId,
        key,
        enabled
      );
      setNotifications(res?.data?.notifications || []);
    } catch (err) {
      setNotifications(previous);
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setTogglingKey(null);
    }
  };

  const openConfig = (key) => {
    setEditingKey(key);
    setPreviewHtml("");
    setTestEmail("");
  };
  const closeConfig = () => {
    setEditingKey(null);
    setPreviewHtml("");
  };

  const saveConfig = async (key, updates) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    const updatedNotifications = notifications.map((n) =>
      n.key === key ? { ...n, ...updates } : n
    );

    setIsSavingConfig(true);
    try {
      const res = await EmailSettingsServices.updateEmailSettings(
        currentStoreId,
        { notifications: updatedNotifications }
      );
      setNotifications(res?.data?.notifications || []);
      notifySuccess(t("SettingsUpdateSuccess"));
      setEditingKey(null);
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors;
      const message =
        Array.isArray(fieldErrors) && fieldErrors.length > 0
          ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" | ")
          : err?.response?.data?.message ||
            err?.message ||
            "Error updating email settings";
      notifyError(message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const saveTemplate = async (updates) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    setIsSavingTemplate(true);
    try {
      const res = await EmailSettingsServices.updateTemplate(
        currentStoreId,
        updates
      );
      setTemplate(res?.data || null);
      notifySuccess(t("EmailTemplateSaved"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const fetchPreview = async (key, draft) => {
    if (!currentStoreId || !key) return;

    setIsPreviewLoading(true);
    try {
      const res = await EmailSettingsServices.previewNotification(
        currentStoreId,
        key,
        draft
      );
      setPreviewHtml(res?.data?.html || "");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const sendTestEmail = async (key, draft) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    if (!testEmail) {
      notifyError(t("EmailTestEmailRequired"));
      return;
    }

    setIsSendingTest(true);
    try {
      await EmailSettingsServices.sendTestEmail(
        currentStoreId,
        key,
        draft,
        testEmail
      );
      notifySuccess(t("EmailTestSentSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  return {
    notifications: [...notifications].sort((a, b) => a.order - b.order),
    isLoading,
    togglingKey,
    toggleNotification,
    editingKey,
    openConfig,
    closeConfig,
    isSavingConfig,
    saveConfig,

    template,
    isTemplateLoading,
    isSavingTemplate,
    saveTemplate,

    previewHtml,
    isPreviewLoading,
    fetchPreview,
    testEmail,
    setTestEmail,
    isSendingTest,
    sendTestEmail,
  };
};

export default useEmailSettingsSubmit;
