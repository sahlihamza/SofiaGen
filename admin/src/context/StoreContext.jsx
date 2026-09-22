import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Cookies from "js-cookie";

import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import UserServices from "@/services/UserServices";
import { invalidateAuthorizationContext } from "@/hooks/useAuthorizationContext";
import { isSuperAdmin } from "@/utils/permissions";

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;
  const { isUpdate } = useContext(SidebarContext);
  const [stores, setStores] = useState([]);
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [storeVersion, setStoreVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [storesError, setStoresError] = useState(null);
  const prevCurrentStoreIdRef = useRef(null);

  const updateCompanyCookie = (storeId) => {
    if (!storeId) return;
    Cookies.set("company", String(storeId), {
      expires: 0.5,
      sameSite: window.location.protocol === "https:" ? "None" : "Lax",
      secure: window.location.protocol === "https:",
    });
  };

  const fetchMyStores = useCallback(async () => {
    if (!adminInfo) return;

    try {
      setLoading(true);
      setStoresError(null);
      const res = await UserServices.getMyStores();
      const fetchedStores = res?.data?.stores || [];
      let selectedId = res?.data?.currentStoreId || null;
      setStores(fetchedStores);

      if (!selectedId && fetchedStores.length > 0) {
        const firstStore = fetchedStores[0];
        try {
          const selectRes = await UserServices.selectMyStore({
            storeId: firstStore._id,
          });
          selectedId = selectRes?.data?.currentStoreId || firstStore._id;
        } catch (err) {
          selectedId = firstStore._id;
        }
      }

      setCurrentStoreId(selectedId);
      updateCompanyCookie(selectedId);

      if (prevCurrentStoreIdRef.current !== selectedId && selectedId) {
        prevCurrentStoreIdRef.current = selectedId;
        invalidateAuthorizationContext();
        setStoreVersion((v) => v + 1);
      }
    } catch (err) {
      console.error("Failed to fetch user's stores:", err);
      setStoresError(err);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [adminInfo]);

  useEffect(() => {
    if (adminInfo) {
      fetchMyStores();
    } else {
      setStores([]);
      setCurrentStoreId(null);
    }
  }, [adminInfo, isUpdate]);

  const selectStore = async (storeId) => {
    const res = await UserServices.selectMyStore({ storeId });
    const newStoreId = res?.data?.currentStoreId || storeId;
    setCurrentStoreId(newStoreId);
    updateCompanyCookie(newStoreId);
    invalidateAuthorizationContext();
    setStoreVersion((v) => v + 1);
    return res;
  };

  const value = useMemo(
    () => ({
      stores,
      currentStoreId,
      storeVersion,
      loading,
      storesError,
      selectStore,
      refreshStores: fetchMyStores,
    }),
    [stores, currentStoreId, storeVersion, loading, storesError, selectStore, fetchMyStores]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export const useStoreContext = () => useContext(StoreContext);


