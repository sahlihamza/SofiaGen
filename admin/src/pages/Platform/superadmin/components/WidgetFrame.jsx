import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDrag, useDrop } from "react-dnd";
import { FiEye, FiEyeOff, FiMenu, FiRefreshCw } from "react-icons/fi";
import { useDashboard } from "../context/DashboardContext";
import { CButton, IconButton } from "@/components/ui";

const WIDGET_TYPE = "DASHBOARD_WIDGET";

/**
 * WidgetFrame
 *
 * Card shell for each dashboard widget with:
 *  - drag handle (react-dnd) for reordering
 *  - hide toggle (persisted in localStorage via DashboardContext)
 *  - refresh button
 *  - loading indicator
 */
const WidgetFrame = ({
  id,
  title,
  subtitle = "",
  icon: Icon = null,
  actions = null,
  loading = false,
  children,
  className = "",
  contentClassName = "",
}) => {
  const { t } = useTranslation();
  const { setWidgetVisibility, moveWidget, isRefreshing, refreshKey } = useDashboard();
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: WIDGET_TYPE,
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: WIDGET_TYPE,
    hover: (item) => {
      if (item.id !== id) {
        moveWidget(item.id, id);
        // eslint-disable-next-line no-param-reassign
        item.id = id;
      }
    },
  });

  drag(drop(ref));

  return (
    <section
      ref={ref}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${
        isDragging ? "opacity-50 ring-2 ring-blue-500" : ""
      } ${className}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            icon={<FiMenu className="h-4 w-4" />}
            size="sm"
            className="cursor-grab touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
            title={t("superadminDashboard.dragToReorder")}
            aria-label={t("superadminDashboard.dragWidgetTitle", { title })}
          />
          {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            {subtitle && (
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {loading || isRefreshing ? (
            <FiRefreshCw key={refreshKey} className="h-3.5 w-3.5 animate-spin text-blue-500" />
          ) : null}
          {actions}
          <IconButton
            icon={<FiEyeOff className="h-3.5 w-3.5" />}
            size="sm"
            onClick={() => setWidgetVisibility(id, false)}
            className="rounded p-1 text-gray-300 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title={t("superadminDashboard.hideWidget")}
            aria-label={t("superadminDashboard.hideWidgetTitle", { title })}
          />
        </div>
      </header>

      <div className={`flex-1 overflow-auto p-4 ${contentClassName}`}>{children}</div>
    </section>
  );
};

/**
 * Toggle to restore hidden widgets.
 */
export const WidgetToggleBar = () => {
  const { t } = useTranslation();
  const { visibility, setWidgetVisibility } = useDashboard();
  const hidden = Object.entries(visibility).filter(([, v]) => v === false);

  if (!hidden.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
      <FiEye className="h-4 w-4 text-gray-400" />
      <span className="text-sm text-gray-500 dark:text-gray-400">{t("superadminDashboard.hiddenWidgets")}</span>
      {hidden.map(([id]) => (
        <CButton
          key={id}
          onClick={() => setWidgetVisibility(id, true)}
          variant="outline"
          size="sm"
          className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
        >
          {t("superadminDashboard.restoreWidget", { id })}
        </CButton>
      ))}
    </div>
  );
};

export default WidgetFrame;
