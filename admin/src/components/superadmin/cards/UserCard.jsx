import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiLock,
  FiUnlock,
  FiEye,
  FiEdit,
  FiTrash2,
  FiPower,
  FiShieldOff,
  FiArchive,
  FiRotateCcw,
  FiUpload,
  FiMoreVertical,
} from "react-icons/fi";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";
import classnames from "classnames";
import { Button } from "@sofia/ui";

const USER_TYPE_CONFIG = {
  superadmin: { label: "SuperAdmin", className: "badge-superadmin" },
  platform_admin: { label: "Platform Admin", className: "badge-platform-admin" },
  store_admin: { label: "Store Admin", className: "badge-store-admin" },
  staff: { label: "Staff", className: "badge-staff" },
  customer: { label: "Customer", className: "badge-customer" },
};

const getStatusBadge = (status) => {
  switch (status) {
    case "Active":
      return { label: "Active", className: "status-active", dotClass: "status-dot-active" };
    case "Inactive":
      return { label: "Inactive", className: "status-inactive", dotClass: "status-dot-inactive" };
    case "Suspended":
      return { label: "Suspended", className: "status-suspended", dotClass: "status-dot-suspended" };
    case "Blocked":
      return { label: "Blocked", className: "status-blocked", dotClass: "status-dot-blocked" };
    case "Archived":
      return { label: "Archived", className: "status-archived", dotClass: "status-dot-archived" };
    case "Invited":
      return { label: "Invited", className: "status-invited", dotClass: "status-dot-invited" };
    case "PendingActivation":
      return { label: "PendingActivation", className: "status-pending", dotClass: "status-dot-pending" };
    case "Draft":
      return { label: "Draft", className: "status-draft", dotClass: "status-dot-draft" };
    default:
      return { label: status || "Unknown", className: "status-inactive", dotClass: "status-dot-inactive" };
  }
};

const UserCard = ({
  user,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onSuspend,
  onReactivate,
  onBlock,
  onUnblock,
  onArchive,
  onUnarchive,
  onResendInvitation,
  roleOptions = [],
}) => {
  const { t } = useTranslation();

  const statusBadge = getStatusBadge(user.status);
  const userTypeConfig = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.customer;
  const roleNames = toRoleArray(user?.role)
    .map((r) => resolveRoleName(r, roleOptions))
    .filter(Boolean);

  const displayName =
    (user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.displayName || user.name) || "â€”";

  const formatDate = (dateStr) => {
    if (!dateStr) return t("Never");
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t("JustNow");
    if (diffMins < 60) return `${diffMins} ${t("MinutesAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("HoursAgo")}`;
    if (diffDays < 7) return `${diffDays} ${t("DaysAgo")}`;
    return date.toLocaleDateString();
  };

  const isBlocked = user.status === "Blocked";
  const isArchived = user.status === "Archived";
  const isInvited = user.status === "Invited";
  const isSuspended = user.status === "Suspended";
  const isSuperAdmin = user.isSuperAdmin;

  return (
    <div
      className={classnames(
        "user-card relative rounded-xl p-5 cursor-pointer pt-14",
        isSelected
          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-400 shadow-md"
          : "bg-white dark:bg-gray-800"
      )}
      onClick={() => onView && onView(user)}
    >
      <div className="flex items-start justify-between mb-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect && onToggleSelect(user._id);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={isSuperAdmin}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />

        <div className="flex items-center gap-3 ml-3">
          <div className="user-avatar-fallback">
            {user.image ? (
              <img
                src={user.image}
                alt={displayName}
                className="user-avatar"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {displayName?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            {user.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {user.phone}
              </p>
            )}
          </div>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${userTypeConfig.className} flex-shrink-0`}
        >
          {t(userTypeConfig.label) || userTypeConfig.label}
        </span>
      </div>

      <div className="space-y-3">
        {roleNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roleNames.map((roleName, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {roleName}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
          >
            <span className={`status-dot ${statusBadge.dotClass}`}></span>
            {t(statusBadge.label) || statusBadge.label}
          </span>

          {user.twoFactorEnabled ? (
            <FiLock className="text-blue-500" size={16} title={t("TwoFAEnabled")} />
          ) : (
            <FiUnlock className="text-gray-400" size={16} title={t("TwoFADisabled")} />
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <span className="font-medium">{t("LastLogin")}:</span>
          <span>{formatDate(user.lastLogin)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="user-card-actions absolute top-3 right-3 flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          onClick={() => onView && onView(user)}
          className="p-1.5 text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 rounded hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
          title={t("ViewDetails") || "Voir"}
          aria-label={t("ViewDetails") || "Voir"}
        >
          <FiEye size={14} />
        </Button>
        {!isSuperAdmin && (
          <>
            {isBlocked ? (
              <Button
                type="button"
                onClick={() => onUnblock && onUnblock(user)}
                className="p-1.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                title={t("UnblockUser") || "DÃ©bloquer"}
                aria-label={t("UnblockUser") || "DÃ©bloquer"}
              >
                <FiUnlock size={14} />
              </Button>
            ) : isArchived ? (
              <Button
                type="button"
                onClick={() => onUnarchive && onUnarchive(user)}
                className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                title={t("UnarchiveUser") || "Restaurer"}
                aria-label={t("UnarchiveUser") || "Restaurer"}
              >
                <FiRotateCcw size={14} />
              </Button>
            ) : (
              <>
                {!isSuspended && (
                  <Button
                    type="button"
                    onClick={() => onSuspend && onSuspend(user)}
                    className="p-1.5 text-amber-600 hover:text-amber-800 dark:text-amber-400 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    title={t("SuspendUser") || "Suspendre"}
                    aria-label={t("SuspendUser") || "Suspendre"}
                  >
                    <FiShieldOff size={14} />
                  </Button>
                )}
                {isSuspended && (
                  <Button
                    type="button"
                    onClick={() => onReactivate && onReactivate(user)}
                    className="p-1.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    title={t("ReactivateUser") || "RÃ©activer"}
                    aria-label={t("ReactivateUser") || "RÃ©activer"}
                  >
                    <FiPower size={14} />
                  </Button>
                )}
                <Button
                  type="button"

                  onClick={() => onBlock && onBlock(user)}
                  className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  title={t("BlockUser") || "Bloquer"}
                  aria-label={t("BlockUser") || "Bloquer"}
                >
                  <FiShieldOff size={14} />
                </Button>
                <Button
                  type="button"
                  onClick={() => onArchive && onArchive(user)}
                  className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  title={t("ArchiveUser") || "Archiver"}
                  aria-label={t("ArchiveUser") || "Archiver"}
                >
                  <FiArchive size={14} />
                </Button>
                {isInvited && (
                  <Button
                    type="button"
                    onClick={() => onResendInvitation && onResendInvitation(user)}
                    className="p-1.5 text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 rounded hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                    title={t("ResendInvitation") || "Renvoyer l'invitation"}
                    aria-label={t("ResendInvitation") || "Renvoyer l'invitation"}
                  >
                    <FiUpload size={14} />
                  </Button>
                )}
              </>
            )}
            <Button
              type="button"
              onClick={() => onEdit && onEdit(user)}
              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title={t("Edit") || "Modifier"}
              aria-label={t("Edit") || "Modifier"}
            >
              <FiEdit size={14} />
            </Button>
            {!isArchived && !isBlocked && (
              <Button
                type="button"
                onClick={() => onDelete && onDelete(user)}
                className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t("Delete") || "Supprimer"}
                aria-label={t("Delete") || "Supprimer"}
              >
                <FiTrash2 size={14} />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserCard;
