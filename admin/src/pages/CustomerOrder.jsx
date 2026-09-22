import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

//internal import
import useAsync from "@/hooks/useAsync";
import useGetCData from "@/hooks/useGetCData";
import useOrderActions from "@/hooks/useOrderActions";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderServices from "@/services/OrderServices";
import { ORDER_STATUSES } from "@/utils/orderStatus";
import AnimatedContent from "@/components/common/AnimatedContent";
import OrderStatusTabs from "@/components/order/OrderStatusTabs";
import OrderPagination from "@/components/order/OrderPagination";
import OrderEmptyState from "@/components/order/OrderEmptyState";
import CustomerOrderTable from "@/components/customer/CustomerOrderTable";

const RESULTS_PER_PAGE = 10;

const SummaryCard = ({ label, value }) => (
  <div className="rounded-lg border border-[#dcdcde] bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
    <p className="text-xs font-medium uppercase tracking-wide text-[#646970] dark:text-gray-400">
      {label}
    </p>
    <p className="mt-1 text-xl font-semibold text-[#1d2327] dark:text-gray-100">
      {value}
    </p>
  </div>
);

const CustomerOrder = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { currency, getNumberTwo } = useUtilsFunction();
  const { changeStatus } = useOrderActions();

  const { data, loading, error } = useAsync(() =>
    OrderServices.getOrderCustomer(id)
  );

  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const allOrders = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Every order of this customer is already in memory, so the tabs, the totals
  // and the pages are all computed here instead of asking the API again.
  const counts = useMemo(
    () =>
      ORDER_STATUSES.reduce(
        (acc, value) => ({
          ...acc,
          [value]: allOrders.filter((order) => order.status === value).length,
        }),
        { all: allOrders.length }
      ),
    [allOrders]
  );

  const filteredOrders = useMemo(
    () =>
      status ? allOrders.filter((order) => order.status === status) : allOrders,
    [allOrders, status]
  );

  useEffect(() => setCurrentPage(1), [status]);

  const pageOrders = filteredOrders.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE
  );

  const totalSpent = allOrders.reduce(
    (sum, order) => sum + (order?.total || 0),
    0
  );
  const customerName = allOrders[0]?.user_info?.name;

  return (
    <div className="-mx-2 min-h-full bg-[#f5f5f5] px-2 pb-10 lg:-mx-6 lg:px-6 dark:bg-gray-900">
      <header className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/customers"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#2271b1] hover:underline dark:text-blue-400"
          >
            <FiArrowLeft size={15} />
            {t("CustomersPageBack", { defaultValue: "Clients" })}
          </Link>
          <h1 className="text-2xl font-semibold text-[#1d2327] dark:text-gray-100">
            {t("CustomerOrderList")}
          </h1>
          <p className="mt-1 text-sm text-[#646970] dark:text-gray-400">
            {customerName || t("CustomerOrderSubheading")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:w-auto">
          <SummaryCard label={t("OrderTabAll")} value={allOrders.length} />
          <SummaryCard
            label={t("CustomerOrderTotalSpent")}
            value={`${currency}${getNumberTwo(totalSpent)}`}
          />
        </div>
      </header>

      <AnimatedContent>
        <div className="space-y-4">
          <OrderStatusTabs
            activeStatus={status}
            counts={counts}
            onSelect={setStatus}
          />

          <div className="overflow-hidden rounded-lg border border-[#dcdcde] bg-white dark:border-gray-700 dark:bg-gray-800">
            {loading ? (
              <div className="animate-pulse space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-5 rounded bg-[#f0f0f1] dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-rose-500">
                {error}
              </p>
            ) : pageOrders.length > 0 ? (
              <>
                <CustomerOrderTable
                  orders={pageOrders}
                  canUpdate={hasPermission("orders", "update")}
                  onChangeStatus={changeStatus}
                />
                <OrderPagination
                  currentPage={currentPage}
                  resultsPerPage={RESULTS_PER_PAGE}
                  totalResults={filteredOrders.length}
                  onChange={setCurrentPage}
                />
              </>
            ) : (
              <OrderEmptyState
                title={t("CustomerOrderEmpty")}
                description={t("OrderEmptyDescription")}
              />
            )}
          </div>
        </div>
      </AnimatedContent>
    </div>
  );
};

export default CustomerOrder;
