import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiCopy } from "react-icons/fi";
import { Button } from "@sofia/ui";

const ClonePlanModal = ({
  isOpen,
  onClose,
  cloneData,
  setCloneData,
  onConfirm,
  isCloning,
}) => {
  const { t } = useTranslation();

  const handleNameChange = (e) => {
    setCloneData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleSlugChange = (e) => {
    setCloneData((prev) => ({ ...prev, slug: e.target.value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
        <span className="flex justify-center text-3xl mb-6 text-blue-500">
          <FiCopy />
        </span>
        <h2 className="text-xl font-medium mb-2">
          {t("ClonePlan") || "Clone Plan"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t("ClonePlanDescription") ||
            "Create a copy of this plan with the following details."}
        </p>

        <div className="text-left space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("PlanName")}
            </label>
            <input
              type="text"
              value={cloneData.name}
              onChange={handleNameChange}
              className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("PlanSlug")}
            </label>
            <input
              type="text"
              value={cloneData.slug}
              onChange={handleSlugChange}
              className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Status")}
            </label>
            <input
              type="text"
              value="Draft"
              disabled
              className="block w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          layout="outline"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          {t("Cancel") || "Cancel"}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isCloning}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
        >
          {isCloning
            ? t("Cloning") || "Cloning..."
            : t("ClonePlan") || "Clone Plan"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ClonePlanModal;