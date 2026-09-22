import { useTranslation } from "react-i18next";
import { FiCheck, FiChevronDown } from "react-icons/fi";

//internal import
import OrderMenu from "@/components/order/OrderMenu";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import {
import { Button } from "@sofia/ui";
  ORDER_STATUSES,
  getOrderStatusLabel,
  getOrderStatusMeta,
} from "@/utils/orderStatus";
import { Button } from "@sofia/ui";

// The "Ã‰tat" cell doubles as the status editor: the badge is the trigger, so
// changing where an order stands is done where it is read, not buried in the
// row's action menu.
const OrderStatusSelect = ({ order, canUpdate = true, onChangeStatus }) => {
  const { t } = useTranslation();

  if (!canUpdate) return <OrderStatusBadge status={order?.status} />;

  return (
    <OrderMenu
      align="left"
      width={200}
      renderTrigger={({ ref, onClick, isOpen }) => (
        <Button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title={t("OrderActionChangeStatus")}
          className={`inline-flex items-center gap-1 rounded-full pr-1 transition-colors focus:outline-none ${
            isOpen
              ? "ring-2 ring-[#2271b1]/40"
              : "hover:ring-2 hover:ring-[#dcdcde] dark:hover:ring-gray-600"
          }`}
        >
          <OrderStatusBadge status={order?.status} />
          <FiChevronDown
            size={14}
            className="shrink-0 text-[#646970] dark:text-gray-400"
          />
        </Button>
      )}
      items={[
        {
          key: "title",
          type: "title",
          label: t("OrderActionChangeStatus"),
        },
        ...ORDER_STATUSES.map((status) => {
          const isCurrent = order?.status === status;

          return {
            key: status,
            label: getOrderStatusLabel(status, t),
            disabled: isCurrent,
            icon: (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  getOrderStatusMeta(status).dot
                }`}
              />
            ),
            trailing: isCurrent ? (
              <FiCheck size={14} className="text-[#2271b1]" />
            ) : null,
            onClick: () => onChangeStatus(order._id, status),
          };
        }),
      ]}
    />
  );
};

export default OrderStatusSelect;
