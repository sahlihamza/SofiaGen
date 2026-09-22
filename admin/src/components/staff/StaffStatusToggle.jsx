import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@sofia/ui";

const StaffStatusToggle = ({ status, onClick }) => {
  const { t } = useTranslation();
  const isActive = status === "Active";
  const isPending = status === "Pending";
  const isInvited = status === "Invited";
  const isBlocked = status === "Blocked";
  const isSuspended = status === "Suspended";
  const isArchived = status === "Archived";

  const getStatusColor = () => {
    if (isActive) return "bg-emerald-500";
    if (isPending) return "bg-amber-500";
    if (isInvited) return "bg-sky-500";
    if (isBlocked || isSuspended) return "bg-red-500";
    if (isArchived) return "bg-gray-400";
    return "bg-gray-400";
  };

  const getStatusLabel = () => {
    if (isActive) return t("StatusActive");
    if (isPending) return t("StatusPending");
    if (isInvited) return t("StatusInvited");
    if (isBlocked) return t("StatusBlocked");
    if (isSuspended) return t("StatusSuspended");
    if (isArchived) return t("StatusArchived");
    return status;
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={isActive}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        getStatusColor()
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </Button>
  );
};

export default StaffStatusToggle;