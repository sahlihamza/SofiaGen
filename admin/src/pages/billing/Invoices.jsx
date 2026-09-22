import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination } from "@windmill/react-ui";
import dayjs from "dayjs";
import { FiDownload, FiEye, FiPrinter, FiRefreshCw } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import InvoiceServices from "@/services/InvoiceServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const statusBadge = (status) => {
  const map = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    canceled: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };
  return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const Invoices = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();

  const [filters, setFilters] = useState({ status: "", storeId: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["invoices", filters, currentPage],
    queryFn: () =>
      InvoiceServices.getInvoices({
        page: currentPage,
        limit: pageSize,
        status: filters.status,
        search: filters.search,
      }),
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const handleDownload = async (invoiceId) => {
    try {
      const result = await InvoiceServices.generateInvoicePDF(invoiceId);
      window.open(result.filePath, "_blank");
      successMessage(t("PDFGenerated") || "PDF generated successfully");
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message || "PDF generation failed");
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ status: "", storeId: "", search: "" });
    setCurrentPage(1);
  };

  const columns = [
    { key: "invoiceNumber", header: t("InvoiceNumber") || "Invoice #" },
    { key: "store", header: t("Store") || "Store" },
    { key: "plan", header: t("Plan") || "Plan" },
    { key: "total", header: t("Total") || "Total" },
    { key: "status", header: t("Status") || "Status" },
    { key: "issuedAt", header: t("Issued") || "Issued" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "invoiceNumber":
        return <span className="text-sm font-semibold">{row.invoiceNumber}</span>;
      case "store":
        return <span className="text-sm">{row.storeId?.name || row.storeId || "-"}</span>;
      case "plan":
        return <span className="text-sm">{row.planId?.name || row.planId || "-"}</span>;
      case "total":
        return <span className="text-sm font-semibold">{row.total} {row.currency || "USD"}</span>;
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status}</Badge>;
      case "issuedAt":
        return <span className="text-xs text-gray-500">{dayjs(row.issuedAt).format("DD/MM/YYYY")}</span>;
      case "actions":
        return (
          <div className="flex gap-2">
            <Button layout="outline" size="small" onClick={() => handleDownload(row._id)}>
              <FiDownload className="mr-1" />{t("PDF") || "PDF"}
            </Button>
            <Button layout="outline" size="small" onClick={() => window.open(`/invoices/${row._id}`, "_self")}>
              <FiEye className="mr-1" />{t("View") || "View"}
            </Button>
            <Button layout="outline" size="small" onClick={() => window.print()}>
              <FiPrinter className="mr-1" />{t("Print") || "Print"}
            </Button>
          </div>
        );
      default:
        return row[column.key];
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("Invoices") || "Invoices"}</PageTitle>

      <AnimatedContent>
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatuses") || "All statuses"}</option>
                  <option value="draft">{t("Draft") || "Draft"}</option>
                  <option value="sent">{t("Sent") || "Sent"}</option>
                  <option value="paid">{t("Paid") || "Paid"}</option>
                  <option value="overdue">{t("Overdue") || "Overdue"}</option>
                  <option value="canceled">{t("Canceled") || "Canceled"}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Search") || "Search"}</label>
                <Input
                  type="search"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder={t("SearchInvoices") || "Search invoices..."}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetch()} className="h-10">
                  <FiRefreshCw className="mr-2" />{t("Refresh") || "Refresh"}
                </Button>
                <Button layout="outline" onClick={handleReset} className="h-10">
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={7} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
            ) : invoices.length > 0 ? (
              <>
                <DataTable columns={columns} rows={invoices} getRowKey={(row) => row._id} tableClassName="min-w-full" cellClassName="px-4 py-3" renderCell={renderCell} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t("Showing") || "Showing"} {invoices.length} {t("Of") || "of"} {pagination.total}</span>
                  {pagination.pages > 1 && <Pagination totalResults={pagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setCurrentPage(page + 1)} label="Table navigation" />}
                </div>
              </>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoInvoices") || "No invoices found."}</p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default Invoices;