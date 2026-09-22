import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import { useStoreContext } from "@/context/StoreContext";
import PickupLocationServices from "@/services/PickupLocationServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const usePickupLocationSubmit = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [pickupLocations, setPickupLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const fetchPickupLocations = async () => {
    const requestedStoreId = currentStoreId;
    setIsLoading(true);
    try {
      const res = await PickupLocationServices.getAllPickupLocations();
      if (requestedStoreId !== latestStoreIdRef.current) return;
      setPickupLocations(Array.isArray(res) ? res : res?.data || []);
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
      setPickupLocations([]);
      return;
    }
    fetchPickupLocations();
  }, [currentStoreId]);

  const savePickupLocation = async (id, payload) => {
    setIsSubmitting(true);
    try {
      if (id) {
        const updated = await PickupLocationServices.updatePickupLocation(id, payload);
        setPickupLocations((prev) =>
          prev.map((location) => (location._id === id ? updated : location))
        );
        notifySuccess(t("PickupLocationUpdateSuccess"));
      } else {
        const created = await PickupLocationServices.addPickupLocation(payload);
        setPickupLocations((prev) => [...prev, created]);
        notifySuccess(t("PickupLocationAddSuccess"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEnabled = async (location) => {
    setTogglingId(location._id);
    try {
      const updated = await PickupLocationServices.updatePickupLocation(location._id, {
        enabled: !location.enabled,
      });
      setPickupLocations((prev) =>
        prev.map((item) => (item._id === location._id ? updated : item))
      );
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setTogglingId(null);
    }
  };

  const deletePickupLocation = async (id) => {
    setDeletingId(id);
    try {
      await PickupLocationServices.deletePickupLocation(id);
      setPickupLocations((prev) => prev.filter((location) => location._id !== id));
      notifySuccess(t("PickupLocationDeleteSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    pickupLocations,
    isLoading,
    isSubmitting,
    deletingId,
    togglingId,
    savePickupLocation,
    toggleEnabled,
    deletePickupLocation,
  };
};

export default usePickupLocationSubmit;
