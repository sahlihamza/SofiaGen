import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import exportFromJSON from "export-from-json";
import { FiDownload, FiPlus } from "react-icons/fi";

//internal import
import useAsync from "@/hooks/useAsync";
import useGetCData from "@/hooks/useGetCData";
import useOrderActions from "@/hooks/useOrderActions";
import usePrintLabels from "@/hooks/usePrintLabels";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useOrderStatusCounts from "@/hooks/useOrderStatusCounts";
import OrderServices from "@/services/OrderServices";
import CustomerServices from "@/services/CustomerServices";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifyInfo } from "@/utils/toast";
import { getOrderStatusLabel } from "@/utils/orderStatus";
import AnimatedContent from "@/components/common/AnimatedContent";
import OrderTable from "@/components/order/OrderTable";
import OrderToolbar from "@/components/order/OrderToolbar";
import OrderStatusTabs from "@/components/order/OrderStatusTabs";
import OrderScreenOptions from "@/components/order/OrderScreenOptions";
import useOrderScreenOptions, {
  DEFAULT_PER_PAGE,
} from "@/hooks/useOrderScreenOptions";
import OrderPagination from "@/components/order/OrderPagination";
import OrderEmptyState from "@/components/order/OrderEmptyState";
import OrderConfirmModal from "@/components/order/OrderConfirmModal";
import OrderPreviewModal from "@/components/order/OrderPreviewModal";
import { LoadingSpinner } from "@/components/ui";
import OrderBulkBar from "@/components/order/OrderBulkBar";
import PrintLabelsModal from "@/components/order/PrintLabelsModal";
import { Button } from "@sofia/ui";

// Sorting rides on SidebarContext's `sortedField` because that is one of the
// few values useAsync watches to refetch. Other screens write their own things
// into it, so only the exact "<column>-<direction>" shape is read back.
const SORT_PATTERN = /^(invoice|date|total)-(asc|desc)$/;

const parseSort = (value) => {
  const match = SORT_PATTERN.exec(value || "");
  return match
    ? { sortBy: match[1], sortOrder: match[2] }
    : { sortBy: "", sortOrder: "desc" };
};

const EMPTY_FILTERS = {
  time: "",
  customer: "",
  status: "",
  startDate: "",
  endDate: "",
  method: "",
};

const TableSkeleton = () => (
  <div className="animate-pulse space-y-3 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <div className="h-4 w-4 rounded bg-[#f0f0f1] dark:bg-gray-700" />
        <div className="h-4 flex-1 rounded bg-[#f0f0f1] dark:bg-gray-700" />
        <div className="hidden h-4 w-40 rounded bg-[#f0f0f1] sm:block dark:bg-gray-700" />
        <div className="hidden h-4 w-24 rounded bg-[#f0f0f1] md:block dark:bg-gray-700" />
        <div className="h-4 w-20 rounded bg-[#f0f0f1] dark:bg-gray-700" />
      </div>
    ))}
  </div>
);

const Orders = () => {
  const {
    time,
    setTime,
    status,
    setStatus,
    method,
    setMethod,
    endDate,
    setEndDate,
    startDate,
    setStartDate,
    searchText,
    setSearchText,
    searchRef,
    isUpdate,
    currentPage,
    setCurrentPage,
    handleChangePage,
    limitData,
    setLimitData,
    sortedField,
    setSortedField,
  } = useContext(SidebarContext);

  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { currency, getNumberTwo, showDateFormat } = useUtilsFunction();

  const canCreate = hasPermission("orders", "create");
  const canUpdate = hasPermission("orders", "update");
  const canDelete = hasPermission("orders", "delete");
  // SFG-155: producing shipping paperwork is its own permission â€” reading

  // orders does not grant it.
  const canPrintLabel = hasPermission("orders", "print_label");

  const { isRunning, changeStatus, changeStatusMany, removeOrder, removeOrderMany } =
    useOrderActions();

  const printLabels = usePrintLabels();

  // Visible columns + rows per page, restored from localStorage.
  const { options: screenOptions, applyOptions } = useOrderScreenOptions();

  // Draft filter values: the selects only reach the API once "Filtrer" is
  // pressed, the way the WooCommerce order list behaves.
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    time: time || "",
    status: status || "",
    method: method || "",
    startDate: startDate || "",
    endDate: endDate || "",
  });
  // The applied client filter, kept apart from the draft one above.
  const [customer, setCustomer] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCheck, setIsCheck] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [loadingExport, setLoadingExport] = useState(false);
  // The id rather than the row: after a status change the list refetches, and
  // the preview has to follow the fresh copy instead of the one it opened on.
  const [previewId, setPreviewId] = useState(null);

  const { sortBy, sortOrder } = parseSort(sortedField);

  const { data, loading, error } = useAsync(() =>
    OrderServices.getAllOrders({
      day: time,
      method: method,
      status: status,
      page: currentPage,
      endDate: endDate,
      startDate: startDate,
      limit: limitData,
      customerName: searchText,
      sortBy,
      sortOrder,
    })
  );

  // SidebarContext holds the filters for every list screen, so an order search
  // can still be applied from an earlier visit while the input renders empty,
  // and the page size it carries has to match the saved screen options.
  useEffect(() => {
    if (searchRef?.current) searchRef.current.value = searchText || "";
    if (screenOptions.perPage !== limitData) setLimitData(screenOptions.perPage);

    // `limitData` and `sortedField` are shared by every list screen, so both
    // go back to the common default on the way out.
    return () => {
      setLimitData(DEFAULT_PER_PAGE);
      setSortedField("");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useAsync clears `isUpdate` on its own effect, so the counters watch the
  // rising edge to know a write happened and their cached totals are stale.
  const [countVersion, setCountVersion] = useState(0);
  useEffect(() => {
    if (isUpdate) setCountVersion((v) => v + 1);
  }, [isUpdate]);

  const { counts } = useOrderStatusCounts({
    time,
    method,
    startDate,
    endDate,
    searchText,
    version: countVersion,
  });

  // Populates the "Filtrer par client" select. Cached: the list does not move
  // while someone works through the orders.
  const { data: customerData } = useQuery({
    queryKey: ["orderCustomerOptions"],
    queryFn: () => CustomerServices.getAllCustomers({ limit: 500 }),
    staleTime: 10 * 60 * 1000,
  });

  const customerOptions = useMemo(
    () =>
      [
        ...new Set(
          (customerData?.customers || []).map((c) => c?.name).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [customerData]
  );

  // The API narrows by name *or* invoice, so a free-text search and a picked
  // client share one parameter. When both are set the picked client is applied
  // on top of what came back.
  const orders = useMemo(() => {
    const list = data?.orders || [];
    if (!customer) return list;
    return list.filter((order) => order?.user_info?.name === customer);
  }, [data, customer]);

  const isCheckAll = orders.length > 0 && isCheck.length === orders.length;

  const previewOrder = orders.find((order) => order._id === previewId) || null;

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearSelection = () => {
    setIsCheck([]);
    setBulkAction("");
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    const search = searchRef?.current?.value?.trim() || "";

    setTime(filters.time);
    setStatus(filters.status);
    setMethod(filters.method);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setCustomer(filters.customer);
    setSearchText(search || filters.customer || null);
    setCurrentPage(1);
    clearSelection();
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCustomer("");
    setTime("");
    setStatus("");
    setMethod("");
    setStartDate("");
    setEndDate("");
    setSearchText(null);
    setSortedField("");
    if (searchRef?.current) searchRef.current.value = "";
    setCurrentPage(1);
    clearSelection();
  };

  const handleSelectTab = (value) => {
    setStatus(value);
    setFilter("status", value);
    setCurrentPage(1);
    clearSelection();
  };

  // First click on a column sorts it ascending, clicking the same one again
  // flips it â€” so both directions are always one click away.

  const handleSort = (key) => {
    const nextOrder = sortBy === key && sortOrder === "asc" ? "desc" : "asc";
    setSortedField(`${key}-${nextOrder}`);
    setCurrentPage(1);
    clearSelection();
  };

  const handleApplyScreenOptions = (next) => {
    const applied = applyOptions(next);
    setLimitData(applied.perPage);
    setCurrentPage(1);
    clearSelection();
  };

  const handleSelectAll = () => {
    setIsCheck(isCheckAll ? [] : orders.map((order) => order._id));
  };

  // The modal lists the selection as badges, so it needs the rows behind the
  // ids â€” kept in the order the ids were picked, which is the order the pages

  // come out of the PDF in.
  const labelOrders = printLabels.orderIds
    .map((id) => orders.find((order) => order._id === id))
    .filter(Boolean);

  const handlePrintLabels = () => {
    if (!canPrintLabel) return notifyError(t("OrderNoPrintLabelPermission"));
    // Nothing selected means nothing to print: the modal never opens empty.
    if (isCheck.length === 0) return notifyError(t("OrderBulkChooseOrders"));
    printLabels.open(isCheck);
  };

  // The row action is the same flow on a selection of one.
  const handlePrintOneLabel = (order) => {
    if (!canPrintLabel) return notifyError(t("OrderNoPrintLabelPermission"));
    printLabels.open([order._id]);
  };

  // The result travels back: the preview only refreshes its own copy of the
  // order once the write actually went through.
  const handleChangeStatus = (id, nextStatus) => changeStatus(id, nextStatus);

  const handleApplyBulk = async () => {
    if (!bulkAction) return notifyError(t("OrderBulkChooseAction"));
    if (isCheck.length === 0) return notifyError(t("OrderBulkChooseOrders"));

    if (bulkAction === "delete") {
      if (!canDelete) return notifyError(t("OrderNoDeletePermission"));
      return setConfirmAction({ type: "bulkDelete", ids: isCheck });
    }

    if (!canUpdate) return notifyError(t("OrderNoUpdatePermission"));

    const nextStatus = bulkAction.split(":")[1];
    const ok = await changeStatusMany(isCheck, nextStatus);
    if (ok) clearSelection();
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    const ok =
      confirmAction.type === "bulkDelete"
        ? await removeOrderMany(confirmAction.ids)
        : await removeOrder(confirmAction.order._id);

    if (ok) clearSelection();
    setConfirmAction(null);
  };

  const handleDownloadOrders = async () => {
    try {
      setLoadingExport(true);
      const res = await OrderServices.getAllOrders({
        page: 1,
        day: time,
        method: method,
        status: status,
        endDate: endDate,
        startDate: startDate,
        limit: data?.totalDoc,
        customerName: searchText,
      });

      const exportData = (res?.orders || []).map((order) => ({
        invoice: order.invoice,
        customer: order?.user_info?.name,
        email: order?.user_info?.email,
        date: showDateFormat(order.createdAt),
        status: getOrderStatusLabel(order.status, t),
        paymentMethod: order.paymentMethod,
        subTotal: getNumberTwo(order.subTotal),
        shippingCost: getNumberTwo(order.shippingCost),
        discount: getNumberTwo(order?.discount),
        total: getNumberTwo(order.total),
      }));

      exportFromJSON({
        data: exportData,
        fileName: "orders",
        exportType: exportFromJSON.types.csv,
      });
      setLoadingExport(false);
    } catch (err) {
      setLoadingExport(false);
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  // There is no manual order-creation flow yet â€” orders reach the back-office

  // from the storefront checkout. The button stays so the header matches the
  // rest of the admin; point it at the route once that screen exists.
  const handleAddOrder = () => notifyInfo(t("OrderAddUnavailable"));

  const hasOrders = orders.length > 0;

  return (
    <div className="-mx-2 min-h-full bg-[#f5f5f5] px-2 pb-10 lg:-mx-6 lg:px-6 dark:bg-gray-900">
      <OrderConfirmModal
        isOpen={Boolean(confirmAction)}
        isSubmitting={isRunning}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        confirmLabel={t("OrderActionDelete")}
        title={
          confirmAction?.type === "bulkDelete"
            ? t("OrderDeleteManyTitle", {
                total: confirmAction?.ids?.length || 0,
                defaultValue: "Supprimer les commandes sÃ©lectionnÃ©es ?",

              })
            : t("OrderDeleteTitle", {
                invoice: confirmAction?.order?.invoice,
                defaultValue: "Supprimer cette commande ?",
              })
        }
        description={t("OrderDeleteDescription")}
      />

      <PrintLabelsModal
        isOpen={printLabels.isOpen}
        orders={labelOrders}
        phase={printLabels.phase}
        kind={printLabels.kind}
        errorMessage={printLabels.errorMessage}
        isPrinted={printLabels.isPrinted}
        onGenerateLabels={() => printLabels.generateLabels()}
        onGenerateManifest={printLabels.generateManifest}
        onPrint={printLabels.print}
        onDownload={printLabels.download}
        onBack={printLabels.back}
        onClose={printLabels.close}
      />

      {previewOrder && (
        <OrderPreviewModal
          order={previewOrder}
          canUpdate={canUpdate}
          isSubmitting={isRunning}
          onChangeStatus={handleChangeStatus}
          onClose={() => setPreviewId(null)}
        />
      )}

      <header className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d2327] dark:text-gray-100">
            {t("OrdersPageHeading")}
          </h1>
          <p className="mt-1 text-sm text-[#646970] dark:text-gray-400">
            {t("OrdersPageSubheading")}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleDownloadOrders}
              disabled={!data?.totalDoc || loadingExport}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#dcdcde] bg-white px-4 text-sm font-medium text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {loadingExport ? (
                <LoadingSpinner alt="" width={18} height={18} />
              ) : (
                <FiDownload size={16} />
              )}
              {t("OrderExport")}
            </Button>

            {canCreate && (
              <Button
                type="button"
                onClick={handleAddOrder}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#2271b1] px-4 text-sm font-medium text-white transition-colors hover:bg-[#135e96] focus:outline-none focus:ring-2 focus:ring-[#2271b1] focus:ring-offset-1 dark:focus:ring-offset-gray-900"
              >
                <FiPlus size={16} />
                {t("OrderAdd")}
              </Button>
            )}
          </div>

          <OrderScreenOptions
            options={screenOptions}
            onApply={handleApplyScreenOptions}
          />
        </div>
      </header>

      <AnimatedContent>
        <div className="space-y-4">
          <OrderStatusTabs
            activeStatus={status || ""}
            counts={counts}
            onSelect={handleSelectTab}
          />

          <OrderToolbar
            searchRef={searchRef}
            onSubmit={handleApplyFilters}
            onReset={handleResetFilters}
            filters={filters}
            setFilter={setFilter}
            customers={customerOptions}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            bulkAction={bulkAction}
            setBulkAction={setBulkAction}
            onApplyBulk={handleApplyBulk}
            selectedCount={isCheck.length}
            canBulkEdit={canUpdate || canDelete}
            isBulkRunning={isRunning}
          />

          <div className="overflow-hidden rounded-lg border border-[#dcdcde] bg-white dark:border-gray-700 dark:bg-gray-800">
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-rose-500">
                {error}
              </p>
            ) : hasOrders ? (
              <>
                <OrderTable
                  orders={orders}
                  isCheck={isCheck}
                  setIsCheck={setIsCheck}
                  isCheckAll={isCheckAll}
                  onSelectAll={handleSelectAll}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  canPrintLabel={canPrintLabel}
                  onPrintLabel={handlePrintOneLabel}
                  columns={screenOptions.columns}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onChangeStatus={handleChangeStatus}
                  onPreview={(order) => setPreviewId(order._id)}
                  onDelete={(order) =>
                    setConfirmAction({ type: "delete", order })
                  }
                />
                <OrderPagination
                  currentPage={currentPage}
                  resultsPerPage={limitData}
                  totalResults={data?.totalDoc || 0}
                  onChange={(page) => {
                    handleChangePage(page);
                    clearSelection();
                  }}
                />
              </>
            ) : (
              <OrderEmptyState
                title={t("OrderEmptyTitle")}
                description={t("OrderEmptyDescription")}
              />
            )}
          </div>

          {data?.methodTotals?.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-[#dcdcde] bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
              {data.methodTotals.map(
                (el, i) =>
                  el?.method && (
                    <span key={i} className="text-[#646970] dark:text-gray-400">
                      {el.method} :{" "}
                      <span className="font-semibold text-[#1d2327] dark:text-gray-200">
                        {currency}
                        {getNumberTwo(el.total)}
                      </span>
                    </span>
                  )
              )}
            </div>
          )}
        </div>
      </AnimatedContent>

      <OrderBulkBar
        selectedCount={isCheck.length}
        canPrintLabels={canPrintLabel}
        onPrintLabels={handlePrintLabels}
        onClear={clearSelection}
      />
    </div>
  );
};

export default Orders;
