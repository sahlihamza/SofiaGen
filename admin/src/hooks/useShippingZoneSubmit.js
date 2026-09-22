import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import { useStoreContext } from "@/context/StoreContext";
import ShippingZoneServices from "@/services/ShippingZoneServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useShippingZoneSubmit = (countries) => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};

  const [shippingZones, setShippingZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [name, setName] = useState("");
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [zipCodes, setZipCodes] = useState("");
  const [errors, setErrors] = useState({});
  const [togglingMethodId, setTogglingMethodId] = useState(null);
  const [deletingMethodId, setDeletingMethodId] = useState(null);
  const [reorderingMethodsZoneId, setReorderingMethodsZoneId] = useState(null);
  const shippingZonesRef = useRef(shippingZones);
  const latestStoreIdRef = useRef(currentStoreId);
  latestStoreIdRef.current = currentStoreId;

  const fetchShippingZones = async () => {
    const requestedStoreId = currentStoreId;
    setIsLoading(true);
    try {
      const res = await ShippingZoneServices.getAllShippingZones();
      if (requestedStoreId !== latestStoreIdRef.current) return;
      setShippingZones(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      if (requestedStoreId === latestStoreIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Re-fetch whenever the active store changes  switching stores must show
  // that store's own zones, the same rule every other store-scoped settings
  // hook (payment, roles, general&) already follows.
  useEffect(() => {
    if (!currentStoreId) {
      setShippingZones([]);
      resetForm();
      return;
    }
    fetchShippingZones();
  }, [currentStoreId]);

  useEffect(() => {
    shippingZonesRef.current = shippingZones;
  }, [shippingZones]);

  const handleNameChange = (value) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleSelectedCountriesChange = (value) => {
    setSelectedCountries(value);
    setErrors((prev) => ({ ...prev, selectedCountries: undefined }));
  };

  const handleZipCodesChange = (value) => {
    setZipCodes(value);
    setErrors((prev) => ({ ...prev, zipCodes: undefined }));
  };

  const resetForm = () => {
    setName("");
    setSelectedCountries([]);
    setZipCodes("");
    setErrors({});
    setEditingZoneId(null);
  };

  const startEditZone = (zone) => {
    setEditingZoneId(zone._id);
    setName(zone.name || "");
    setSelectedCountries(
      (zone.countries || [])
        .map((iso2) => (countries || []).find((country) => country.iso2 === iso2))
        .filter(Boolean)
    );
    setZipCodes((zone.zipCodes || []).join("\n"));
    setErrors({});
  };

  const cancelEditZone = () => {
    resetForm();
  };

  const onSubmit = async (e) => {
    // Guard against being wired to a <form>'s onSubmit by mistake  this
    // section is rendered inside the page-level settings <form>, so it must
    // never trigger a native submit/page reload.
    e?.preventDefault?.();

    const editingZone = editingZoneId
      ? shippingZonesRef.current.find((zone) => zone._id === editingZoneId)
      : null;
    const isEditingDefaultZone = !!editingZone?.isDefault;

    const parsedZipCodes = zipCodes
      .split("\n")
      .map((code) => code.trim())
      .filter(Boolean);

    const nextErrors = {};
    if (!name.trim()) {
      nextErrors.name = t("ShippingZoneNameRequired");
    }
    // The catch-all default zone has no regions by design  skip that
    // requirement instead of asking the merchant to pick countries for it.
    if (!isEditingDefaultZone) {
      if (selectedCountries.length === 0) {
        nextErrors.selectedCountries = t("ShippingZoneRegionsRequired");
      }
      if (parsedZipCodes.length === 0) {
        nextErrors.zipCodes = t("ShippingZoneZipCodesRequired");
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = {
      name: name.trim(),
      countries: selectedCountries.map((country) => country.iso2),
      zipCodes: parsedZipCodes,
    };

    setIsSubmitting(true);
    try {
      if (editingZoneId) {
        const updatedZone = await ShippingZoneServices.updateShippingZone(
          editingZoneId,
          payload
        );
        setShippingZones((prev) =>
          prev.map((zone) => (zone._id === editingZoneId ? updatedZone : zone))
        );
        notifySuccess(t("ShippingZoneUpdateSuccess"));
      } else {
        const newShippingZone = await ShippingZoneServices.addShippingZone(
          payload
        );
        setShippingZones((prev) => [...prev, newShippingZone]);
        notifySuccess(t("ShippingZoneAddSuccess"));
      }
      resetForm();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteZone = async (id) => {
    setDeletingId(id);
    try {
      await ShippingZoneServices.deleteShippingZone(id);
      setShippingZones((prev) => prev.filter((zone) => zone._id !== id));
      notifySuccess(t("ShippingZoneDeleteSuccess"));
      if (editingZoneId === id) {
        resetForm();
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Called continuously while a row is dragged over another one  pure local
  // reorder so the drag feels instant, no network round-trip per hover frame.
  const reorderLocally = (dragIndex, hoverIndex) => {
    setShippingZones((prev) => {
      if (
        dragIndex < 0 ||
        hoverIndex < 0 ||
        dragIndex >= prev.length ||
        hoverIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);
      shippingZonesRef.current = next;
      return next;
    });
  };

  // Called once the drag ends  persists the final order built up by
  // reorderLocally. Reads from the ref rather than `shippingZones` so it
  // always sees the latest order, even if called right after a state update.
  const persistZoneOrder = async () => {
    setIsReordering(true);
    try {
      const orderedIds = shippingZonesRef.current.map((zone) => zone._id);
      const reordered = await ShippingZoneServices.reorderShippingZones(
        orderedIds
      );
      setShippingZones(
        Array.isArray(reordered) ? reordered : reordered?.data || shippingZonesRef.current
      );
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      fetchShippingZones();
    } finally {
      setIsReordering(false);
    }
  };

  const replaceZoneInState = (updatedZone) => {
    setShippingZones((prev) =>
      prev.map((zone) => (zone._id === updatedZone._id ? updatedZone : zone))
    );
  };

  // Shared by the add-method and edit-method modal  methodId is only set
  // when editing, so the same call handles both create and update.
  const saveShippingMethod = async (zoneId, methodId, payload) => {
    const updatedZone = methodId
      ? await ShippingZoneServices.updateShippingMethod(zoneId, methodId, payload)
      : await ShippingZoneServices.addShippingMethod(zoneId, payload);
    replaceZoneInState(updatedZone);
    return updatedZone;
  };

  const toggleShippingMethod = async (zoneId, method) => {
    setTogglingMethodId(method._id);
    try {
      const updatedZone = await ShippingZoneServices.updateShippingMethod(
        zoneId,
        method._id,
        { enabled: !method.enabled }
      );
      replaceZoneInState(updatedZone);
      notifySuccess(
        !method.enabled
          ? t("ShippingMethodEnableSuccess")
          : t("ShippingMethodDisableSuccess")
      );
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setTogglingMethodId(null);
    }
  };

  const deleteShippingMethodItem = async (zoneId, methodId) => {
    setDeletingMethodId(methodId);
    try {
      const updatedZone = await ShippingZoneServices.deleteShippingMethod(
        zoneId,
        methodId
      );
      replaceZoneInState(updatedZone);
      notifySuccess(t("ShippingMethodDeleteSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setDeletingMethodId(null);
    }
  };

  // Same local-then-persist split as reorderLocally/persistZoneOrder, one
  // level down: pure local splice on a single zone's methods while dragging,
  // network call only once the drag ends.
  const reorderMethodsLocally = (zoneId, dragIndex, hoverIndex) => {
    setShippingZones((prev) => {
      const next = prev.map((zone) => {
        if (zone._id !== zoneId) return zone;

        const methods = zone.methods || [];
        if (
          dragIndex < 0 ||
          hoverIndex < 0 ||
          dragIndex >= methods.length ||
          hoverIndex >= methods.length
        ) {
          return zone;
        }

        const nextMethods = [...methods];
        const [moved] = nextMethods.splice(dragIndex, 1);
        nextMethods.splice(hoverIndex, 0, moved);
        return { ...zone, methods: nextMethods };
      });
      shippingZonesRef.current = next;
      return next;
    });
  };

  const persistMethodOrder = async (zoneId) => {
    setReorderingMethodsZoneId(zoneId);
    try {
      const zone = shippingZonesRef.current.find((z) => z._id === zoneId);
      const orderedIds = (zone?.methods || []).map((method) => method._id);
      const updatedZone = await ShippingZoneServices.reorderShippingMethods(
        zoneId,
        orderedIds
      );
      replaceZoneInState(updatedZone);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      fetchShippingZones();
    } finally {
      setReorderingMethodsZoneId(null);
    }
  };

  return {
    shippingZones,
    isLoading,
    isSubmitting,
    isReordering,
    deletingId,
    editingZoneId,
    name,
    setName: handleNameChange,
    selectedCountries,
    setSelectedCountries: handleSelectedCountriesChange,
    zipCodes,
    setZipCodes: handleZipCodesChange,
    errors,
    onSubmit,
    startEditZone,
    cancelEditZone,
    deleteZone,
    reorderLocally,
    persistZoneOrder,
    togglingMethodId,
    deletingMethodId,
    reorderingMethodsZoneId,
    saveShippingMethod,
    toggleShippingMethod,
    deleteShippingMethodItem,
    reorderMethodsLocally,
    persistMethodOrder,
  };
};

export default useShippingZoneSubmit;
