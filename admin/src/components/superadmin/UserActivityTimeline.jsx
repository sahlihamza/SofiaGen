import React from "react";
import { useTranslation } from "react-i18next";
import { FiUser, FiEdit, FiShield, FiLogIn, FiLogOut, FiTrash2, FiKey, FiLock, FiUnlock } from "react-icons/fi";

const ACTIVITY_ICONS = {
  create: FiUser,
  update: FiEdit,
  delete: FiTrash2,
  suspend: FiShield,
  reactivate: FiUnlock,
  reset_password: FiKey,
  logout_all_devices: FiLogOut,
  reset_2fa: FiLock,
  assign_role: FiUser,
  remove_role: FiUser,
  login: FiLogIn,
  login_failed: FiLogIn,
  default: FiUser,
};

const ACTIVITY_COLORS = {
  create: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  update: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
  delete: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
  suspend: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
  reactivate: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200",
  reset_password: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
  logout_all_devices: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  reset_2fa: "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200",
  assign_role: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200",
  remove_role: "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200",
  login: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
  login_failed: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
  default: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
};

const STATUS_COLORS = {
  success: "text-emerald-600",
  failed: "text-red-600",
  pending: "text-yellow-600",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActivityTitle = (action, t) => {
  const titles = {
    create: t("ActivityUserCreated"),
    update: t("ActivityUserUpdated"),
    delete: t("ActivityUserDeleted"),
    suspend: t("ActivityUserSuspended"),
    reactivate: t("ActivityUserReactivated"),
    reset_password: t("ActivityPasswordReset"),
    password_reset_requested: t("ActivityPasswordResetRequested"),
    logout_all_devices: t("ActivityLogoutAllDevices"),
    reset_2fa: t("Activity2FAReset"),
    assign_role: t("ActivityRoleAssigned"),
    assign_role_store_scoped: t("ActivityRoleAssignedStoreScoped"),
    remove_role: t("ActivityRoleRemoved"),
    bulk_assign_role: t("ActivityBulkRoleAssigned"),
    login: t("ActivityLogin"),
    login_failed: t("ActivityLoginFailed"),
  };
  return titles[action] || action;
};

const UserActivityTimeline = ({ activities, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t("NoActivityFound")}
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="border-l border-gray-200 dark:border-gray-700 ml-3">
        {activities.map((activity, index) => {
          const Icon = ACTIVITY_ICONS[activity.action] || ACTIVITY_ICONS.default;
          const colorClass = ACTIVITY_COLORS[activity.action] || ACTIVITY_COLORS.default;
          const statusClass = STATUS_COLORS[activity.status] || STATUS_COLORS.success;

          return (
            <li key={activity._id || index} className="mb-6 ml-6">
              <div className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${colorClass}`}>
                  <Icon size={12} />
                </span>
              </div>

              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getActivityTitle(activity.action, t)}
                </p>
                <span className={`text-xs ${statusClass}`}>
                  {activity.status}
                </span>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(activity.createdAt)}
                {activity.actorId && (
                  <>
                    {" "}{" "}
                    {typeof activity.actorId === "object"
                      ? activity.actorId.name || activity.actorId.email
                      : activity.actorId}
                  </>
                )}
              </p>

              {activity.newValue && (
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded p-2 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(activity.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UserActivityTimeline;
