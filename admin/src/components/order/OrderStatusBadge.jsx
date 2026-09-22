import { useTranslation } from "react-i18next";

//internal import
import { getOrderStatusLabel, getOrderStatusMeta } from "@/utils/orderStatus";

const OrderStatusBadge = ({ status, className = "" }) => {
  const { t } = useTranslation();
  const meta = getOrderStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none ${meta.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {getOrderStatusLabel(status, t)}
    </span>
  );
};

export default OrderStatusBadge;
