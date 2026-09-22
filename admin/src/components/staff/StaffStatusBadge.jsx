import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@sofia/ui";

const STATUS_STYLES = {
  Active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60",
  Pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-800/60",
  Invited:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/40 hover:bg-sky-100 dark:hover:bg-sky-800/60",
  Blocked:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-800/60",
  Suspended:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-800/60",
  Archived:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600/40 hover:bg-gray-200 dark:hover:bg-gray-700/60",
};

const DOT_STYLES = {
  Active: "bg-emerald-500",
  Pending: "bg-amber-500",
  Invited: "bg-sky-500",
  Blocked: "bg-red-500",
  Suspended: "bg-red-500",
  Archived: "bg-gray-400",
};

const LABEL_KEYS = {
  Active: "StatusActive",
  Pending: "StatusPending",
  Invited: "StatusInvited",
  Blocked: "StatusBlocked",
  Suspended: "StatusSuspended",
  Archived: "StatusArchived",
};

const StaffStatusBadge = ({ status, onToggle, showToggle = true }) => {
  const { t } = useTranslation();

  const badgeClass =
    STATUS_STYLES[status] ||
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600/40 hover:bg-gray-200 dark:hover:bg-gray-700/60";
  const dotClass = DOT_STYLES[status] || "bg-gray-400";
  const label = LABEL_KEYS[status] ? t(LABEL_KEYS[status]) : status;

  return (
    <Button
      type="button"
      onClick={showToggle ? onToggle : undefined}
      disabled={!showToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        showToggle ? "cursor-pointer hover:shadow-sm" : "cursor-default"
      } ${badgeClass}`}
      title={showToggle ? t("ChangeStatus") : undefined}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
      {showToggle && (
        <span className="ml-1 text-[10px] opacity-60">
          â–¼
        </span>
      )}
    </Button>
  );
};

export default StaffStatusBadge;
