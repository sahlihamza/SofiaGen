import React, { useEffect } from "react";
import { IconButton } from "@sofia/ui";

const variantClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200",
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-200",
};

const Toast = ({
  id,
  title,
  message,
  variant = "info",
  duration = 4000,
  onClose,
  action = null,
}) => {
  useEffect(() => {
    if (!duration || !onClose) return undefined;

    const timer = window.setTimeout(() => {
      onClose(id);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, id, onClose]);

  return (
    <div className={["flex min-w-[280px] max-w-[360px] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg", variantClasses[variant] || variantClasses.info].filter(Boolean).join(" ")}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-semibold dark:bg-gray-900/40">
        {variant === "success" && ""}
        {variant === "error" && "!"}
        {variant === "warning" && ""}
        {variant === "info" && "i"}
      </div>

      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {message && <div className="mt-1 text-sm">{message}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>

      <IconButton
        variant="ghost"
        size="sm"
        iconOnly
        onClick={() => onClose?.(id)}
        className="ml-2 text-current opacity-70 transition hover:opacity-100"
        aria-label="Close notification"
      >
        ×
      </IconButton>

    </div>
  );
};

export default Toast;
