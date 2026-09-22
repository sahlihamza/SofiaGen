import React from "react";
import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiInbox } from "react-icons/fi";
import { CButton } from "@/components/ui";

/**
 * Skeleton loader for dashboard widgets.
 */
export const WidgetSkeleton = ({ rows = 4, className = "" }) => (
  <div className={`animate-pulse space-y-3 p-4 ${className}`}>
    <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
    <div className="h-8 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
    ))}
  </div>
);

/**
 * Empty state for dashboard widgets.
 */
export const WidgetEmpty = ({
  title,
  description,
  icon = null,
  action = null,
  className = "",
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/60 ${className}`}
    >
      <div className="mb-3 text-gray-400">
        {icon || <FiInbox className="h-10 w-10" />}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title || t("superadminDashboard.noData")}</h3>
      <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">{description || t("superadminDashboard.noDataDescription")}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

/**
 * Error state for dashboard widgets.
 */
export const WidgetError = ({
  message,
  onRetry = null,
  className = "",
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/50 dark:bg-red-900/10 ${className}`}
    >
      <FiAlertCircle className="mb-3 h-10 w-10 text-red-500" />
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">{t("superadminDashboard.error")}</h3>
      <p className="mt-1 max-w-xs text-xs text-red-600 dark:text-red-300">{message || t("superadminDashboard.errorDescription")}</p>
      {onRetry && (
        <CButton
          onClick={onRetry}
          variant="danger"
          size="sm"
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          {t("superadminDashboard.retry")}
        </CButton>
      )}
    </div>
  );
};

/**
 * Choose between skeleton, empty, error, or children.
 */
export const WidgetContent = ({
  loading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  errorMessage,
  onRetry,
  children,
  skeletonRows = 4,
  className = "",
}) => {
  const { t } = useTranslation();
  if (loading) return <WidgetSkeleton rows={skeletonRows} className={className} />;
  if (error)
    return <WidgetError message={errorMessage || error?.message || t("superadminDashboard.loadingFailed")} onRetry={onRetry} className={className} />;
  if (isEmpty)
    return (
      <WidgetEmpty
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
        className={className}
      />
    );
  return <>{children}</>;
};
