import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle } from "react-icons/fi";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

//internal import

// Deleting an order is irreversible and the shared DeleteModal is keyed on the
// route it was opened from, so the orders screens confirm with their own.
const OrderConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel,
  isSubmitting = false,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="px-8 pb-4 pt-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-500 dark:bg-rose-500/10">
          <FiAlertTriangle />
        </span>
        <h2 className="mb-2 text-lg font-semibold text-[#1d2327] dark:text-gray-200">
          {title}
        </h2>
        <p className="text-sm text-[#646970] dark:text-gray-400">
          {description}
        </p>
      </ModalBody>

      <ModalFooter className="justify-center gap-3">
        <Button
          type="button"
          onClick={onClose}
          className="h-10 rounded-md border border-[#dcdcde] px-5 text-sm font-medium text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] dark:border-gray-600 dark:text-gray-200"
        >
          {t("modalKeepBtn")}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && (
            <LoadingSpinner alt="" width={18} height={18} />
          )}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OrderConfirmModal;
