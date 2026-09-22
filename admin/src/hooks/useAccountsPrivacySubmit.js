import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import AccountsPrivacyServices from "@/services/AccountsPrivacyServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// Accounts & Privacy settings are a single nested document (checkout /
// accountCreation / passwordPolicy / privacyPolicy) per store, so this gets
// its own hook rather than living inside useSettingSubmit  same approach as
// email settings.
const useAccountsPrivacySubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { handleDisableForDemo } = useDisableForDemo();

  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  useEffect(() => {
    if (!currentStoreId) {
      setSettings(null);
      return;
    }

    const requestedStoreId = currentStoreId;

    (async () => {
      setIsLoading(true);
      try {
        const res = await AccountsPrivacyServices.getSettings(
          requestedStoreId
        );
        if (requestedStoreId !== latestStoreIdRef.current) return;
        setSettings(res?.data || null);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        if (requestedStoreId === latestStoreIdRef.current) {
          setIsLoading(false);
        }
      }
    })();
  }, [currentStoreId]);

  const saveSettings = async (updates) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await AccountsPrivacyServices.updateSettings(
        currentStoreId,
        updates
      );
      setSettings(res?.data || null);
      notifySuccess(t("SettingsUpdateSuccess"));
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors;
      const message =
        Array.isArray(fieldErrors) && fieldErrors.length > 0
          ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" | ")
          : err?.response?.data?.message ||
            err?.message ||
            "Error updating accounts & privacy settings";
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
  };
};

export default useAccountsPrivacySubmit;
