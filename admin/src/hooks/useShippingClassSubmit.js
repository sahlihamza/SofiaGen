import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import { useStoreContext } from "@/context/StoreContext";
import ShippingClassServices from "@/services/ShippingClassServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useShippingClassSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [shippingClasses, setShippingClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const fetchShippingClasses = async () => {
    const requestedStoreId = currentStoreId;
    setIsLoading(true);
    try {
      const res = await ShippingClassServices.getAllShippingClasses();
      if (requestedStoreId !== latestStoreIdRef.current) return;
      setShippingClasses(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      if (requestedStoreId === latestStoreIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Same rule every other store-scoped settings hook follows: switching
  // stores must show that store's own data.
  useEffect(() => {
    if (!currentStoreId) {
      setShippingClasses([]);
      return;
    }
    fetchShippingClasses();
  }, [currentStoreId]);

  const saveShippingClass = async (id, payload) => {
    setIsSubmitting(true);
    try {
      if (id) {
        const updated = await ShippingClassServices.updateShippingClass(id, payload);
        setShippingClasses((prev) =>
          prev.map((shippingClass) => (shippingClass._id === id ? updated : shippingClass))
        );
        notifySuccess(t("ShippingClassUpdateSuccess"));
      } else {
        const created = await ShippingClassServices.addShippingClass(payload);
        setShippingClasses((prev) => [...prev, created]);
        notifySuccess(t("ShippingClassAddSuccess"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteShippingClass = async (id) => {
    setDeletingId(id);
    try {
      await ShippingClassServices.deleteShippingClass(id);
      setShippingClasses((prev) => prev.filter((shippingClass) => shippingClass._id !== id));
      notifySuccess(t("ShippingClassDeleteSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    shippingClasses,
    isLoading,
    isSubmitting,
    deletingId,
    saveShippingClass,
    deleteShippingClass,
  };
};

export default useShippingClassSubmit;
