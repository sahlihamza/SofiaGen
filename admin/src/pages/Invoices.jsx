import { Card, CardBody, Badge, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow, Pagination, Input, Select, Label } from "@windmill/react-ui";

import { useState, useContext, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiMoreVertical, FiDownload, FiEye, FiTrash2 } from "react-icons/fi";

// Internal import
import InvoiceServices from "@/services/InvoiceServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import InvoiceDrawer from "@/components/drawer/InvoiceDrawer";
import AnimatedContent from "@/components/common/AnimatedContent";
import ActionMenu from "@/components/table/ActionMenu";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";
import formatMoney from "@/utils/formatMoney";
import { Button } from "@sofia/ui";

const statusBadgeMap = {
  paid: { type: "success", label: "Paid" },
  sent: { type: "info", label: "Sent" },
  draft: { type: "gray", label: "Draft" },
  overdue: { type: "danger", label: "Overdue" },
  canceled: { type: "neutral", label: "Canceled" },
};

const Invoices = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const { serviceId, setServiceId } = useToggleDrawer();

  const {
    currentPage,
    setCurrentPage,
    searchText,
    setSearchText,
    status,
    setStatus,
    resultsPerPage,
    handleSubmitForAll,
  } = useContext(SidebarContext);

  const canViewInvoice = hasPermission("invoices", "read");
  const canDeleteInvoice = hasPermission("invoices", "delete");

  const [planFilter, setPlanFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices", currentPage, searchText, status, planFilter],
    queryFn: async () => {
      return await InvoiceServices.getInvoices({
        page: currentPage,
        limit: resultsPerPage,
        search: searchText,
        status: status,
      });
    },
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination || {};

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleReset = () => {
    setSearchText("");
    setStatus("");
    setPlanFilter("");
  };

  const handleDelete = async (id) => {
    try {
      await InvoiceServices.updateInvoice(id, { status: "canceled" });
      successMessage(t("InvoiceDeleteSuccess") || "Invoice canceled successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err) {
      errorMessage(
        err?.response?.data?.message || t("InvoiceDeleteFailed") || "Failed to cancel invoice"
      );
    }
  };

  const handleViewInvoice = (id) => {
    setServiceId(id);
  };

  // fetch invoice when a drawer id (serviceId) is set
  const { setInvoice } = useContext(SidebarContext);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!serviceId) return;
      try {
        const res = await InvoiceServices.getInvoiceById(serviceId);
        // API returns { success, data }
        if (mounted) setInvoice(res?.data?.data || res?.data || null);
      } catch (err) {
        errorMessage(err?.response?.data?.message || "Failed to load invoice");
      }
    };
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const handleDownloadInvoice = (invoice) => {
    const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChangePage = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      <PageTitle>{t("InvoicesPageTitle") || "Invoices"}</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form onSubmit={handleSearchSubmit}>
              <div className="grid gap-4 lg:gap-4 xl:gap-6 md:gap-2 md:grid-cols-5 py-2">
                <div>
                  <Input
                    type="search"
                    name="search"
                    placeholder={t("SearchInvoice") || "Search by invoice number"}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>

                <div>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="" defaultValue hidden>
                      {t("AllStatus") || "All status"}
                    </option>
                    <option value="draft">{t("Draft") || "Draft"}</option>
                    <option value="sent">{t("Sent") || "Sent"}</option>
                    <option value="paid">{t("Paid") || "Paid"}</option>
                    <option value="overdue">{t("Overdue") || "Overdue"}</option>
                    <option value="canceled">{t("Canceled") || "Canceled"}</option>
                  </Select>
                </div>

                <div>
                  <Select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                  >
                    <option value="" defaultValue hidden>
                      {t("AllPlans") || "All plans"}
                    </option>
                    <option value="Starter">{t("Starter") || "Starter"}</option>
                    <option value="Professional">{t("Professional") || "Professional"}</option>
                    <option value="Enterprise">{t("Enterprise") || "Enterprise"}</option>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    {t("Filter")}
                  </Button>

                  <Button
                    layout="outline"
                    onClick={handleReset}
                    type="button"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>

        {isLoading ? (
          <TableLoading row={10} col={8} width={140} height={20} />
        ) : error ? (
          <p className="text-center text-red-500">
            {error?.response?.data?.message || error?.message || String(error)}
          </p>
        ) : invoices.length > 0 ? (
          <TableContainer className="mb-8">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("InvoiceNo") || "Invoice"}</TableCell>
                  <TableCell>{t("Store") || "Store"}</TableCell>
                  <TableCell>{t("Plan") || "Plan"}</TableCell>
                  <TableCell>{t("Amount") || "Amount"}</TableCell>
                  <TableCell>{t("Status")}</TableCell>
                  <TableCell>{t("DueDate") || "Due Date"}</TableCell>
                  <TableCell>{t("IssuedAt") || "Issued"}</TableCell>
                  <TableCell className="text-right">{t("Actions") || "Actions"}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const statusConfig =
                    statusBadgeMap[invoice.status] || { type: "gray", label: invoice.status };
                  return (
                    <TableRow key={invoice._id}>
                      <TableCell>
                        <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {invoice.storeId?.name || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {invoice.planId?.name || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatMoney(invoice.total, invoice.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge type={statusConfig.type}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {invoice.dueDate
                            ? new Date(invoice.dueDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {invoice.issuedAt
                            ? new Date(invoice.issuedAt).toLocaleDateString()
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <ActionMenu
                            id={invoice._id}
                            title={invoice.invoiceNumber}
                            isCheck={[]}
                            handleUpdate={canViewInvoice ? () => handleViewInvoice(invoice._id) : undefined}
                            handleModalOpen={canDeleteInvoice ? (id) => handleDelete(id) : undefined}
                            showEdit={canViewInvoice}
                            showDelete={canDeleteInvoice}
                            extraActions={[
                              {
                                key: "download",
                                Icon: FiDownload,
                                label: t("Download") || "Download",
                                className: "text-gray-500 dark:text-gray-400 hover:text-emerald-600",
                                onClick: () => handleDownloadInvoice(invoice),
                              },
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
             <TableFooter>
            <Pagination
                totalResults={pagination.total || 0}
                resultsPerPage={resultsPerPage}
                onChange={handleChangePage}
                label="Table navigation"
            />
          </TableFooter>
          </TableContainer>
        ) : (
          <NotFound title={t("NoInvoices") || "No invoices found."} />
        )}
        <MainDrawer>
          <InvoiceDrawer />
        </MainDrawer>
      </AnimatedContent>
    </>
  );
};

export default Invoices;