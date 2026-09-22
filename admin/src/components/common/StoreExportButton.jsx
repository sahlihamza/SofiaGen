import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FiDownload } from "react-icons/fi";
import storeExportAPI from "@/services/storeExportAPI";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

// SO-16 â€” triggers an async CSV export for orders/customers/products and
// polls until the file is ready, then downloads it. Same request â†’ poll â†’
// download flow already used for platform audit-log exports
// (AuditLogsList.jsx), just pointed at the store-scoped endpoint.
const StoreExportButton = ({ source, filters = {} }) => {
  const { t } = useTranslation();
  const { successMessage, errorMessage } = useNotification();
  const [status, setStatus] = useState(null);

  const handleExport = async () => {
    try {
      setStatus("pending");
      const res = await storeExportAPI.requestExport({ source, format: "csv", ...filters });
      const jobId = res.data._id;

      const poll = async () => {
        const statusRes = await storeExportAPI.getStatus(jobId);
        const job = statusRes.data;
        setStatus(job.status);

        if (job.status === "completed") {
          const blob = await storeExportAPI.downloadExport(jobId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = job.fileName || `${source}-export.csv`;
          a.click();
          URL.revokeObjectURL(url);
          successMessage(t("ExportSuccess"));
          setStatus(null);
          return;
        }
        if (job.status === "failed") {
          errorMessage(job.error || t("ExportFailed"));
          setStatus(null);
          return;
        }
        setTimeout(poll, 2000);
      };
      poll();
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
      setStatus(null);
    }
  };

  return (
    <Button layout="outline" icon={FiDownload} disabled={!!status} onClick={handleExport}>
      {status ? t("Exporting") : t("Export")}
    </Button>
  );
};

export default StoreExportButton;
