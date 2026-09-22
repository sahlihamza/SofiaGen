import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import {
  FiEye,
  FiMoreHorizontal,
  FiPackage,
  FiPrinter,
  FiTrash2,
} from "react-icons/fi";

//internal import
import OrderMenu from "@/components/order/OrderMenu";
import usePrintReceipt from "@/hooks/usePrintReceipt";
import InvoiceForPrint from "@/components/invoice/InvoiceForPrint";
import { Button } from "@sofia/ui";

// One "â€¦" per row for view, print and delete. Changing the status lives in the
// "Ã‰tat" column instead â€” see OrderStatusSelect.
const OrderRowActions = ({
  order,
  canDelete = true,
  onDelete,
  showPrint = true,
  // SFG-155: the shipping label of this one order, same document the bulk
  // "Print Labels" action produces for a whole selection.
  canPrintLabel = false,
  onPrintLabel,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { printRef, orderData, globalSetting, printReceipt } =
    usePrintReceipt();

  return (
    <div className="flex justify-end">
      <div style={{ display: "none" }}>
        {Object.keys(orderData).length > 0 && (
          <InvoiceForPrint
            data={orderData}
            printRef={printRef}
            globalSetting={globalSetting}
          />
        )}
      </div>

      <OrderMenu
        renderTrigger={({ ref, onClick, isOpen }) => (
          <Button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            title={t("Actions")}
            aria-label={t("Actions")}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus:outline-none ${
              isOpen
                ? "border-[#dcdcde] bg-[#f6f7f7] text-[#2271b1] dark:border-gray-600 dark:bg-gray-700 dark:text-blue-400"
                : "border-transparent text-[#646970] hover:border-[#dcdcde] hover:bg-[#f6f7f7] hover:text-[#2271b1] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
            }`}
          >
            <FiMoreHorizontal size={18} />
          </Button>
        )}
        items={[
          {
            key: "view",
            label: t("OrderActionView"),
            icon: <FiEye size={15} />,
            onClick: () => history.push(`/order/${order._id}`),
          },
          showPrint && {
            key: "print",
            label: t("OrderActionPrintReceipt"),
            icon: <FiPrinter size={15} />,
            onClick: () => printReceipt(order._id),
          },
          canPrintLabel &&
            onPrintLabel && {
              key: "print-label",
              label: t("OrderActionPrintLabel"),
              icon: <FiPackage size={15} />,
              onClick: () => onPrintLabel(order),
            },
          canDelete && { key: "delete-sep", type: "separator" },
          canDelete && {
            key: "delete",
            label: t("OrderActionDelete"),
            icon: <FiTrash2 size={15} />,
            danger: true,
            onClick: () => onDelete(order),
          },
        ]}
      />
    </div>
  );
};

export default OrderRowActions;
