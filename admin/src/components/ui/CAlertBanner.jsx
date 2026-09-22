import React from "react";
import { IconButton } from "@sofia/ui";

const variantClasses = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200",
    icon: "text-red-600 dark:text-red-300",
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200",
    icon: "text-amber-600 dark:text-amber-300",
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-200",
    icon: "text-blue-600 dark:text-blue-300",
  },
};

const defaultIcons = {
  success: "",
  error: "!",
  warning: "",
  info: "i",
};

const AlertBanner = ({
  title,
  description,
  variant = "info",
  icon = null,
  action = null,
  dismissible = false,
  onDismiss = null,
  className = "",
}) => {
  const styles = variantClasses[variant] || variantClasses.info;
  const displayIcon = icon ?? defaultIcons[variant] ?? defaultIcons.info;

  return (
    <div className={["flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm", styles.container, className].filter(Boolean).join(" ")}>
      <div className={["mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-semibold dark:bg-gray-900/40", styles.icon].filter(Boolean).join(" ")}>
        {displayIcon}
      </div>

      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="mt-1">{description}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>

      {dismissible && (
        <IconButton
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onDismiss}
          className="ml-2 text-current opacity-70 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </IconButton>

      )}
    </div>
  );
};

export default AlertBanner;
