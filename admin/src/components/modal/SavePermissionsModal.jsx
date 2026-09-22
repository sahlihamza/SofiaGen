import React from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiAlertTriangle } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

//internal import

const SavePermissionsModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
        <span className="flex justify-center text-3xl mb-6 text-yellow-500">
          <FiAlertTriangle />
        </span>
        <h2 className="text-xl font-medium mb-2">
          {t("RolePermissionsConfirmTitle")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("RolePermissionsConfirmMessage")}
        </p>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={onClose}
        >
          {t("RolePermissionsConfirmCancel")}
        </Button>
        <div className="flex justify-end">
          {isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
              <LoadingSpinner alt="Loading" width={20} height={10} />
              <span className="font-serif ml-2 font-light">{t("Processing")}</span>
            </Button>
          ) : (
            <Button onClick={onConfirm} className="w-full h-12 sm:w-auto">
              {t("RolePermissionsConfirmSave")}
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default SavePermissionsModal;
