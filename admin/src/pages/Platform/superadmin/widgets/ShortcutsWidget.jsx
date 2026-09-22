import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FiShoppingBag,
  FiCreditCard,
  FiLayers,
  FiZap,
  FiUsers,
  FiFileText,
  FiTag,
  FiBarChart2,
  FiTool,
  FiLifeBuoy,
} from "react-icons/fi";

/**
 * Shortcuts — quick navigation links.
 */
const ShortcutsWidget = () => {
  const { t } = useTranslation();
  const shortcuts = [
    { label: t("superadminDashboard.shortcuts.stores"), icon: FiShoppingBag, to: "/stores" },
    { label: t("superadminDashboard.shortcuts.payments"), icon: FiCreditCard, to: "/payments" },
    { label: t("superadminDashboard.shortcuts.plans"), icon: FiLayers, to: "/billing/plans" },
    { label: t("superadminDashboard.shortcuts.providers"), icon: FiZap, to: "/payments" },
    { label: t("superadminDashboard.shortcuts.subscriptions"), icon: FiUsers, to: "/subscriptions" },
    { label: t("superadminDashboard.shortcuts.invoices"), icon: FiFileText, to: "/invoices" },
    { label: t("superadminDashboard.shortcuts.coupons"), icon: FiTag, to: "/platform-coupons" },
    { label: t("superadminDashboard.shortcuts.infrastructure"), icon: FiTool, to: "/platform/settings" },
    { label: t("superadminDashboard.shortcuts.support"), icon: FiLifeBuoy, to: "/settings" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {shortcuts.map((s) => (
        <Link
          key={s.label}
          to={s.to}
          className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 text-center transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
        >
          <s.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default ShortcutsWidget;
