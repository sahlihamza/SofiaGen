import { useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Select } from "@windmill/react-ui";
import { FiDownload } from "react-icons/fi";

//internal import
import AnalyticsServices from "@/services/AnalyticsServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const REPORT_OPTIONS = [
  { value: "dashboard", labelKey: "AnalyticsExportReportDashboard" },
  { value: "sales", labelKey: "AnalyticsExportReportSales" },
  { value: "orders", labelKey: "AnalyticsExportReportOrders" },
  { value: "customers", labelKey: "AnalyticsExportReportCustomers" },
  { value: "products", labelKey: "AnalyticsExportReportProducts" },
  { value: "categories", labelKey: "AnalyticsExportReportCategories" },
  { value: "coupons", labelKey: "AnalyticsExportReportCoupons" },
  { value: "revenue", labelKey: "AnalyticsExportReportRevenue" },
];

// Same trigger mechanism as the existing product CSV export
// (src/hooks/useProductExport.js) â€” a Blob URL on a throwaway <a>, no library.
const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const ExportMenu = ({ period, startDate, endDate }) => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState("dashboard");
  const [format, setFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { period };
      if (period === "custom") {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const blob = await AnalyticsServices.exportReport(format, reportType, params);
      const fileName = `${reportType}-report-${dayjs().format("YYYY-MM-DD")}.${format}`;
      downloadBlob(blob, fileName);
      notifySuccess(t("AnalyticsExportSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || t("AnalyticsExportError"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-40">
          {REPORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Select value={format} onChange={(e) => setFormat(e.target.value)} className="w-28">
          <option value="csv">{t("AnalyticsExportFormatCsv")}</option>
          <option value="pdf">{t("AnalyticsExportFormatPdf")}</option>
        </Select>
      </div>

      {/* Excel isn't a selectable format (backend returns 501) â€” shown
          disabled with a tooltip instead of hiding it outright, so it's
          discoverable as "planned" rather than looking unsupported. */}
      <span
        title={t("AnalyticsExportComingSoon")}
        className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-2 text-xs text-gray-400 dark:text-gray-500 cursor-not-allowed select-none"
      >
        {t("AnalyticsExportFormatExcel")}
      </span>

      <Button onClick={handleExport} disabled={exporting} size="sm">
        <FiDownload className="mr-2 h-4 w-4" />
        {exporting ? t("AnalyticsExporting") : t("AnalyticsExportButton")}
      </Button>
    </div>
  );
};

export default ExportMenu;
