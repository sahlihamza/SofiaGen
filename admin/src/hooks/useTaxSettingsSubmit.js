import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import TaxSettingsServices from "@/services/TaxSettingsServices";
import { notifyError, notifySuccess } from "@/utils/toast";
const useTaxSettingsSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { handleDisableForDemo } = useDisableForDemo();

  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingOptions, setIsSavingOptions] = useState(false);
  const [isSavingClasses, setIsSavingClasses] = useState(false);
  const [isSavingRates, setIsSavingRates] = useState(false);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const loadSettings = async (storeId) => {
    setIsLoading(true);
    try {
      const res = await TaxSettingsServices.getSettings(storeId);
      if (storeId !== latestStoreIdRef.current) return;
      setSettings(res?.data || null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      if (storeId === latestStoreIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentStoreId) {
      setSettings(null);
      return;
    }
    loadSettings(currentStoreId);
  }, [currentStoreId]);

  const saveOptions = async (updates) => {
    if (handleDisableForDemo() || !currentStoreId) return;
    setIsSavingOptions(true);
    try {
      const res = await TaxSettingsServices.updateOptions(currentStoreId, updates);
      setSettings(res?.data || null);
      notifySuccess(t("SettingsUpdateSuccess"));
    } catch (err) {
      const fieldMessage = err?.response?.data?.message;
      notifyError(fieldMessage || err?.message);
    } finally {
      setIsSavingOptions(false);
    }
  };

  const saveTaxClasses = async (classes) => {
    if (handleDisableForDemo() || !currentStoreId) return;
    setIsSavingClasses(true);
    try {
      const res = await TaxSettingsServices.updateTaxClasses(currentStoreId, classes);
      setSettings(res?.data || null);
      notifySuccess(t("SettingsUpdateSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingClasses(false);
    }
  };

  const saveRates = async (taxClass, rates) => {
    if (handleDisableForDemo() || !currentStoreId) return;
    setIsSavingRates(true);
    try {
      const res = await TaxSettingsServices.updateRates(currentStoreId, taxClass, rates);
      setSettings(res?.data || null);
      notifySuccess(t("SettingsUpdateSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSavingRates(false);
    }
  };

  return {
    settings,
    isLoading,
    isSavingOptions,
    saveOptions,
    isSavingClasses,
    saveTaxClasses,
    isSavingRates,
    saveRates,
  };
};

export default useTaxSettingsSubmit;
