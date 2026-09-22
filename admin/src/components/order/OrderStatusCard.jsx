import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheckCircle, FiTruck } from "react-icons/fi";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import OrderCard, {
  OrderCardSection,
  fieldClass,
  labelClass,
  primaryButton,
  tableHeadCell,
} from "@/components/order/OrderCard";
import { ORDER_STATUSES, getOrderStatusLabel } from "@/utils/orderStatus";
import { Button } from "@sofia/ui";

/**
 * "Ã‰tat de la commande" â€” where the order stands, and how it got there.
 *
 * The timeline is written by the API on every transition (order_status_history)
 * and is never edited from here: it is an audit trail, so the only way to add a
 * row is to actually move the order.
 */
const OrderStatusCard = ({
  order,
  canUpdate = true,
  isSaving = false,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const { showDateFormat, showTimeFormat } = useUtilsFunction();

  const [status, setStatus] = useState(order?.status || "");
  const [comment, setComment] = useState("");

  const history = order?.statusHistory || [];
  const isUnchanged = status === order?.status;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onUpdate({ status, comment: comment.trim() });
    if (ok) setComment("");
  };

  return (
    <OrderCard
      icon={<FiTruck size={18} />}
      title={t("OrderStatusCardTitle")}
      description={t("OrderStatusCardDescription")}
      aside={<OrderStatusBadge status={order?.status} />}
    >
      {canUpdate && (
        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr]">
            <div>
              <label className={labelClass} htmlFor="order-status">
                {t("OrderStatusLabel")}
              </label>
              <select
                id="order-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSaving}
                className={`${fieldClass} cursor-pointer`}
              >
                {/* A status outside the current lifecycle (an order written by
                    the point-of-sale, say) stays selectable so opening this
                    card never rewrites it by accident. */}
                {order?.status && !ORDER_STATUSES.includes(order.status) && (
                  <option value={order.status}>
                    {getOrderStatusLabel(order.status, t)}
                  </option>
                )}
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {getOrderStatusLabel(value, t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="order-status-comment">
                {t("OrderStatusComment")}
              </label>
              <input
                id="order-status-comment"
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("OrderStatusCommentPlaceholder")}
                disabled={isSaving}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {isUnchanged && (
              <p className="text-sm text-[#8c8f94] dark:text-gray-500">
                {t("OrderStatusUnchanged")}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSaving || isUnchanged}
              className={primaryButton}
            >
              <FiCheckCircle size={15} />
              {t("OrderStatusUpdate")}
            </Button>
          </div>
        </form>
      )}

      <OrderCardSection title={t("OrderStatusHistoryTitle")}>
        {history.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#dcdcde] px-4 py-8 text-center text-sm text-[#8c8f94] dark:border-gray-600 dark:text-gray-500">
            {t("OrderStatusHistoryEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#dcdcde] dark:border-gray-700">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
                <tr>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderStatusHistoryColStatus")}
                  </th>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderStatusHistoryColDate")}
                  </th>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderStatusHistoryColBy")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1] dark:divide-gray-700">
                {/* Newest first: what happened last is what someone opening the
                    order is looking for. */}
                {[...history].reverse().map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-4 py-3 align-top">
                      <OrderStatusBadge status={entry.status} />
                      {entry.comment && (
                        <p className="mt-1.5 text-xs text-[#646970] dark:text-gray-400">
                          {entry.comment}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-[#1d2327] dark:text-gray-300">
                      {showDateFormat(entry.createdAt)}
                      <span className="ml-1.5 text-xs text-[#646970] dark:text-gray-400">
                        {showTimeFormat(entry.createdAt, "HH:mm")}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-[#646970] dark:text-gray-400">
                      {entry.changedBy?.name || (
                        <span className="italic">
                          {t("OrderStatusHistorySystem")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OrderCardSection>
    </OrderCard>
  );
};

export default OrderStatusCard;
