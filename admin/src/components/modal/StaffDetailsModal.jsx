import { Modal, ModalBody } from "@windmill/react-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiCalendar,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";

const StaffDetailsModal = ({ isOpen, onClose, staff, roleOptions = [] }) => {
  const { showDateFormat } = useUtilsFunction();
  const { t } = useTranslation();

  if (!staff) return null;

  const roles = toRoleArray(staff?.role);
  const isActive = staff?.status === "Active";

  const noInfo = t("StaffDetailsNoInfo");

  const topRowItems = [
    { icon: FiPhone, label: t("StaffDetailsPhone"), value: staff?.phone },
    {
      icon: FiCalendar,
      label: t("StaffDetailsJoiningDate"),
      value: staff?.joiningData ? showDateFormat(staff.joiningData) : null,
    },
  ];

  const emailItem = {
    icon: FiMail,
    label: t("StaffDetailsEmail"),
    value: staff?.email,
  };

  const bottomRowItems = [
    {
      icon: FiMapPin,
      label: t("StaffDetailsAddress"),
      value: staff?.address || null,
      placeholder: noInfo,
    },
    {
      icon: FiUser,
      label: t("StaffDetailsGender"),
      value: staff?.gender || null,
      placeholder: noInfo,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full pt-3 pr-3 overflow-hidden bg-white rounded-lg dark:bg-gray-800 sm:m-4 !max-w-2xl"
      style={{ maxWidth: 720 }}
    >
      <ModalBody className="p-0">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t("StaffDetailsModalTitle")}
          </h2>
        </div>

        {/* profile summary */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4">
          {staff?.image ? (
            <img
              src={staff.image}
              alt={staff?.name}
              className="h-28 w-28 rounded-full object-cover border border-gray-100 dark:border-gray-700"
            />
          ) : (
            <div className="h-28 w-28 rounded-full flex items-center justify-center bg-gray-200 text-3xl font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
              {staff?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}

          <h3 className="mt-3 text-xl font-semibold text-gray-800 dark:text-gray-200">
            {staff?.name}
          </h3>

          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span>
              {isActive ? t("StaffDetailsActive") : t("StaffDetailsInactive")}
            </span>
          </span>
        </div>

        {/* info grid */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topRowItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-2 rounded-lg border border-gray-100 dark:border-gray-700 p-3"
              >
                <Icon className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {label}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 break-all">
                    {value || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-100 dark:border-gray-700 p-3">
            <FiMail className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {emailItem.label}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 break-all">
                {emailItem.value || "—"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bottomRowItems.map(({ icon: Icon, label, value, placeholder }) => (
              <div
                key={label}
                className="flex items-start gap-2 rounded-lg border border-gray-100 dark:border-gray-700 p-3"
              >
                <Icon className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {label}
                  </p>
                  <p
                    className={`text-sm break-all ${
                      value
                        ? "text-gray-700 dark:text-gray-200"
                        : "text-gray-400 dark:text-gray-500 italic"
                    }`}
                  >
                    {value || placeholder}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-100 dark:border-gray-700 p-3">
            <FiShield className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                {t("StaffDetailsRoles")}
              </p>
              {roles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((roleItem, index) => (
                    <span
                      key={typeof roleItem === "string" ? roleItem : roleItem?._id ?? index}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                    >
                      {resolveRoleName(roleItem, roleOptions)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("StaffDetailsNoRole")}
                </p>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default StaffDetailsModal;
