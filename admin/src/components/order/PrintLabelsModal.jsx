import { Modal, ModalBody } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiPackage,
  FiPrinter,
  FiX,
} from "react-icons/fi";

//internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import { Button } from "@sofia/ui";

// SFG-155 â€” "Print Labels" for the current selection.
//
//   choice â”€ Packing Label â”€â”€â”
//          â”€ Packing Manifestâ”´â”€> generating â”€> ready (print / download)
//                                           \_ error -> retry
//
// Packing Label prints one page per selected order; Packing Manifest prints
// the single recap sheet handed to the carrier.

const DocumentCard = ({ icon, title, description, onClick, disabled }) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-[#dcdcde] bg-white px-4 py-6 text-center transition-colors hover:border-[#2271b1] hover:bg-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#2271b1]/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f6fc] text-[#2271b1] dark:bg-blue-500/10 dark:text-blue-400">
      {icon}
    </span>
    <span className="text-sm font-semibold text-[#1d2327] dark:text-gray-100">
      {title}
    </span>
    <span className="text-xs text-[#646970] dark:text-gray-400">
      {description}
    </span>
  </Button>
);

const PrintLabelsModal = ({
  isOpen,
  orders = [],
  phase = "idle",
  kind,
  errorMessage,
  isPrinted = false,
  onGenerateLabels,
  onGenerateManifest,
  onPrint,
  onDownload,
  onBack,
  onClose,
}) => {
  const { t } = useTranslation();

  const isBusy = phase === "generating";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="px-6 pb-6 pt-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#1d2327] dark:text-gray-100">
            {t("OrderPrintLabelsTitle")}
          </h2>
          <Button
            type="button"
            onClick={onClose}
            aria-label={t("CommonCancel")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#646970] transition-colors hover:bg-[#f6f7f7] hover:text-[#1d2327] focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <FiX size={18} />
          </Button>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-sm text-[#646970] dark:text-gray-400">
            {t("OrderPrintLabelsSelection", { total: orders.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {orders.map((order) => (
              <span
                key={order._id}
                className="rounded-md bg-[#f0f0f1] px-2 py-0.5 text-xs font-medium text-[#1d2327] dark:bg-gray-700 dark:text-gray-200"
              >
                #{order.invoice}
              </span>
            ))}
          </div>
        </div>

        {phase === "ready" ? (
          <div className="rounded-lg border border-[#dcdcde] bg-[#f6f7f7] p-4 dark:border-gray-600 dark:bg-gray-900/40">
            <p className="flex items-center gap-2 text-sm font-medium text-[#1d2327] dark:text-gray-100">
              <FiCheckCircle className="text-emerald-600" size={16} />
              {kind === "manifest"
                ? t("OrderPrintManifestReady")
                : t("OrderPrintLabelsReady", { total: orders.length })}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={onPrint}
                className="flex h-10 items-center gap-2 rounded-md bg-[#2271b1] px-4 text-sm font-medium text-white transition-colors hover:bg-[#135e96] focus:outline-none focus:ring-2 focus:ring-[#2271b1] focus:ring-offset-1 dark:focus:ring-offset-gray-900"
              >
                <FiPrinter size={16} />
                {t("OrderPrintAction")}
              </Button>
              <Button
                type="button"
                onClick={onDownload}
                className="flex h-10 items-center gap-2 rounded-md border border-[#dcdcde] bg-white px-4 text-sm font-medium text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <FiDownload size={16} />
                {t("OrderPrintDownload")}
              </Button>
              <Button
                type="button"
                onClick={onBack}
                className="flex h-10 items-center rounded-md px-3 text-sm font-medium text-[#646970] transition-colors hover:text-[#2271b1] dark:text-gray-400"
              >
                {t("OrderPrintBack")}
              </Button>
            </div>

            {isPrinted && (
              <p className="mt-3 text-xs text-[#646970] dark:text-gray-400">
                {t("OrderPrintMarkedPrinted")}
              </p>
            )}
          </div>
        ) : phase === "error" ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
            <p className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
              <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
              {errorMessage || t("OrderPrintLabelsError")}
            </p>
            <Button
              type="button"
              onClick={onBack}
              className="mt-3 h-9 rounded-md border border-rose-300 px-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300"
            >
              {t("CommonRetry")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <DocumentCard
              icon={
                isBusy && kind === "label" ? (
                  <img src={spinnerLoadingImage} alt="" width={20} height={20} />
                ) : (
                  <FiPackage size={22} />
                )
              }
              title={t("OrderPackingLabel")}
              description={t("OrderPackingLabelHint")}
              onClick={onGenerateLabels}
              disabled={isBusy}
            />
            <DocumentCard
              icon={
                isBusy && kind === "manifest" ? (
                  <img src={spinnerLoadingImage} alt="" width={20} height={20} />
                ) : (
                  <FiFileText size={22} />
                )
              }
              title={t("OrderPackingManifest")}
              description={t("OrderPackingManifestHint")}
              onClick={onGenerateManifest}
              disabled={isBusy}
            />
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default PrintLabelsModal;
