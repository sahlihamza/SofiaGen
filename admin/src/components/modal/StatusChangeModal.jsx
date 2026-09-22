import React, { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiAlertTriangle } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import UserServices from "@/services/UserServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const StatusChangeModal = ({ isOpen, onClose, staffId, staffName, currentStatus, onSuccess }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
  const nextStatusLabel = nextStatus === "Active" ? t("StatusActive") : t("StatusInactive");

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await UserServices.updateStaffStatus(staffId, {
        status: nextStatus,
      });
      notifySuccess(t("StatusChangeSuccess"));
      onSuccess();
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
        <span className="flex justify-center text-3xl mb-6 text-yellow-500">
          <FiAlertTriangle />
        </span>
        <h2 className="text-xl font-medium mb-2">
          {t("StatusChangeConfirmMessage")}{" "}
          <span className="text-emerald-600">{staffName}</span>{" "}
          {t("StatusChangeConfirmTo")}{" "}
          <span
            className={
              nextStatus === "Active" ? "text-emerald-600" : "text-red-500"
            }
          >
            {nextStatusLabel}
            {"Â ?"}
          </span>
        </h2>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={onClose}
        >
          {t("StatusChangeConfirmCancel")}
        </Button>
        <div className="flex justify-end">
          {isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
              <LoadingSpinner alt="Loading" width={20} height={10} />
              <span className="font-serif ml-2 font-light">{t("Processing")}</span>
            </Button>
          ) : (
            <Button onClick={handleConfirm} className="w-full h-12 sm:w-auto">
              {t("StatusChangeConfirmSave")}
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default StatusChangeModal;
