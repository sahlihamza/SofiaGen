import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, CardBody, Pagination } from "@windmill/react-ui";
import dayjs from "dayjs";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import InvoiceServices from "@/services/InvoiceServices";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";
import { useStoreContext } from "@/context/StoreContext";

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

const MyInvoices = () => {
  const { t } = useTranslation();
  const { isSuperAdmin, canModule } = useAuthorizationContext();
  const { currentStoreId } = useStoreContext();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-invoices", currentPage],
    queryFn: () => InvoiceServices.getMyInvoices({ page: currentPage, limit: pageSize }),
    enabled: !!currentStoreId,
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  if (!isSuperAdmin && !canModule("invoices")) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("MyInvoices") || "My Invoices"}</PageTitle>

      <AnimatedContent>
        {!currentStoreId ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoStoreSelected") || "No store selected."}</p>
        ) : isLoading ? (
          <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700" />
        ) : error ? (
          <p className="text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
        ) : invoices.length > 0 ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("InvoiceNumber") || "Invoice #"}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Total") || "Total"}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Status") || "Status"}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Issued") || "Issued"}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("DueDate") || "Due Date"}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{invoice.total} {invoice.currency || "USD"}</td>
                        <td className="px-4 py-3 text-sm"><Badge className={statusBadge(invoice.status)}>{invoice.status}</Badge></td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{dayjs(invoice.issuedAt).format("DD/MM/YYYY")}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{invoice.dueDate ? dayjs(invoice.dueDate).format("DD/MM/YYYY") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("Showing") || "Showing"} {invoices.length} {t("Of") || "of"} {pagination.total}</span>
              {pagination.pages > 1 && <Pagination totalResults={pagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setCurrentPage(page)} label="Table navigation" />}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoInvoices") || "No invoices found."}</p>
        )}
      </AnimatedContent>
    </>
  );
};

export default MyInvoices;