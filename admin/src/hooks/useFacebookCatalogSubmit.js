import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStoreContext } from "@/context/StoreContext";
import FacebookCatalogServices from "@/services/FacebookCatalogServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useFacebookCatalogSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadAll = useCallback(async () => {
    if (!currentStoreId) {
      setSettings(null);
      setStatus(null);
      return;
    }
    setIsLoading(true);
    try {
      const [s, st] = await Promise.all([
        FacebookCatalogServices.getSettings(currentStoreId),
        FacebookCatalogServices.getStatus(currentStoreId),
      ]);
      setSettings(s?.data || null);
      setStatus(st?.data || null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentStoreId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveSettings = async (patch) => {
    if (!currentStoreId) return;
    setIsSaving(true);
    try {
      const res = await FacebookCatalogServices.updateSettings(currentStoreId, patch);
      setSettings(res?.data || null);
      notifySuccess(t("FacebookCatalogSavedSuccess"));
      await loadAll();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const regenerate = async () => {
    if (!currentStoreId) return;
    setIsRegenerating(true);
    try {
      await FacebookCatalogServices.regenerate(currentStoreId);
      notifySuccess(t("FacebookCatalogRegeneratedSuccess"));
      await loadAll();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const runTest = async () => {
    if (!currentStoreId) return;
    setIsRegenerating(true);
    try {
      const res = await FacebookCatalogServices.testFeed(currentStoreId);
      setTestResult(res?.data || null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setTestResult(null);
    } finally {
      setIsRegenerating(false);
    }
  };

  const previewProduct = async (productId) => {
    if (!currentStoreId || !productId) return null;
    try {
      const res = await FacebookCatalogServices.previewProduct(currentStoreId, productId);
      return res?.data || null;
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      return null;
    }
  };

  return {
    settings,
    status,
    isLoading,
    isSaving,
    isRegenerating,
    testResult,
    setTestResult,
    saveSettings,
    regenerate,
    runTest,
    previewProduct,
    reload: loadAll,
  };
};

export default useFacebookCatalogSubmit;