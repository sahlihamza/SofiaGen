import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderRowActions from "@/components/order/OrderRowActions";
import OrderStatusSelect from "@/components/order/OrderStatusSelect";
import { getPaymentMethodLabel } from "@/utils/orderStatus";

const headCell =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400";

// The order history of a single customer: same visual language as the main
// orders table, minus the columns that would only repeat the customer.
const CustomerOrderTable = ({ orders = [], canUpdate = true, onChangeStatus }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo, showDateFormat, showTimeFormat } =
    useUtilsFunction();

  const columns = [
    "OrderColOrder",
    "OrderColDate",
    "OrderColStatus",
    "CustomerShippingAddress",
    "Phone",
    "OrderColPayment",
    "OrderColTotal",
  ];

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
            <tr>
              {columns.map((key) => (
                <th key={key} scope="col" className={headCell}>
                  {t(key)}
                </th>
              ))}
              <th scope="col" className={`${headCell} text-right`}>
                {t("OrderColActions")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#f0f0f1] dark:divide-gray-700">
            {orders.map((order) => (
              <tr
                key={order._id}
                className="transition-colors hover:bg-[#f6f7f7] dark:hover:bg-gray-700/40"
              >
                <td className="px-4 py-3 align-top">
                  <Link
                    to={`/order/${order._id}`}
                    className="font-semibold text-[#2271b1] hover:underline dark:text-blue-400"
                  >
                    #{order?.invoice}
                  </Link>
                </td>

                <td className="whitespace-nowrap px-4 py-3 align-top">
                  <p className="text-[#1d2327] dark:text-gray-200">
                    {showDateFormat(order?.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#646970] dark:text-gray-400">
                    {showTimeFormat(order?.createdAt, "HH:mm")}
                  </p>
                </td>

                <td className="px-4 py-3 align-top">
                  <OrderStatusSelect
                    order={order}
                    canUpdate={canUpdate}
                    onChangeStatus={onChangeStatus}
                  />
                </td>

                <td className="px-4 py-3 align-top text-xs text-[#646970] dark:text-gray-400">
                  {order?.user_info?.address || ""}
                  {(order?.user_info?.zipCode || order?.user_info?.city) && (
                    <p className="mt-0.5">
                      {[order?.user_info?.zipCode, order?.user_info?.city]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}
                </td>

                <td className="whitespace-nowrap px-4 py-3 align-top text-[#646970] dark:text-gray-400">
                  {order?.user_info?.contact || ""}
                </td>

                <td className="px-4 py-3 align-top text-[#1d2327] dark:text-gray-200">
                  {getPaymentMethodLabel(order?.paymentMethod, t)}
                </td>

                <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-[#1d2327] dark:text-gray-200">
                  {currency}
                  {getNumberTwo(order?.total)}
                </td>

                <td className="px-4 py-3 align-top">
                  <OrderRowActions
                    order={order}
                    canDelete={false}
                    onDelete={() => {}}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[#f0f0f1] md:hidden dark:divide-gray-700">
        {orders.map((order) => (
          <li key={order._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/order/${order._id}`}
                  className="font-semibold text-[#2271b1] dark:text-blue-400"
                >
                  #{order?.invoice}
                </Link>
                <p className="mt-0.5 text-xs text-[#646970] dark:text-gray-400">
                  {showDateFormat(order?.createdAt)}
                </p>
                <div className="mt-2">
                  <OrderStatusSelect
                    order={order}
                    canUpdate={canUpdate}
                    onChangeStatus={onChangeStatus}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-[#1d2327] dark:text-gray-200">
                  {currency}
                  {getNumberTwo(order?.total)}
                </p>
                <p className="mt-1 text-xs text-[#646970] dark:text-gray-400">
                  {getPaymentMethodLabel(order?.paymentMethod, t)}
                </p>
                <div className="mt-2 flex justify-end">
                  <OrderRowActions
                    order={order}
                    canDelete={false}
                    onDelete={() => {}}
                    showPrint={false}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export default CustomerOrderTable;
