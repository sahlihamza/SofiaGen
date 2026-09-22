import React from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

//internal import

const DeleteRoleModal = ({ isOpen, onClose, onConfirm, roleName, isSubmitting }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
        <span className="flex justify-center text-3xl mb-6 text-red-500">
          <FiTrash2 />
        </span>
        <h2 className="text-xl font-medium mb-2">
          {t("RoleDeleteConfirmTitle")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("RoleDeleteConfirmMessage")}{" "}
          <span className="text-red-500 font-semibold">{roleName}</span> ?
        </p>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={onClose}
        >
          {t("RoleDeleteConfirmCancel")}
        </Button>
        <div className="flex justify-end">
          {isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
              <LoadingSpinner alt="Loading" width={20} height={10} />
              <span className="font-serif ml-2 font-light">{t("Processing")}</span>
            </Button>
          ) : (
            <Button onClick={onConfirm} className="w-full h-12 sm:w-auto bg-red-500 hover:bg-red-600">
              {t("RoleDeleteConfirmButton")}
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteRoleModal;
