import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Select, Modal, ModalBody, ModalFooter, Dropdown, DropdownItem } from "@windmill/react-ui";
import {
  FiRefreshCw,
  FiEye,
  FiRotateCcw,
  FiDollarSign,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiMoreVertical,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import PaymentTransactionServices from "@/services/PaymentTransactionServices";
import { Button } from "@sofia/ui";

const statusBadge = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    processing: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    succeeded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    refunded: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    partially_refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const formatAmount = (amount, currency = "usd") => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString();
};

const KpiCard = ({ icon: Icon, label, value, color, subValue }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>
        )}
      </div>
    </div>
  </div>
);

const statusOptions = [
  { value: "", labelKey: "AllStatuses" },
  { value: "pending", labelKey: "Pending" },
  { value: "processing", labelKey: "Processing" },
  { value: "paid", labelKey: "Paid" },
  { value: "succeeded", labelKey: "Succeeded" },
  { value: "failed", labelKey: "Failed" },
  { value: "refunded", labelKey: "Refunded" },
  { value: "partially_refunded", labelKey: "PartiallyRefunded" },
  { value: "cancelled", labelKey: "Cancelled" },
];

const Transactions = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const canView = hasPermission("payments", "view");
  const canUpdate = hasPermission("payments", "update");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "", failureReason: "" });
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleMenu = (id) => setOpenMenuId((prev) => (prev === id ? null : id));

  const { data: providerData } = useQuery({
    queryKey: ["paymentProvidersForTransactions"],
    queryFn: () => PaymentTransactionServices.getAll({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["paymentTransactionStats"],
    queryFn: () => PaymentTransactionServices.getStats(),
    staleTime: 5 * 60 * 1000,
    enabled: canView,
  });

  const stats = statsData?.data || {};

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["transactions", search, statusFilter, providerFilter, methodFilter, currencyFilter, currentPage],
    queryFn: () =>
      PaymentTransactionServices.getAll({
        search,
        status: statusFilter || undefined,
        providerId: providerFilter || undefined,
        method: methodFilter || undefined,
        currency: currencyFilter || undefined,
        page: currentPage,
        limit: pageSize,
      }),
    enabled: canView,
    keepPreviousData: true,
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };
  const providers = providerData?.data || [];

  const kpiStats = useMemo(() => {
    const total = stats.totalTransactions ?? stats.total ?? 0;
    const succeeded = stats.succeeded ?? stats.paid ?? 0;
    const failed = stats.failed ?? 0;
    const totalAmount = stats.totalAmount ?? stats.amount ?? 0;
    return { total, succeeded, failed, totalAmount };
  }, [stats]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, metadata }) =>
      PaymentTransactionServices.updateStatus(id, { status, metadata }),
    onSuccess: () => {
      successMessage(t("TransactionStatusUpdated") || "Transaction status updated");
      setStatusModalOpen(false);
      setSelectedTransaction(null);
      queryClient.invalidateQueries(["transactions"]);
    },
    onError: (err) =>
      errorMessage(err?.response?.data?.message || err?.message || "Status update failed"),
  });

  const retryMutation = useMutation({
    mutationFn: (id) => PaymentTransactionServices.retry(id),
    onSuccess: () => {
      successMessage(t("TransactionRetried") || "Transaction retried");
      queryClient.invalidateQueries(["transactions"]);
    },
    onError: (err) =>
      errorMessage(err?.response?.data?.message || err?.message || "Retry failed"),
  });

  const handleStatusUpdate = () => {
    if (!selectedTransaction || !statusForm.status) return;
    updateStatusMutation.mutate({
      id: selectedTransaction._id,
      status: statusForm.status,
      metadata: {
        failureReason: statusForm.failureReason || undefined,
        ...(statusForm.status === "paid" || statusForm.status === "succeeded"
          ? { paidAt: new Date().toISOString() }
          : {}),
      },
    });
  };

  const openStatusModal = (transaction) => {
    setSelectedTransaction(transaction);
    setStatusForm({
      status: transaction.status === "paid" ? "refunded" : "paid",
      failureReason: transaction.failureReason || "",
    });
    setStatusModalOpen(true);
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setProviderFilter("");
    setMethodFilter("");
    setCurrencyFilter("");
    setCurrentPage(1);
  };

  const columns = [
    { key: "transactionId", header: t("TransactionID") || "Transaction ID" },
    { key: "store", header: t("Store") || "Store" },
    { key: "provider", header: t("Provider") || "Provider" },
    { key: "customer", header: t("Customer") || "Customer" },
    { key: "order", header: t("Order") || "Order" },
    { key: "method", header: t("Method") || "Method" },
    { key: "amount", header: t("Amount") || "Amount" },
    { key: "status", header: t("Status") || "Status" },
    { key: "createdAt", header: t("Date") || "Date" },
    { key: "actions", header: "" },
  ];

  const uniqueMethods = [...new Set(transactions.map((t) => t.method).filter(Boolean))];
  const uniqueCurrencies = [...new Set(transactions.map((t) => t.currency).filter(Boolean))];

  const renderCell = ({ row, column }) => {
    const value = row[column.key];
    switch (column.key) {
      case "transactionId":
        return (
          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
            {row.transactionId || row.gatewayTransactionId || "-"}
          </span>
        );
      case "store":
        return <span className="text-sm text-gray-900 dark:text-gray-100">{row.storeId?.name || "-"}</span>;
      case "provider":
        return (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {row.providerId?.name || row.providerId?.code || "-"}
          </span>
        );
      case "customer":
        return (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {row.customerId?.name || row.customerId?.email || "-"}
          </span>
        );
      case "order":
        return (
          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
            {row.orderId?.orderNumber || "-"}
          </span>
        );
      case "method":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{row.method || "-"}</span>;
      case "amount":
        return (
          <>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatAmount(row.amount, row.currency)}
            </span>
            {row.refundedAmount > 0 && (
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t("Refunded") || "Refunded"}: {formatAmount(row.refundedAmount, row.currency)}
              </span>
            )}
          </>
        );
      case "status":
        return (
          <>
            <Badge className={statusBadge(row.status)}>
              {t(row.status.charAt(0).toUpperCase() + row.status.slice(1)) || row.status}
            </Badge>
            {row.failureReason && (
              <span title={row.failureReason} className="block text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[120px]">
                {row.failureReason}
              </span>
            )}
          </>
        );
      case "createdAt":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(row.createdAt)}</span>;
      case "actions":
        return (
          <div className="relative inline-block text-left">
            <Button
              layout="outline"
              size="small"
              aria-label={t("Actions") || "Actions"}
              onClick={() => toggleMenu(row._id)}
              iconLeft={FiMoreVertical}
            />
            <Dropdown
              isOpen={openMenuId === row._id}
              onClose={() => setOpenMenuId(null)}
              align="right"
              className="!bottom-full !mt-0 !mb-2"
            >
              <DropdownItem onClick={() => { setOpenMenuId(null); openStatusModal(row); }}>
                {t("UpdateStatus") || "Update Status"}
              </DropdownItem>
              {row.status === "failed" && canUpdate && (
                <DropdownItem onClick={() => { setOpenMenuId(null); retryMutation.mutate(row._id); }}>
                  {t("Retry") || "Retry"}
                </DropdownItem>
              )}
            </Dropdown>
          </div>
        );
      default:
        return value;
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle>{t("TransactionsPageTitle", { defaultValue: "Transactions" })}</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            layout="outline"
            size="small"
            aria-label={t("Reset") || "Reset"}
            onClick={handleReset}
            className="h-10 px-3"
          >
            {t("Reset") || "Reset"}
          </Button>
          <Button layout="outline" size="small" iconLeft={FiRefreshCw} onClick={() => refetch()} className="h-10 px-3">
            {t("Refresh") || "Refresh"}
          </Button>
        </div>
      </div>

      <AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard
            icon={FiDollarSign}
            label={t("TotalTransactions") || "Total Transactions"}
            value={kpiStats.total}
            color="bg-sky-500"
          />
          <KpiCard
            icon={FiCheckCircle}
            label={t("SucceededTransactions") || "Succeeded"}
            value={kpiStats.succeeded}
            color="bg-emerald-500"
            subValue={t("SuccessfulPayments") || "Successful payments"}
          />
          <KpiCard
            icon={FiAlertCircle}
            label={t("FailedTransactions") || "Failed"}
            value={kpiStats.failed}
            color="bg-red-500"
          />
          <KpiCard
            icon={FiTrendingUp}
            label={t("TotalAmount") || "Total Amount"}
            value={formatAmount(kpiStats.totalAmount)}
            color="bg-violet-500"
          />
        </div>

        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 mb-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Search") || "Search"}
                </label>
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("SearchTransactions") || "Search by transaction ID..."}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Provider") || "Provider"}
                </label>
                <Select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                >
                  <option value="">{t("AllProviders") || "All Providers"}</option>
                  {providers.map?.((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name || p.code}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Status") || "Status"}
                </label>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey) || opt.value}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Method") || "Method"}
                </label>
                <Select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                >
                  <option value="">{t("AllMethods") || "All Methods"}</option>
                  {uniqueMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Currency") || "Currency"}
                </label>
                <Select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                >
                  <option value="">{t("AllCurrencies") || "All"}</option>
                  {uniqueCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <Button layout="outline" size="small" iconLeft={FiRefreshCw} onClick={() => refetch()} className="h-10 flex-1">
                  {t("Refresh") || "Refresh"}
                </Button>
                <Button layout="outline" size="small" onClick={handleReset} className="h-10 flex-1">
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={10} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : transactions.length > 0 ? (
              <DataTable
                columns={columns}
                rows={transactions}
                getRowKey={(row) => row._id}
                tableClassName="min-w-full"
                cellClassName="px-4 py-3"
                renderCell={renderCell}
              />
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("NoTransactionsFound") || "No transactions found."}
              </p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)}>
        <ModalBody>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-100 mb-1">
              {t("UpdateTransactionStatus") || "Update Transaction Status"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("TransactionId") || "Transaction"}:{" "}
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                {selectedTransaction?.transactionId || selectedTransaction?.gatewayTransactionId || "-"}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t("Status") || "Status"}
                </label>
                <Select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {statusOptions
                    .filter((opt) => opt.value !== "")
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey) || opt.value}
                      </option>
                    ))}
                </Select>
              </div>

              {["failed", "cancelled"].includes(statusForm.status) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t("FailureReason") || "Failure Reason"}
                  </label>
                  <Input
                    value={statusForm.failureReason}
                    onChange={(e) =>
                      setStatusForm((prev) => ({ ...prev, failureReason: e.target.value }))
                    }
                    placeholder={t("FailureReasonPlaceholder") || "Enter failure reason..."}
                  />
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button layout="outline" onClick={() => setStatusModalOpen(false)}>
            {t("Cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={updateStatusMutation.isLoading || !statusForm.status}
            isLoading={updateStatusMutation.isLoading}
          >
            {t("Save") || "Save"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default Transactions;
