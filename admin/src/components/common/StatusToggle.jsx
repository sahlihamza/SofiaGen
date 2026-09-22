import React from "react";
import Switch from "react-switch";
import { useTranslation } from "react-i18next";
import Tooltip from "@/components/tooltip/Tooltip";

const StatusToggle = ({
  status,
  onClick,
  disabled = false,
  activeText,
  inactiveText,
  id,
}) => {
  const { t } = useTranslation();
  const isActive = Boolean(status);

  return (
    <div className="flex justify-center items-center">
      <Tooltip
        id={id || "status-toggle-tooltip"}
        Icon={null}
        title={isActive ? activeText || t("StatusActive") : inactiveText || t("StatusInactive")}
        ariaLabel={isActive ? t("StatusActive") : t("StatusInactive")}
      >
        <Switch
          onChange={onClick}
          checked={isActive}
          disabled={disabled}
          className="react-switch"
          uncheckedIcon={false}
          checkedIcon={false}
          width={36}
          height={18}
          handleDiameter={14}
          offColor="#E5E7EB"
          onColor="#10B981"
          offHandleColor="#9CA3AF"
          onHandleColor="#FFFFFF"
        />
      </Tooltip>
    </div>
  );
};

export default StatusToggle;
