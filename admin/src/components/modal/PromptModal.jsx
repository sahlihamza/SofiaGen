import React from "react";
import { Modal, ModalBody, ModalFooter, Input } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { Button } from "@sofia/ui";

const PromptModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder,
  defaultValue,
  confirmLabel,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = React.useState(defaultValue || "");

  React.useEffect(() => {
    if (isOpen) setValue(defaultValue || "");
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm?.(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="custom-modal px-8 pt-6 pb-4">
        <h2 className="text-xl font-medium mb-2">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-2"
        />
      </ModalBody>
      <ModalFooter className="justify-center">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={onClose}
        >
          {t("CancelBtn")}
        </Button>
        <Button onClick={handleConfirm} className="w-full h-12 sm:w-auto" disabled={isSubmitting}>
          {confirmLabel || t("Confirm") || "Confirm"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PromptModal;
