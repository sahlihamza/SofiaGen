import React from "react";

const roleColorMap = {
  "Platform Owner": { bg: "bg-purple-100", text: "text-purple-700", darkBg: "dark:bg-purple-900/30", darkText: "dark:text-purple-200" },
  "Platform Admin": { bg: "bg-indigo-100", text: "text-indigo-700", darkBg: "dark:bg-indigo-900/30", darkText: "dark:text-indigo-200" },
  "Billing Manager": { bg: "bg-emerald-100", text: "text-emerald-700", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-200" },
  "Support": { bg: "bg-sky-100", text: "text-sky-700", darkBg: "dark:bg-sky-900/30", darkText: "dark:text-sky-200" },
  "Finance": { bg: "bg-amber-100", text: "text-amber-700", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-200" },
  "Analytics": { bg: "bg-teal-100", text: "text-teal-700", darkBg: "dark:bg-teal-900/30", darkText: "dark:text-teal-200" },
  "Security": { bg: "bg-red-100", text: "text-red-700", darkBg: "dark:bg-red-900/30", darkText: "dark:text-red-200" },
  "Read Only": { bg: "bg-gray-100", text: "text-gray-700", darkBg: "dark:bg-gray-700", darkText: "dark:text-gray-200" },
  "Admin": { bg: "bg-indigo-100", text: "text-indigo-700", darkBg: "dark:bg-indigo-900/30", darkText: "dark:text-indigo-200" },
  "Super Admin": { bg: "bg-purple-100", text: "text-purple-700", darkBg: "dark:bg-purple-900/30", darkText: "dark:text-purple-200" },
  "Store Admin": { bg: "bg-blue-100", text: "text-blue-700", darkBg: "dark:bg-blue-900/30", darkText: "dark:text-blue-200" },
  "Store Owner": { bg: "bg-blue-100", text: "text-blue-700", darkBg: "dark:bg-blue-900/30", darkText: "dark:text-blue-200" },
  "Manager": { bg: "bg-emerald-100", text: "text-emerald-700", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-200" },
  "Cashier": { bg: "bg-amber-100", text: "text-amber-700", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-200" },
  "CEO": { bg: "bg-purple-100", text: "text-purple-700", darkBg: "dark:bg-purple-900/30", darkText: "dark:text-purple-200" },
  "Driver": { bg: "bg-teal-100", text: "text-teal-700", darkBg: "dark:bg-teal-900/30", darkText: "dark:text-teal-200" },
  "Security Guard": { bg: "bg-red-100", text: "text-red-700", darkBg: "dark:bg-red-900/30", darkText: "dark:text-red-200" },
  "Accountant": { bg: "bg-emerald-100", text: "text-emerald-700", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-200" },
  "Delivery Person": { bg: "bg-orange-100", text: "text-orange-700", darkBg: "dark:bg-orange-900/30", darkText: "dark:text-orange-200" },
  "Staff": { bg: "bg-gray-100", text: "text-gray-700", darkBg: "dark:bg-gray-700", darkText: "dark:text-gray-200" },
  "Customer": { bg: "bg-cyan-100", text: "text-cyan-700", darkBg: "dark:bg-cyan-900/30", darkText: "dark:text-cyan-200" },
};

const Badge = ({
  children,
  variant = "default",
  size = "sm",
  rounded = "full",
  className = "",
  dot = false,
  role = "",
}) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    primary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    info: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-3.5 py-2 text-sm",
  };

  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "md" ? "rounded-md" : "rounded-none";

  const roleColors = role ? roleColorMap[role] : null;

  const bgClass = roleColors ? roleColors.bg : variantClasses[variant] || variantClasses.default;
  const textClass = roleColors ? roleColors.text : "text-current";
  const darkBgClass = roleColors ? roleColors.darkBg : "";
  const darkTextClass = roleColors ? roleColors.darkText : "";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium",
        roundedClass,
        bgClass,
        textClass,
        darkBgClass,
        darkTextClass,
        sizeClasses[size] || sizeClasses.sm,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;