import React from "react";
import Modal from "./CModal";
import PrimaryButton from "../ui/CPrimaryButton";
import SecondaryButton from "../ui/CSecondaryButton";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm action",
  description = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmButtonProps = {},
  cancelButtonProps = {},
  danger = false,
  loading = false,
  size = "sm",
  children,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      contentClassName="space-y-4"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton onClick={onClose} disabled={loading} {...cancelButtonProps}>
            {cancelLabel}
          </SecondaryButton>
          <PrimaryButton
            onClick={onConfirm}
            loading={loading}
            variant={danger ? "danger" : "primary"}
            {...confirmButtonProps}
          >
            {confirmLabel}
          </PrimaryButton>
        </div>
      }
    >
      <div className="text-sm text-gray-600 dark:text-gray-300">
        {description}
      </div>
      {children}
    </Modal>
  );
};

export default ConfirmModal;
