import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import useDisableForDemo from "./useDisableForDemo";
import { useStoreContext } from "@/context/StoreContext";
import GdprServices from "@/services/GdprServices";
import { notifyError, notifySuccess } from "@/utils/toast";
const useGdprRequests = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { handleDisableForDemo } = useDisableForDemo();

  const [customerEmail, setCustomerEmail] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);

  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const loadRequests = async () => {
    if (!currentStoreId) return;

    setIsLoadingRequests(true);
    try {
      const res = await GdprServices.listRequests(currentStoreId, {
        page: 1,
        limit: 20,
      });
      setRequests(res?.data?.requests || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId]);

  const downloadExport = (data, email) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `export-${email}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportCustomer = async () => {
    if (handleDisableForDemo() || !currentStoreId || !customerEmail) return;

    setIsExporting(true);
    try {
      const res = await GdprServices.exportCustomerData(
        currentStoreId,
        customerEmail
      );
      downloadExport(res?.data, customerEmail);
      notifySuccess(t("GdprExportSuccess"));
      loadRequests();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  const deleteCustomer = async () => {
    if (handleDisableForDemo() || !currentStoreId || !customerEmail) return;

    setIsDeleting(true);
    try {
      await GdprServices.deleteCustomerData(currentStoreId, customerEmail);
      notifySuccess(t("GdprDeleteSuccess"));
      setCustomerEmail("");
      loadRequests();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const anonymizeCustomer = async () => {
    if (handleDisableForDemo() || !currentStoreId || !customerEmail) return;

    setIsAnonymizing(true);
    try {
      await GdprServices.anonymizeCustomerData(currentStoreId, customerEmail);
      notifySuccess(t("GdprAnonymizeSuccess"));
      setCustomerEmail("");
      loadRequests();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsAnonymizing(false);
    }
  };

  return {
    customerEmail,
    setCustomerEmail,
    isExporting,
    isDeleting,
    isAnonymizing,
    exportCustomer,
    deleteCustomer,
    anonymizeCustomer,
    requests,
    isLoadingRequests,
  };
};

export default useGdprRequests;
