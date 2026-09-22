import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import PaymentSettingsServices from "@/services/PaymentSettingsServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// Payment methods are list-based (enable/disable, reorder, per-method
// config) rather than a flat form, so this gets its own hook instead of
// living inside useSettingSubmit.
const usePaymentSettingsSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { handleDisableForDemo } = useDisableForDemo();

  const [methods, setMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;
  const methodsRef = useRef([]);
  useEffect(() => {
    methodsRef.current = [...methods].sort((a, b) => a.order - b.order);
  }, [methods]);

  useEffect(() => {
    if (!currentStoreId) {
      setMethods([]);
      return;
    }

    const requestedStoreId = currentStoreId;

    (async () => {
      setIsLoading(true);
      try {
        const res = await PaymentSettingsServices.getPaymentSettings(
          requestedStoreId
        );
        if (requestedStoreId !== latestStoreIdRef.current) return;
        setMethods(res?.data?.methods || []);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        if (requestedStoreId === latestStoreIdRef.current) {
          setIsLoading(false);
        }
      }
    })();
  }, [currentStoreId]);

  const toggleMethod = async (key, enabled) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    const previous = methods;
    setMethods((prev) =>
      prev.map((m) => (m.key === key ? { ...m, enabled } : m))
    );
    setTogglingKey(key);

    try {
      const res = await PaymentSettingsServices.toggleMethod(
        currentStoreId,
        key,
        enabled
      );
      setMethods(res?.data?.methods || []);
    } catch (err) {
      setMethods(previous);
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setTogglingKey(null);
    }
  };

  const reorderMethodsLocally = (dragIndex, hoverIndex) => {
    setMethods((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      if (
        dragIndex < 0 ||
        hoverIndex < 0 ||
        dragIndex >= sorted.length ||
        hoverIndex >= sorted.length
      ) {
        return sorted;
      }

      const next = [...sorted];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);

      const reindexed = next.map((m, i) => ({ ...m, order: i }));
      methodsRef.current = reindexed;
      return reindexed;
    });
  };
  const persistMethodOrder = async () => {
    if (!currentStoreId) {
      return;
    }

    if (handleDisableForDemo()) {

      const res = await PaymentSettingsServices.getPaymentSettings(currentStoreId);
      setMethods(res?.data?.methods || []);
      return;
    }

    setIsReordering(true);
    try {
      const orderedKeys = methodsRef.current.map((m) => m.key);
      const res = await PaymentSettingsServices.reorderMethods(
        currentStoreId,
        orderedKeys
      );
      setMethods(res?.data?.methods || methodsRef.current);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      const res = await PaymentSettingsServices.getPaymentSettings(currentStoreId);
      setMethods(res?.data?.methods || []);
    } finally {
      setIsReordering(false);
    }
  };

  const openConfig = (key) => setEditingKey(key);
  const closeConfig = () => setEditingKey(null);

  const saveConfig = async (key, { title, description, config }) => {
    if (handleDisableForDemo() || !currentStoreId) {
      return;
    }

    const updatedMethods = methods.map((m) =>
      m.key === key ? { ...m, title, description, config } : m
    );

    setIsSavingConfig(true);
    try {
      const res = await PaymentSettingsServices.updatePaymentSettings(
        currentStoreId,
        { methods: updatedMethods }
      );
      setMethods(res?.data?.methods || []);
      notifySuccess(t("SettingsUpdateSuccess"));
      setEditingKey(null);
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors;
      const message =
        Array.isArray(fieldErrors) && fieldErrors.length > 0
          ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" | ")
          : err?.response?.data?.message ||
            err?.message ||
            "Error updating payment settings";
      notifyError(message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return {
    methods: [...methods].sort((a, b) => a.order - b.order),
    isLoading,
    togglingKey,
    isReordering,
    toggleMethod,
    reorderMethodsLocally,
    persistMethodOrder,
    editingKey,
    openConfig,
    closeConfig,
    isSavingConfig,
    saveConfig,
  };
};

export default usePaymentSettingsSubmit;
