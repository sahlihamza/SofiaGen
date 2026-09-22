import React from "react";
import { useTranslation } from "react-i18next";
import { FiMail, FiPhone, FiShield } from "react-icons/fi";

import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import CBadge from "@/components/ui/CBadge";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";

const StaffCardGrid = ({
  staffs,
  roleOptions = [],
  selectedIds = [],
  onSelectOne,
  onViewProfile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {staffs?.map((staff) => {
        const currentRoles = toRoleArray(staff?.role);
        const isSelected = selectedIds.includes(staff._id);
        const initials =
          staff?.name
            ?.split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?";

        return (
          <div
            key={staff._id}
            onClick={() => onViewProfile?.(staff)}
            className={`group relative flex flex-col rounded-xl bg-white dark:bg-gray-800 border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
              isSelected
                ? "border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-300 dark:ring-emerald-700"
                : "border-gray-100 dark:border-gray-700/50"
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onSelectOne?.(staff._id)}
              className="absolute top-3 right-3 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 z-10"
            />

            <div className="flex flex-col items-center pt-6 pb-4 px-4">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-gray-700 shadow-md group-hover:scale-105 transition-transform duration-200">
                {staff?.image ? (
                  <img
                    src={staff.image}
                    alt={staff?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">{initials}</span>
                )}
                {staff.twoFactorEnabled && (
                  <span
                    title="2FA"
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow"
                  >
                    <FiShield size={11} />
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-100 text-center truncate max-w-full">
                {staff?.name || (
                  <span className="text-gray-400 italic">{t("StaffTableNoInfo")}</span>
                )}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                {currentRoles.slice(0, 2).map((roleItem) => (
                  <CBadge
                    key={typeof roleItem === "string" ? roleItem : roleItem?._id}
                    role={resolveRoleName(roleItem, roleOptions)}
                  />
                ))}
                {currentRoles.length === 0 && (
                  <span className="text-xs text-gray-400 italic">
                    {t("StaffDetailsNoRole")}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col items-center gap-1 text-xs text-gray-500 dark:text-gray-400 w-full">
                <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                  <FiMail size={11} className="flex-shrink-0" />
                  <span className="truncate">
                    {staff?.email || t("StaffTableNoInfo")}
                  </span>
                </span>
                {staff?.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <FiPhone size={11} className="flex-shrink-0" />
                    {staff.phone}
                  </span>
                )}
              </div>
            </div>

            <div
              className="mt-auto flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {staff?.department || t("StaffTableNoInfo")}
              </span>
              <StaffStatusBadge status={staff?.status} showToggle={false} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StaffCardGrid;
