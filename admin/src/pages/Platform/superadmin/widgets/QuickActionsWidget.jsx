import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FiPlus,
  FiLayers,
  FiTag,
  FiZap,
  FiUserPlus,
  FiList,
  FiBarChart2,
  FiCreditCard,
  FiAlertTriangle,
} from "react-icons/fi";

/**
 * Quick Actions — shortcut buttons to key platform management pages.
 */
const QuickActionsWidget = () => {
  const { t } = useTranslation();
  const actions = [
    { label: t("superadminDashboard.actions.createStore"), icon: FiPlus, to: "/stores", color: "bg-blue-600 hover:bg-blue-700" },
    { label: t("superadminDashboard.actions.createPlan"), icon: FiLayers, to: "/billing/plans", color: "bg-violet-600 hover:bg-violet-700" },
    { label: t("superadminDashboard.actions.createCoupon"), icon: FiTag, to: "/platform-coupons", color: "bg-emerald-600 hover:bg-emerald-700" },
    { label: t("superadminDashboard.actions.createProvider"), icon: FiZap, to: "/payments", color: "bg-amber-600 hover:bg-amber-700" },
    { label: t("superadminDashboard.actions.createAdmin"), icon: FiUserPlus, to: "/platform/users", color: "bg-cyan-600 hover:bg-cyan-700" },
    { label: t("superadminDashboard.actions.viewSubscriptions"), icon: FiList, to: "/subscriptions", color: "bg-indigo-600 hover:bg-indigo-700" },
    { label: t("superadminDashboard.actions.viewPayments"), icon: FiCreditCard, to: "/payments", color: "bg-teal-600 hover:bg-teal-700" },
    { label: t("superadminDashboard.actions.viewAlerts"), icon: FiAlertTriangle, to: "/notifications", color: "bg-red-600 hover:bg-red-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {actions.map((a) => (
        <Link
          key={a.label}
          to={a.to}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-white shadow-sm transition hover:shadow-md ${a.color}`}
        >
          <a.icon className="h-6 w-6" />
          <span className="text-center text-xs font-semibold">{a.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default QuickActionsWidget;
