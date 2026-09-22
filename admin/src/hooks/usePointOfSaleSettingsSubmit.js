import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import PointOfSaleSettingsServices from "@/services/PointOfSaleSettingsServices";
import { notifyError, notifySuccess } from "@/utils/toast";
const usePointOfSaleSettingsSubmit = () => {
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
        const res = await PointOfSaleSettingsServices.getSettings(requestedStoreId);
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
    if (handleDisableForDemo() || !currentStoreId) return;

    setIsSaving(true);
    try {
      const res = await PointOfSaleSettingsServices.updateSettings(
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

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
  };
};

export default usePointOfSaleSettingsSubmit;
