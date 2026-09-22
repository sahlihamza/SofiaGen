import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiShoppingBag,
  FiTrash2,
  FiCreditCard,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiLogIn,
  FiUserPlus,
  FiEdit3,
  FiZap,
  FiKey,
} from "react-icons/fi";
import { timeAgo } from "../utils/format";

const actionIcon = (module, action) => {
  const a = String(action || "").toLowerCase();
  const m = String(module || "").toLowerCase();
  if (m.includes("store") && a.includes("create")) return { icon: FiShoppingBag, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" };
  if (m.includes("store") && a.includes("delete")) return { icon: FiTrash2, color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20" };
  if (m.includes("subscription") && a.includes("upgrade")) return { icon: FiTrendingUp, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20" };
  if (m.includes("subscription") && a.includes("downgrade")) return { icon: FiTrendingDown, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20" };
  if (m.includes("payment")) return { icon: FiDollarSign, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" };
  if (m.includes("auth") || a.includes("login")) return { icon: FiLogIn, color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20" };
  if (m.includes("user") && a.includes("create")) return { icon: FiUserPlus, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" };
  if (m.includes("plan")) return { icon: FiEdit3, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" };
  if (a.includes("provider")) return { icon: FiZap, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" };
  if (a.includes("key") || a.includes("api")) return { icon: FiKey, color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40" };
  return { icon: FiCreditCard, color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40" };
};

/**
 * Recent Activities  audit log timeline.
 */
const RecentActivitiesWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const activities = data?.recentActivity || [];

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="py-10 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("superadminDashboard.activities.noRecentActivity")}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-4">
        {activities.slice(0, 12).map((act, idx) => {
          const { icon: Icon, color } = actionIcon(act.module, act.action);
          return (
            <div key={`${act._id || idx}`} className="relative flex items-start gap-3">
              <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {act.action || t("superadminDashboard.activities.action")}
                    {act.resource?.name ? `  ${act.resource.name}` : ""}
                  </p>
                  <span className="shrink-0 text-xs text-gray-400">{timeAgo(act.createdAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {act.actorId?.name || act.actorType || t("superadminDashboard.activities.system")}
                  {act.storeId?.name ? `  ${act.storeId.name}` : ""}
                  {act.module ? `  ${act.module}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivitiesWidget;
