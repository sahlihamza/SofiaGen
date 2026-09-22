import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiExternalLink, FiX } from "react-icons/fi";

//internal import
import OrderServices from "@/services/OrderServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import {
import { Button } from "@sofia/ui";
  ORDER_STATUSES,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from "@/utils/orderStatus";
import { Button } from "@sofia/ui";

const fieldClass =
  "h-10 w-full rounded-md border border-[#dcdcde] bg-white px-3 text-sm text-[#1d2327] transition-colors focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1] disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

const sectionTitle =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400";

const AddressBlock = ({ title, info, emptyLabel }) => {
  const cityLine = [info?.zipCode, info?.city].filter(Boolean).join(" ");
  const hasAnything =
    info?.name || info?.address || cityLine || info?.country || info?.contact;

  return (
    <div>
      <h4 className={sectionTitle}>{title}</h4>
      {!hasAnything ? (
        <p className="text-sm text-[#8c8f94] dark:text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-0.5 text-sm leading-relaxed text-[#646970] dark:text-gray-400">
          {info?.name && (
            <p className="font-medium text-[#1d2327] dark:text-gray-200">
              {info.name}
            </p>
          )}
          {info?.company && <p>{info.company}</p>}
          {info?.address && <p>{info.address}</p>}
          {cityLine && <p>{cityLine}</p>}
          {info?.state && <p>{info.state}</p>}
          {info?.country && <p>{info.country}</p>}
          {info?.contact && <p>{info.contact}</p>}
          {info?.email && <p className="break-all">{info.email}</p>}
        </div>
      )}
    </div>
  );
};

const Field = ({ title, children }) => (
  <div>
    <h4 className={sectionTitle}>{title}</h4>
    <p className="text-sm text-[#1d2327] dark:text-gray-300">{children}</p>
  </div>
);

/**
 * The order preview: what the eye in the date column opens.
 *
 * The list only carries what its columns show, so the lines and the shipping
 * method are fetched on open â€” the row that was clicked seeds the rest, which
 * is why the modal has something to display before the request lands.
 *
 * Rendered through a portal: the orders page animates its content with a
 * `transform`, and that would otherwise anchor a fixed overlay to the table
 * instead of the viewport.
 */
const OrderPreviewModal = ({
  order,
  canUpdate = true,
  isSubmitting = false,
  onChangeStatus,
  onClose,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currency, getNumberTwo, showDateFormat, showTimeFormat } =
    useUtilsFunction();

  const orderId = order?._id;
  const [status, setStatus] = useState(order?.status || "");

  const { data: fetched, isLoading } = useQuery({
    queryKey: ["orderPreview", orderId],
    queryFn: () => OrderServices.getOrderById(orderId),
    enabled: Boolean(orderId),
    staleTime: 30 * 1000,
  });

  // The row is the fresh copy â€” the list refetches after a status change â€” so
  // it wins over the cached detail for everything it knows about.
  const data = { ...(fetched || {}), ...(order || {}) };
  const items = fetched?.items || [];
  const shippingMethod = fetched?.shippingMethod?.title || fetched?.shippingOption;

  useEffect(() => setStatus(order?.status || ""), [order?.status]);

  useEffect(() => {
    const onEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  // The page behind must not scroll while the preview is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const handleUpdateStatus = async () => {
    const ok = await onChangeStatus(orderId, status);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ["orderPreview", orderId] });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${t("OrderPreviewTitle")} #${data?.invoice || ""}`}
        className="my-auto w-full max-w-3xl overflow-hidden rounded-lg border border-[#dcdcde] bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#dcdcde] px-5 py-4 dark:border-gray-700">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-[#1d2327] dark:text-gray-100">
                {t("OrderColOrder")} #{data?.invoice}
              </h2>
              <OrderStatusBadge status={data?.status} />
            </div>
            <p className="mt-0.5 text-sm text-[#646970] dark:text-gray-400">
              {data?.orderNumber && `${data.orderNumber} Â· `}
              {showDateFormat(data?.createdAt)} Â·{" "}
              {showTimeFormat(data?.createdAt, "HH:mm")}
            </p>
          </div>

          <Button
            type="button"
            onClick={onClose}
            aria-label={t("OrderPreviewClose")}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#646970] transition-colors hover:bg-[#f0f0f1] hover:text-[#1d2327] dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <FiX size={18} />
          </Button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto">
          <div className="grid gap-6 border-b border-[#f0f0f1] p-5 sm:grid-cols-2 dark:border-gray-700">
            <AddressBlock
              title={t("OrderPreviewBillingDetails")}
              info={data?.billing_info || data?.user_info}
              emptyLabel={t("OrderNoAddress")}
            />
            <AddressBlock
              title={t("OrderPreviewShippingDetails")}
              info={data?.user_info}
              emptyLabel={t("OrderNoAddress")}
            />
            <Field title={t("OrderDetailsPaymentMethod")}>
              {getPaymentMethodLabel(data?.paymentMethod, t)}
            </Field>
            <Field title={t("OrderPreviewShippingMethod")}>
              {shippingMethod || (
                <span className="text-[#8c8f94] dark:text-gray-500">
                  {isLoading ? "â€¦" : t("OrderPreviewNoShippingMethod")}
                </span>
              )}
            </Field>
          </div>

          <div className="p-5">
            <h4 className={sectionTitle}>{t("OrderPreviewItems")}</h4>

            {isLoading && items.length === 0 ? (
              <div className="animate-pulse space-y-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 rounded bg-[#f0f0f1] dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-4 text-sm text-[#8c8f94] dark:text-gray-500">
                {t("OrderDetailsNoLines")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-[#dcdcde] dark:border-gray-700">
                <table className="w-full min-w-[460px] border-collapse text-sm">
                  <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                        {t("OrderDetailsColProduct")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                        {t("OrderDetailsColSku")}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                        {t("OrderDetailsColQuantity")}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                        {t("OrderDetailsColTotal")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1] dark:divide-gray-700">
                    {items.map((item, i) => (
                      <tr key={item._id || i}>
                        <td className="px-4 py-2.5 text-[#1d2327] dark:text-gray-200">
                          {item.productName}
                        </td>
                        <td className="px-4 py-2.5 text-[#646970] dark:text-gray-400">
                          {item.sku || "â€”"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#1d2327] dark:text-gray-300">
                          Ã— {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-[#1d2327] dark:text-gray-200">
                          {currency}
                          {getNumberTwo(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-2.5 text-right font-semibold text-[#1d2327] dark:text-gray-200"
                      >
                        {t("OrderDetailsTotal")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-[#1d2327] dark:text-gray-100">
                        {currency}
                        {getNumberTwo(data?.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {fetched?.notes && (
              <div className="mt-4 rounded-md border border-[#dcdcde] bg-[#f6f7f7] p-3 dark:border-gray-700 dark:bg-gray-900/40">
                <h4 className={sectionTitle}>{t("OrderCustomerNoteTitle")}</h4>
                <p className="text-sm text-[#1d2327] dark:text-gray-300">
                  {fetched.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#dcdcde] bg-[#f6f7f7] px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-gray-700 dark:bg-gray-900/40">
          {canUpdate ? (
            <div className="flex w-full items-end gap-2 sm:max-w-sm">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="order-preview-status"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400"
                >
                  {t("OrderStatusLabel")}
                </label>
                <select
                  id="order-preview-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isSubmitting}
                  className={`${fieldClass} cursor-pointer`}
                >
                  {data?.status && !ORDER_STATUSES.includes(data.status) && (
                    <option value={data.status}>
                      {getOrderStatusLabel(data.status, t)}
                    </option>
                  )}
                  {ORDER_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {getOrderStatusLabel(value, t)}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSubmitting || status === data?.status}
                className="flex h-10 shrink-0 items-center justify-center rounded-md bg-[#2271b1] px-4 text-sm font-medium text-white transition-colors hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("OrderStatusUpdate")}
              </Button>
            </div>
          ) : (
            <span />
          )}

          <Link
            to={`/order/${orderId}`}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#dcdcde] bg-white px-4 text-sm font-medium text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
          >
            <FiExternalLink size={15} />
            {t("OrderActionView")}
          </Link>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default OrderPreviewModal;
