import { useEffect, useState } from "react";

//internal import
import { useStoreContext } from "@/context/StoreContext";
import AuditLogServices from "@/services/AuditLogServices";
import { notifyError } from "@/utils/toast";
const RESULTS_PER_PAGE = 5;

const useAuditLog = () => {
  const { currentStoreId } = useStoreContext() || {};

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const loadEntries = async (targetPage = page) => {
    if (!currentStoreId) return;

    setIsLoading(true);
    try {
      const res = await AuditLogServices.list(currentStoreId, {
        page: targetPage,
        limit: RESULTS_PER_PAGE,
      });
      setEntries(res?.data?.entries || []);
      setTotalResults(res?.data?.total || 0);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadEntries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId]);

  const handleChangePage = (nextPage) => {
    setPage(nextPage);
    loadEntries(nextPage);
  };

  // Refresh keeps the admin on whichever page they're viewing.
  const refresh = () => loadEntries(page);

  return {
    entries,
    isLoading,
    refresh,
    page,
    setPage: handleChangePage,
    totalResults,
    resultsPerPage: RESULTS_PER_PAGE,
  };
};

export default useAuditLog;
