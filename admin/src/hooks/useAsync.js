import { useContext, useEffect, useState } from "react";
import { SidebarContext } from "@/context/SidebarContext";
import { useStoreContext } from "@/context/StoreContext";

const useAsync = (asyncFunction) => {
  const [data, setData] = useState([] || {});
  const [error, setError] = useState("");
  // const [errCode, setErrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const {
    invoice,
    status,
    zone,
    time,
    limitData,
    startDate,
    endDate,
    method,
    isUpdate,
    setIsUpdate,
    currentPage,
    category,
    searchText,
    sortedField,
  } = useContext(SidebarContext);
  const { currentStoreId, storeVersion } = useStoreContext() || {};

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await asyncFunction({ signal: controller.signal });
        setData(res);
        setError("");
        setLoading(false);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
        setLoading(false);
        setData([]);
      }
    })();

    if (isUpdate) {
      setIsUpdate(false);
    }

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invoice,
    status,
    zone,
    time,
    method,
    limitData,
    startDate,
    endDate,
    isUpdate,
    currentPage,
    category,
    searchText,
    sortedField,
    currentStoreId,
    storeVersion,
  ]);

  return {
    data,
    error,
    loading,
  };
};

export default useAsync;
