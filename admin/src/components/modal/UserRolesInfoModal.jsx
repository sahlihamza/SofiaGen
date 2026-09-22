import React from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { Button } from "@sofia/ui";

const UserRolesInfoModal = ({ isOpen, onClose, userName, roleNames }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-xl font-medium text-center pb-6 dark:text-gray-300">
        {t("UserRolesInfoModalTitle")}{" "}
        <span className="text-emerald-600">{userName}</span>
      </h1>
      <ModalBody>
        {roleNames?.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center pb-4">
            {roleNames.map((roleName, index) => (
              <span
                key={index}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
              >
                {roleName}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-orange-500 py-10 text-lg text-center">
            {t("UserRolesNoRoleAssigned")}
          </p>
        )}
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button
          className="w-full sm:w-auto bg-red-400 text-white hover:bg-red-500"
          layout="delete"
          onClick={onClose}
        >
          {t("UserRolesInfoModalClose")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default UserRolesInfoModal;
