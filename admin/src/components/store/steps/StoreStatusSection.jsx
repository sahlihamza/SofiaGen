import { useTranslation } from "react-i18next";
import CStatusSwitch from "@/components/ui/CStatusSwitch";

const StoreStatusSection = ({ formData, onDataChange }) => {
  const { t } = useTranslation();

  return (
    <div className="sm:col-span-2 pt-2 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {t("StatusLabel") || "Status"}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formData.status
            ? t("StoreWillBeLiveDesc") || "The store will be active immediately."
            : t("StoreWillBeInactiveDesc") || "The store stays hidden until activated."}
        </p>
      </div>
      <CStatusSwitch
        checked={Boolean(formData.status)}
        onChange={(checked) => onDataChange({ status: checked })}
        label={
          formData.status
            ? t("ActiveStatus") || "Active"
            : t("InactiveStatus") || "Inactive"
        }
      />
    </div>
  );
};

export default StoreStatusSection;
