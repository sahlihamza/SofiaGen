import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, CardBody } from "@windmill/react-ui";
import { FiArrowLeft, FiDownload, FiPrinter, FiEye } from "react-icons/fi";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import InvoiceServices from "@/services/InvoiceServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import formatMoney from "@/utils/formatMoney";
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

const InvoiceDetail = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const { id } = useParams();

  const [isPrinting, setIsPrinting] = useState(false);

  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await InvoiceServices.getInvoiceById(id);
      return res?.data || res;
    },
    enabled: !!id && canView,
  });

  const invoice = data;

  const handleDownload = async () => {
    try {
      const result = await InvoiceServices.generateInvoicePDF(id);
      window.open(result.filePath, "_blank");
      successMessage(t("PDFGenerated") || "PDF generated successfully");
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message || "PDF generation failed");
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  if (!canView) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <PageTitle>{t("Loading") || "Loading..."}</PageTitle>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <PageTitle>{t("InvoiceNotFound") || "Invoice Not Found"}</PageTitle>
        <p className="text-sm text-red-500 mt-2">
          {error?.response?.data?.message || error?.message || String(error)}
        </p>
        <Button className="mt-4" onClick={() => refetch()}>
          {t("Retry") || "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("InvoiceDetail") || "Invoice Detail"}</PageTitle>

      <AnimatedContent>
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button layout="outline" size="small" onClick={() => window.history.back()}>
                  <FiArrowLeft className="mr-2" /> {t("Back") || "Back"}
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    Invoice #{invoice.invoiceNumber}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dayjs(invoice.issuedAt).format("MMMM D, YYYY")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button layout="outline" size="small" onClick={handlePrint} disabled={isPrinting}>
                  <FiPrinter className="mr-2" /> {t("Print") || "Print"}
                </Button>
                <Button layout="outline" size="small" onClick={handleDownload}>
                  <FiDownload className="mr-2" /> {t("DownloadPDF") || "Download PDF"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-xs font-serif font-semibold uppercase text-gray-500 mb-2">
                  {t("BillTo") || "Bill To"}
                </h3>
                <p className="text-sm text-gray-700 font-medium dark:text-gray-200">
                  {invoice.storeId?.name || "-"}
                </p>
                {invoice.storeId?.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.storeId.email}</p>
                )}
                {invoice.storeId?.address && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.storeId.address}</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-serif font-semibold uppercase text-gray-500 mb-2">
                  {t("Plan") || "Plan"}
                </h3>
                <p className="text-sm text-gray-700 font-medium dark:text-gray-200">
                  {invoice.planId?.name || invoice.planId?.slug || "-"}
                </p>
                {invoice.subscriptionId && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t("Subscription") || "Subscription"}: {invoice.subscriptionId.status || "-"}
                  </p>
                )}
                {invoice.dueDate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t("DueDate") || "Due Date"}: {dayjs(invoice.dueDate).format("MMMM D, YYYY")}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t("Status") || "Status"}:{" "}
                  <Badge className={statusBadge(invoice.status)}>{invoice.status}</Badge>
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-serif font-semibold uppercase text-gray-500 mb-3">
                {t("Items") || "Items"}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-100 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-serif font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-serif font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t("Description") || "Description"}
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-serif font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t("Quantity") || "Qty"}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-serif font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t("UnitPrice") || "Unit Price"}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-serif font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t("Amount") || "Amount"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                      invoice.items.map((item, i) => (
                        <tr key={i} className="text-sm">
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-200 font-medium">
                            {item.description || item.name || "Item"}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-300">
                            {item.quantity || 1}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300 font-mono">
                            {formatMoney(Number(item.unitPrice || item.total || 0), invoice.currency)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200 font-semibold font-mono">
                            {formatMoney(Number(item.total), invoice.currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                          {t("NoItems") || "No items"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t("Subtotal") || "Subtotal"}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200 font-mono">
                  {formatMoney(Number(invoice.subtotal || 0), invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t("Tax") || "Tax"}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200 font-mono">
                  {formatMoney(Number(invoice.tax || 0), invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between gap-8 text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-700 dark:text-gray-200 font-bold">{t("Total") || "Total"}</span>
                <span className="font-bold text-gray-800 dark:text-gray-100 font-mono text-lg">
                  {formatMoney(Number(invoice.total || 0), invoice.currency)}
                </span>
              </div>
            </div>

            {invoice.paidAt && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("PaidOn") || "Paid on"}: {dayjs(invoice.paidAt).format("MMMM D, YYYY")}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default InvoiceDetail;
