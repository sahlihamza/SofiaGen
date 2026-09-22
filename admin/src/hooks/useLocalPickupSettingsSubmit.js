import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import { useStoreContext } from "@/context/StoreContext";
import ShippingSettingsServices from "@/services/ShippingSettingsServices";
import { notifyError, notifySuccess } from "@/utils/toast";
const useLocalPickupSettingsSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("Pickup");
  const [hasPrice, setHasPrice] = useState(false);
  const [price, setPrice] = useState("0");

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  useEffect(() => {
    if (!currentStoreId) return;

    const requestedStoreId = currentStoreId;
    (async () => {
      setIsLoading(true);
      try {
        const res = await ShippingSettingsServices.getShippingSettings(requestedStoreId);
        if (requestedStoreId !== latestStoreIdRef.current) return;
        const settings = res?.data;
        setEnabled(!!settings?.localPickupEnabled);
        setTitle(settings?.localPickupTitle || "Pickup");
        setHasPrice(!!settings?.localPickupHasPrice);
        setPrice(
          settings?.localPickupPrice !== undefined ? String(settings.localPickupPrice) : "0"
        );
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
        localPickupEnabled: enabled,
        localPickupTitle: title.trim() || "Pickup",
        localPickupHasPrice: hasPrice,
        localPickupPrice: hasPrice ? Number(price) || 0 : 0,
      });
      notifySuccess(t("LocalPickupUpdateSuccess"));
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
    enabled,
    setEnabled,
    title,
    setTitle,
    hasPrice,
    setHasPrice,
    price,
    setPrice,
  };
};

export default useLocalPickupSettingsSubmit;
