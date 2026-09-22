import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import { useStoreContext } from "@/context/StoreContext";
import ShippingSettingsServices from "@/services/ShippingSettingsServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useShippingSettingsSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [enableCalculator, setEnableCalculator] = useState(false);
  const [hideCostsUntilAddress, setHideCostsUntilAddress] = useState(false);
  const [hideRatesWhenFreeShippingAvailable, setHideRatesWhenFreeShippingAvailable] =
    useState(false);
  const [shippingDestination, setShippingDestination] = useState("billing");
  const [debugMode, setDebugMode] = useState(false);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const hydrate = (settings) => {
    setEnableCalculator(!!settings?.enableCalculator);
    setHideCostsUntilAddress(!!settings?.hideCostsUntilAddress);
    setHideRatesWhenFreeShippingAvailable(!!settings?.hideRatesWhenFreeShippingAvailable);
    setShippingDestination(settings?.shippingDestination || "billing");
    setDebugMode(!!settings?.debugMode);
  };

  useEffect(() => {
    if (!currentStoreId) return;

    const requestedStoreId = currentStoreId;
    (async () => {
      setIsLoading(true);
      try {
        const res = await ShippingSettingsServices.getShippingSettings(requestedStoreId);
        if (requestedStoreId !== latestStoreIdRef.current) return;
        hydrate(res?.data);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        if (requestedStoreId === latestStoreIdRef.current) {
          setIsLoading(false);
        }
      }
    })();
  }, [currentStoreId]);

  const requestSave = () => setIsConfirmOpen(true);
  const closeConfirm = () => setIsConfirmOpen(false);

  const performSave = async () => {
    if (!currentStoreId) {
      setIsConfirmOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await ShippingSettingsServices.updateShippingSettings(currentStoreId, {
        enableCalculator,
        hideCostsUntilAddress,
        hideRatesWhenFreeShippingAvailable,
        shippingDestination,
        debugMode,
      });
      notifySuccess(t("ShippingSettingsUpdateSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  return {
    isLoading,
    isSubmitting,
    isConfirmOpen,
    requestSave,
    closeConfirm,
    performSave,
    enableCalculator,
    setEnableCalculator,
    hideCostsUntilAddress,
    setHideCostsUntilAddress,
    hideRatesWhenFreeShippingAvailable,
    setHideRatesWhenFreeShippingAvailable,
    shippingDestination,
    setShippingDestination,
    debugMode,
    setDebugMode,
  };
};

export default useShippingSettingsSubmit;
