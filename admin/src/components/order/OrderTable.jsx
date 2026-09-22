import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiChevronDown, FiChevronUp, FiEye, FiInfo } from "react-icons/fi";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderRowActions from "@/components/order/OrderRowActions";
import OrderStatusSelect from "@/components/order/OrderStatusSelect";
import {
import { Button } from "@sofia/ui";
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusMeta,
} from "@/utils/orderStatus";
import { Button } from "@sofia/ui";

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-[#8c8f94] accent-[#2271b1] dark:border-gray-600";

const headCell =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400";

// Header of a sortable column: the arrow shows the direction that is applied,
// and stays faint until hovered on the columns that are not sorted.
const SortableHead = ({ label, sortKey, sortBy, sortOrder, onSort, hint }) => {
  const isActive = sortBy === sortKey;
  const Icon = isActive && sortOrder === "asc" ? FiChevronUp : FiChevronDown;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={label}
        className={`group inline-flex items-center gap-1 uppercase transition-colors hover:text-[#2271b1] focus:outline-none dark:hover:text-blue-400 ${
          isActive ? "text-[#2271b1] dark:text-blue-400" : ""
        }`}
      >
        {label}
        <Icon
          size={14}
          className={
            isActive ? "" : "opacity-0 transition-opacity group-hover:opacity-50"
          }
        />
      </Button>
      {hint && (
        <FiInfo
          size={13}
          title={hint}
          aria-label={hint}
          className="shrink-0 cursor-help text-[#8c8f94]"
        />
      )}
    </span>
  );
};

// Renders nothing when the screen that mounted the table has no preview to
// open â€” the dashboard reuses this component and only wants the read-only grid.
const PreviewButton = ({ order, onPreview, className = "" }) => {
  const { t } = useTranslation();

  if (!onPreview) return null;

  return (
    <Button
      type="button"
      onClick={() => onPreview(order)}
      title={t("OrderActionPreview")}
      aria-label={`${t("OrderActionPreview")} #${order?.invoice}`}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#646970] transition-colors hover:bg-[#f0f6fc] hover:text-[#2271b1] focus:outline-none focus:ring-2 focus:ring-[#2271b1]/40 dark:text-gray-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 ${className}`}
    >
      <FiEye size={16} />
    </Button>
  );
};

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

// Orders keep their own copy of the addresses at checkout time. `billing_info`
// only exists on orders placed after billing addresses were split out, so the
// shipping copy is the fallback for everything older.
const billingOf = (order) => order?.billing_info || order?.user_info || {};

const AddressBlock = ({ info, emptyLabel }) => {
  const cityLine = [info?.zipCode, info?.city].filter(Boolean).join(" ");
  const hasAddress = info?.address || cityLine || info?.country;

  if (!info?.name && !hasAddress) {
    return <span className="text-[#8c8f94] dark:text-gray-500">{emptyLabel}</span>;
  }

  return (
    <div className="space-y-0.5 leading-snug">
      {info?.name && (
        <p className="font-medium text-[#1d2327] dark:text-gray-200">
          {info.name}
        </p>
      )}
      {info?.address && (
        <p className="text-[#646970] dark:text-gray-400">{info.address}</p>
      )}
      {cityLine && (
        <p className="text-[#646970] dark:text-gray-400">{cityLine}</p>
      )}
      {info?.country && (
        <p className="text-[#646970] dark:text-gray-400">{info.country}</p>
      )}
    </div>
  );
};

const OrderTable = ({
  orders = [],
  isCheck = [],
  setIsCheck,
  isCheckAll = false,
  onSelectAll,
  canUpdate = true,
  canDelete = true,
  canPrintLabel = false,
  onChangeStatus,
  onDelete,
  onPrintLabel,
  onPreview,
  columns = {},
  sortBy = "",
  sortOrder = "desc",
  onSort,
}) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo, showDateFormat, showTimeFormat } =
    useUtilsFunction();

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  // The screen options panel toggles these by `key`, so header and cells can
  // never disagree about what is on screen.
  const columnDefs = [
    {
      key: "order",
      labelKey: "OrderColOrder",
      sortKey: "invoice",
      width: 130,
      cell: (order) => (
        <>
          <Link
            to={`/order/${order._id}`}
            className="font-semibold text-[#2271b1] hover:underline dark:text-blue-400"
          >
            #{order?.invoice}
          </Link>
          {order?.orderNumber && (
            <p className="mt-0.5 text-xs text-[#8c8f94] dark:text-gray-500">
              {order.orderNumber}
            </p>
          )}
        </>
      ),
    },
    {
      key: "customer",
      labelKey: "OrderColCustomer",
      width: 220,
      // The name opens the same order screen as the invoice number: it is the
      // widest target in the row, and the one people reach for first.
      cell: (order) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f1] text-xs font-semibold text-[#646970] dark:bg-gray-700 dark:text-gray-300">
            {initialsOf(order?.user_info?.name)}
          </span>
          <div className="min-w-0 leading-snug">
            <Link
              to={`/order/${order._id}`}
              title={t("OrderActionView")}
              className="block truncate font-medium text-[#2271b1] hover:underline dark:text-blue-400"
            >
              {order?.user_info?.name || "â€”"}
            </Link>
            {order?.user_info?.email && (
              <p className="truncate text-xs text-[#646970] dark:text-gray-400">
                {order.user_info.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      labelKey: "OrderColDate",
      sortKey: "date",
      width: 170,
      className: "whitespace-nowrap",
      // The eye sits beside the date, the way the WooCommerce order list puts
      // it: one click to read an order without leaving the list.
      cell: (order) => (
        <div className="flex items-start gap-2">
          <div>
            <p className="text-[#1d2327] dark:text-gray-200">
              {showDateFormat(order?.createdAt)}
            </p>
            <p className="mt-0.5 text-xs text-[#646970] dark:text-gray-400">
              {showTimeFormat(order?.createdAt, "HH:mm")}
            </p>
          </div>
          <PreviewButton order={order} onPreview={onPreview} />
        </div>
      ),
    },
    {
      key: "status",
      labelKey: "OrderColStatus",
      width: 150,
      cell: (order) => (
        <OrderStatusSelect
          order={order}
          canUpdate={canUpdate}
          onChangeStatus={onChangeStatus}
        />
      ),
    },
    {
      key: "billing",
      labelKey: "OrderColBilling",
      width: 200,
      className: "text-xs",
      cell: (order) => (
        <AddressBlock info={billingOf(order)} emptyLabel={t("OrderNoAddress")} />
      ),
    },
    {
      key: "shipping",
      labelKey: "OrderColShipTo",
      width: 200,
      className: "text-xs",
      cell: (order) => (
        <AddressBlock
          info={order?.user_info || {}}
          emptyLabel={t("OrderNoAddress")}
        />
      ),
    },
    {
      key: "payment",
      labelKey: "OrderColPayment",
      width: 170,
      cell: (order) => (
        <>
          <p className="text-[#1d2327] dark:text-gray-200">
            {getPaymentMethodLabel(order?.paymentMethod, t)}
          </p>
          {order?.paymentStatus && (
            <p
              className={`mt-0.5 text-xs font-medium ${
                getPaymentStatusMeta(order.paymentStatus).className
              }`}
            >
              {getPaymentStatusLabel(order.paymentStatus, t)}
            </p>
          )}
        </>
      ),
    },
    {
      key: "total",
      labelKey: "OrderColTotal",
      sortKey: "total",
      hintKey: "OrderTotalRefundNote",
      width: 130,
      className:
        "whitespace-nowrap font-semibold text-[#1d2327] dark:text-gray-200",
      cell: (order) => (
        <>
          {currency}
          {getNumberTwo(order?.total)}
        </>
      ),
    },
  ];

  const visibleColumns = columnDefs.filter(({ key }) => columns[key] !== false);
  const showActions = columns.actions !== false;

  // The selection box and the actions cell are narrow; the rest carry the
  // width the table needs before it starts scrolling.
  const minWidth =
    56 +
    visibleColumns.reduce((total, col) => total + col.width, 0) +
    (showActions ? 90 : 0);

  return (
    <>
      {/* Desktop / tablet: the full grid, horizontally scrollable rather than
          squeezed, so no column ever collapses into an unreadable stack. */}
      <div className="hidden overflow-x-auto md:block">
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
            <tr>
              <th scope="col" className={`${headCell} w-10 pr-0`}>
                <input
                  type="checkbox"
                  id="selectAllOrders"
                  name="selectAllOrders"
                  checked={isCheckAll}
                  onChange={onSelectAll}
                  aria-label={t("OrderSelectAll")}
                  className={checkboxClass}
                />
              </th>

              {visibleColumns.map(({ key, labelKey, sortKey, hintKey }) => (
                <th
                  key={key}
                  scope="col"
                  className={headCell}
                  aria-sort={
                    sortKey && sortBy === sortKey
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {sortKey ? (
                    <SortableHead
                      label={t(labelKey)}
                      sortKey={sortKey}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={onSort}
                      hint={hintKey ? t(hintKey) : undefined}
                    />
                  ) : (
                    t(labelKey)
                  )}
                </th>
              ))}

              {showActions && (
                <th scope="col" className={`${headCell} text-right`}>
                  {t("OrderColActions")}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#f0f0f1] dark:divide-gray-700">
            {orders.map((order) => (
              <tr
                key={order._id}
                className={`transition-colors hover:bg-[#f6f7f7] dark:hover:bg-gray-700/40 ${
                  isCheck.includes(order._id)
                    ? "bg-[#f0f6fc] dark:bg-blue-500/5"
                    : ""
                }`}
              >
                <td className="px-4 py-3 pr-0 align-top">
                  <input
                    type="checkbox"
                    id={order._id}
                    name={order.invoice}
                    checked={isCheck.includes(order._id)}
                    onChange={handleClick}
                    aria-label={`${t("OrderColOrder")} #${order.invoice}`}
                    className={checkboxClass}
                  />
                </td>

                {visibleColumns.map(({ key, className = "", cell }) => (
                  <td key={key} className={`px-4 py-3 align-top ${className}`}>
                    {cell(order)}
                  </td>
                ))}

                {showActions && (
                  <td className="px-4 py-3 align-top">
                    <OrderRowActions
                      order={order}
                      canDelete={canDelete}
                      onDelete={onDelete}
                      canPrintLabel={canPrintLabel}
                      onPrintLabel={onPrintLabel}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per order â€” a nine column table behind a scrollbar is
          unusable on a phone. The same column preferences apply. */}
      <ul className="divide-y divide-[#f0f0f1] md:hidden dark:divide-gray-700">
        {orders.map((order) => (
          <li key={order._id} className="p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id={`m-${order._id}`}
                name={order.invoice}
                checked={isCheck.includes(order._id)}
                onChange={(e) =>
                  handleClick({
                    target: { id: order._id, checked: e.target.checked },
                  })
                }
                aria-label={`${t("OrderColOrder")} #${order.invoice}`}
                className={`${checkboxClass} mt-1`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {columns.order !== false && (
                      <Link
                        to={`/order/${order._id}`}
                        className="font-semibold text-[#2271b1] dark:text-blue-400"
                      >
                        #{order?.invoice}
                      </Link>
                    )}
                    {columns.customer !== false && (
                      <Link
                        to={`/order/${order._id}`}
                        className="block truncate text-sm text-[#2271b1] dark:text-blue-400"
                      >
                        {order?.user_info?.name || "â€”"}
                      </Link>
                    )}
                    {columns.date !== false && (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="text-xs text-[#646970] dark:text-gray-400">
                          {showDateFormat(order?.createdAt)}
                        </p>
                        <PreviewButton
                          order={order}
                          onPreview={onPreview}
                          className="h-6 w-6"
                        />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {columns.total !== false && (
                      <p className="font-semibold text-[#1d2327] dark:text-gray-200">
                        {currency}
                        {getNumberTwo(order?.total)}
                      </p>
                    )}
                    {columns.payment !== false && (
                      <p className="mt-1 text-xs text-[#646970] dark:text-gray-400">
                        {getPaymentMethodLabel(order?.paymentMethod, t)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {columns.status !== false ? (
                    <OrderStatusSelect
                      order={order}
                      canUpdate={canUpdate}
                      onChangeStatus={onChangeStatus}
                    />
                  ) : (
                    <span />
                  )}
                  {showActions && (
                    <OrderRowActions
                      order={order}
                      canDelete={canDelete}
                      onDelete={onDelete}
                      showPrint={false}
                      canPrintLabel={canPrintLabel}
                      onPrintLabel={onPrintLabel}
                    />
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export default OrderTable;
