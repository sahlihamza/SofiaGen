import { useContext, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactToPrint from "react-to-print";
import { useTranslation } from "react-i18next";
import { WindmillContext } from "@windmill/react-ui";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FiArrowLeft, FiCheck, FiEdit, FiMail, FiPrinter } from "react-icons/fi";
import { IoCloudDownloadOutline } from "react-icons/io5";

//internal import
import useAsync from "@/hooks/useAsync";
import useError from "@/hooks/useError";
import useGetCData from "@/hooks/useGetCData";
import useOrderActions from "@/hooks/useOrderActions";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useDisableForDemo from "@/hooks/useDisableForDemo";
import OrderServices from "@/services/OrderServices";
import { notifySuccess } from "@/utils/toast";
import Invoice from "@/components/invoice/Invoice";
import OrderMenu from "@/components/order/OrderMenu";
import Loading from "@/components/preloader/Loading";
import logoDark from "@/assets/img/logo/logo-dark.svg";
import logoLight from "@/assets/img/logo/logo-color.svg";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import InvoiceForDownload from "@/components/invoice/InvoiceForDownload";
import { LoadingSpinner, Button } from "@/components/ui";
import {
import { Button } from "@sofia/ui";
  ORDER_STATUSES,
  getOrderStatusLabel,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusMeta,
} from "@/utils/orderStatus";


const cardClass =
  "rounded-lg border border-[#dcdcde] bg-white dark:border-gray-700 dark:bg-gray-800";

const buttonBase =
  "flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton = `${buttonBase} border border-[#dcdcde] bg-white text-[#1d2327] hover:border-[#2271b1] hover:text-[#2271b1] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400`;

const primaryButton = `${buttonBase} bg-[#2271b1] text-white hover:bg-[#135e96]`;

const AddressBlock = ({ title, info, emptyLabel }) => {
  const cityLine = [info?.zipCode, info?.city].filter(Boolean).join(" ");
  const isEmpty = !info?.name && !info?.address && !cityLine;

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
        {title}
      </h3>
      {isEmpty ? (
        <p className="text-sm text-[#8c8f94] dark:text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-0.5 text-sm leading-relaxed text-[#646970] dark:text-gray-400">
          {info?.name && (
            <p className="font-medium text-[#1d2327] dark:text-gray-200">
              {info.name}
            </p>
          )}
          {info?.address && <p>{info.address}</p>}
          {cityLine && <p>{cityLine}</p>}
          {info?.country && <p>{info.country}</p>}
          {info?.contact && <p>{info.contact}</p>}
          {info?.email && <p>{info.email}</p>}
        </div>
      )}
    </div>
  );
};

const TotalRow = ({ label, value, strong }) => (
  <div
    className={`flex items-center justify-between gap-6 py-1.5 text-sm ${
      strong
        ? "border-t border-[#dcdcde] pt-3 dark:border-gray-700"
        : ""
    }`}
  >
    <span
      className={
        strong
          ? "font-semibold text-[#1d2327] dark:text-gray-200"
          : "text-[#646970] dark:text-gray-400"
      }
    >
      {label}
    </span>
    <span
      className={
        strong
          ? "text-lg font-bold text-[#1d2327] dark:text-gray-100"
          : "font-medium text-[#1d2327] dark:text-gray-300"
      }
    >
      {value}
    </span>
  </div>
);

const OrderInvoice = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const printRef = useRef();
  const { mode } = useContext(WindmillContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, loading, error } = useAsync(() =>
    OrderServices.getOrderById(id)
  );

  const { hasPermission } = useGetCData();
  const { handleErrorNotification } = useError();
  const { handleDisableForDemo } = useDisableForDemo();
  const { changeStatus } = useOrderActions();
  const { currency, globalSetting, showDateFormat, showTimeFormat, getNumberTwo } =
    useUtilsFunction();

  const canUpdate = hasPermission("orders", "update");
  const billing = data?.billing_info || data?.user_info || {};
  const shipping = data?.user_info || {};
  const paymentStatus = getPaymentStatusMeta(data?.paymentStatus);

  const handleEmailInvoice = async (inv) => {
    if (handleDisableForDemo()) return;

    setIsSubmitting(true);
    try {
      const updatedData = {
        ...inv,
        date: showDateFormat(inv.createdAt),
        company_info: {
          currency: currency,
          vat_number: globalSetting?.vat_number,
          company: globalSetting?.company_name,
          address: globalSetting?.address,
          phone: globalSetting?.contact,
          email: globalSetting?.email,
          website: globalSetting?.website,
          from_email: globalSetting?.from_email,
        },
      };

      const res = await OrderServices.sendEmailInvoiceToCustomer(updatedData);
      notifySuccess(res.message);
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      handleErrorNotification(err, "handleEmailInvoice");
    }
  };

  return (
    <div className="-mx-2 min-h-full bg-[#f5f5f5] px-2 pb-10 lg:-mx-6 lg:px-6 dark:bg-gray-900">
      <header className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {/* Back to the order rather than to the list: the invoice is opened
              from the order screen, and that is where the work continues. */}
          <Link
            to={`/order/${id}`}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#2271b1] hover:underline dark:text-blue-400"
          >
            <FiArrowLeft size={15} />
            {t("OrderColOrder")}
            {data?.invoice ? ` #${data.invoice}` : ""}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#1d2327] dark:text-gray-100">
              {t("OrderColOrder")}
              {data?.invoice ? ` #${data.invoice}` : ""}
            </h1>
            {!loading && <OrderStatusBadge status={data?.status} />}
          </div>
          {!loading && (
            <p className="mt-1 text-sm text-[#646970] dark:text-gray-400">
              {showDateFormat(data?.createdAt)} Â·{" "}

              {showTimeFormat(data?.createdAt, "HH:mm")}
            </p>
          )}
        </div>

        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && (
              <OrderMenu
                renderTrigger={({ ref, onClick, isOpen }) => (
                  <Button
                    ref={ref}
                    type="button"
                    onClick={onClick}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FiEdit size={15} />
                    {t("OrderActionChangeStatus")}
                  </Button>
                )}
                align="left"
                items={ORDER_STATUSES.map((status) => ({
                  key: status,
                  label: getOrderStatusLabel(status, t),
                  disabled: data?.status === status,
                  icon: (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        getOrderStatusMeta(status).dot
                      }`}
                    />
                  ),
                  trailing:
                    data?.status === status ? (
                      <FiCheck size={14} className="text-[#2271b1]" />
                    ) : null,
                  onClick: () => changeStatus(data._id, status),
                }))}
              />
            )}

            {globalSetting?.email_to_customer && (
              <Button
                type="button"
                onClick={() => handleEmailInvoice(data)}
                disabled={isSubmitting}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <LoadingSpinner alt="" width={18} height={18} />
                ) : (
                  <FiMail size={15} />
                )}
                {t("EmailInvoice", { defaultValue: "Envoyer la facture" })}
              </Button>
            )}

            <PDFDownloadLink
              document={
                <InvoiceForDownload
                  t={t}
                  data={data}
                  currency={currency}
                  getNumberTwo={getNumberTwo}
                  showDateFormat={showDateFormat}
                />
              }
              fileName={`facture-${data?.invoice}`}
            >
              {({ loading: pdfLoading }) => (
                <span className={secondaryButton}>
                  <IoCloudDownloadOutline size={16} />
                  {pdfLoading
                    ? t("Processing")
                    : t("DownloadInvoice", { defaultValue: "TÃ©lÃ©charger" })}
                </span>
              )}
            </PDFDownloadLink>

            <ReactToPrint
              trigger={() => (
                <Button type="button" variant="primary" className="flex items-center gap-2">
                  <FiPrinter size={15} />
                  {t("PrintInvoice")}
                </Button>
              )}
              content={() => printRef.current}
              documentTitle={`${data?.invoice}`}
            />
          </div>
        )}

      </header>

      {loading ? (
        <div className={`${cardClass} p-8`}>
          <Loading loading={loading} />
        </div>
      ) : error ? (
        <div className={`${cardClass} p-10 text-center text-sm text-rose-500`}>
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div ref={printRef} className={`${cardClass} p-6 lg:p-8`}>
            <div className="flex flex-col justify-between gap-6 border-b border-[#dcdcde] pb-6 md:flex-row dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide text-[#1d2327] dark:text-gray-100">
                  {t("InvoicePageTittle")}
                </h2>
                <p className="mt-1 text-sm text-[#646970] dark:text-gray-400">
                  {t("InvoiceNo")} : #{data?.invoice}
                </p>
                <p className="text-sm text-[#646970] dark:text-gray-400">
                  {t("InvoiceDate")} : {showDateFormat(data?.createdAt)}
                </p>
              </div>

              <div className="md:text-right">
                <img
                  src={mode === "dark" ? logoDark : logoLight}
                  alt="logo"
                  width="110"
                  className="md:ml-auto"
                />
                <p className="mt-2 text-sm leading-relaxed text-[#646970] dark:text-gray-400">
                  {globalSetting?.address} <br />
                  {globalSetting?.contact} <br />
                  {globalSetting?.email} <br />
                  {globalSetting?.website}
                </p>
              </div>
            </div>

            <div className="grid gap-6 border-b border-[#dcdcde] py-6 sm:grid-cols-2 lg:grid-cols-3 dark:border-gray-700">
              <AddressBlock
                title={t("OrderColBilling")}
                info={billing}
                emptyLabel={t("OrderNoAddress")}
              />
              <AddressBlock
                title={t("CustomerShippingAddress")}
                info={shipping}
                emptyLabel={t("OrderNoAddress")}
              />
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                  {t("OrderColPayment")}
                </h3>
                <p className="text-sm font-medium text-[#1d2327] dark:text-gray-200">
                  {getPaymentMethodLabel(data?.paymentMethod, t)}
                </p>
                {data?.paymentStatus && (
                  <p className={`mt-0.5 text-sm font-medium ${paymentStatus.className}`}>
                    {getPaymentStatusLabel(data.paymentStatus, t)}
                  </p>
                )}
                {data?.shippingMethod?.title && (
                  <p className="mt-3 text-sm text-[#646970] dark:text-gray-400">
                    {data.shippingMethod.title}
                  </p>
                )}
              </div>
            </div>
            <div className="overflow-x-auto py-6">
              <table className="w-full min-w-[620px] border-collapse">
                <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                      {t("Sr")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                      {t("ProductTitle", { defaultValue: "Produit" })}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                      {t("Quantity")}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                      {t("ItemPrice")}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                      {t("Amount")}
                    </th>
                  </tr>
                </thead>
                <Invoice
                  data={data}
                  currency={currency}
                  getNumberTwo={getNumberTwo}
                />
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs rounded-lg bg-[#f6f7f7] p-4 dark:bg-gray-900/40">
                <TotalRow
                  label={t("InvoiceSubTotal", { defaultValue: "Sous-total" })}
                  value={`${currency}${getNumberTwo(data?.subTotal)}`}
                />
                <TotalRow
                  label={t("InvoiceDicount")}
                  value={`âˆ’ ${currency}${getNumberTwo(data?.discount)}`}

                />
                <TotalRow
                  label={t("ShippingCost")}
                  value={`${currency}${getNumberTwo(data?.shippingCost)}`}
                />
                {data?.tax > 0 && (
                  <TotalRow
                    label={t("Tax", { defaultValue: "TVA" })}
                    value={`${currency}${getNumberTwo(data?.tax)}`}
                  />
                )}
                <TotalRow
                  strong
                  label={t("InvoiceTotalAmount")}
                  value={`${currency}${getNumberTwo(data?.total)}`}
                />
              </div>
            </div>

            {data?.notes && (
              <div className="mt-6 rounded-md border border-[#dcdcde] bg-[#f6f7f7] p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
                  {t("OrderNotes", { defaultValue: "Note du client" })}
                </h3>
                <p className="text-sm text-[#1d2327] dark:text-gray-300">
                  {data.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderInvoice;
