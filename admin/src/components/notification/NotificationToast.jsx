import { Link } from "react-router-dom";
import { FiBell, FiAlertCircle, FiAlertTriangle, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { IconButton } from "@sofia/ui";

//internal import
import { humanizeNotificationType } from "@/utils/notificationHelpers";

const ACCENT = {
  critical: { icon: FiAlertTriangle, iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-500", titleColor: "text-red-500" },
  high: { icon: FiAlertCircle, iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-500", titleColor: "text-amber-500" },
  normal: { icon: FiBell, iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-500", titleColor: "text-emerald-500" },
  low: { icon: FiBell, iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-500", titleColor: "text-blue-500" },
};

const NotificationToast = ({ notification, closeToast }) => {
  const { t } = useTranslation();
  const accent = ACCENT[notification?.priority] || ACCENT.normal;
  const Icon = accent.icon;

  return (
    <div className="flex items-start gap-3 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4">
      <span className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${accent.iconBg} ${accent.iconColor}`}>
        <Icon className="w-5 h-5" />
      </span>

      <Link
        to={notification?.actionUrl || "/notifications"}
        onClick={closeToast}
        className="flex-1 min-w-0"
      >
        <p className={`text-sm font-semibold ${accent.titleColor}`}>
          {notification?.title || humanizeNotificationType(notification?.type)}
        </p>
        {notification?.message && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
      </Link>

      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        iconOnly
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          closeToast();
        }}
        aria-label={t("CloseBtn")}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
      >
        <FiX className="w-4 h-4" />
      </IconButton>
    </div>
  );
};

export default NotificationToast;
