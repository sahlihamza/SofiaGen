import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiInfo, FiShield } from "react-icons/fi";

//internal import

import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useGetCData from "@/hooks/useGetCData";
import MainDrawer from "@/components/drawer/MainDrawer";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import StaffDrawer from "@/components/drawer/StaffDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import StaffDetailsModal from "@/components/modal/StaffDetailsModal";
import StatusChangeModal from "@/components/modal/StatusChangeModal";
import StaffActionsMenu from "@/components/staff/StaffActionsMenu";
import UserRolesInfoModal from "@/components/modal/UserRolesInfoModal";
import CBadge from "@/components/ui/CBadge";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError } from "@/utils/toast";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";
import { Button } from "@sofia/ui";

const VISIBLE_ROLES_LIMIT = 1;

export const renderStaffCell = (col, staff, {
  t,
  roleOptions = [],
  selectedIds = [],
  onSelectOne,
  onViewProfile,
  canUpdateStaff,
  canDeleteStaff,
  handleDetailsModalOpen,
  handleStatusModalOpen,
  setStaffForRolesInfo,
  showDateFormat,
  VISIBLE_ROLES_LIMIT = 1,
}) => {
  const currentRoles = Array.isArray(staff?.role)
    ? staff.role.map((r) => (typeof r === "string" ? r : r?.name || r?._id || "")).filter(Boolean)
    : typeof staff?.role === "string"
      ? [staff.role]
      : [];

  const stores = staff?.storeIds || staff?.storesManaged || [];
  const storeNames = Array.isArray(stores)
    ? stores.map((s) => (typeof s === "object" ? s?.name : s)).filter(Boolean)
    : [];
  const isSelected = selectedIds.includes(staff._id);

  const resolveRoleName = (roleItem) => {
    if (typeof roleItem === "string") return roleItem;
    return roleItem?.name || roleItem?._id || "";
  };

  switch (col) {
    case "name":
      return (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-gray-700 shadow-sm">
            {staff?.image ? (
              <img
                src={staff.image}
                alt={staff?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white">
                {staff?.name
                  ?.split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {staff?.name || (
                <span className="text-gray-400 italic">
                  {t("StaffTableNoInfo")}
                </span>
              )}
            </h2>
          </div>
        </div>
      );
    case "email":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {staff.email || (
            <span className="text-gray-400 italic">
              {t("StaffTableNoInfo")}
            </span>
          )}
        </span>
      );
    case "phone":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {staff.phone || (
            <span className="text-gray-400 italic">
              {t("StaffTableNoInfo")}
            </span>
          )}
        </span>
      );
    case "department":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {staff.department || (
            <span className="text-gray-400 italic">
              {t("StaffTableNoInfo")}
            </span>
          )}
        </span>
      );
    case "role":
      return (
        <div className="flex flex-wrap items-center gap-2">
          {currentRoles.length > 0 ? (
            <>
              {currentRoles
                .slice(0, VISIBLE_ROLES_LIMIT)
                .map((roleItem) => (
                  <span
                    key={resolveRoleName(roleItem)}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                  >
                    {resolveRoleName(roleItem)}
                  </span>
                ))}
              {currentRoles.length > VISIBLE_ROLES_LIMIT && (
                <Button
                  type="button"
                  onClick={() =>
                    setStaffForRolesInfo({
                      name: staff?.name,
                      roleNames: currentRoles.map(resolveRoleName),
                    })
                  }
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  +{currentRoles.length - VISIBLE_ROLES_LIMIT}
                </Button>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">
              {t("StaffDetailsNoRole")}
            </span>
          )}
        </div>
      );
    case "twoFactorEnabled":
      return (
        <span className="text-center">
          {staff.twoFactorEnabled ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm" title="2FA Enabled">
              <span className="text-xs font-medium">âœ“</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-300 dark:text-gray-600 text-sm" title="2FA Disabled">
              <span className="text-xs font-medium">â€”</span>

            </span>
          )}
        </span>
      );
    case "status":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            staff.status === "Active"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : staff.status === "Blocked"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : staff.status === "Suspended"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {staff.status || "â€”"}

        </span>
      );
    case "storesManaged":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {storeNames.length > 0 ? (
            <span className="font-semibold text-gray-800 dark:text-gray-200">{storeNames.length}</span>
          ) : (
            <span className="text-gray-400 italic">0</span>
          )}
        </span>
      );
    case "lastLogin":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {staff.lastLogin
            ? showDateFormat(staff.lastLogin)
            : (
              <span className="text-gray-400 italic">
                {t("StaffTableNoInfo")}
              </span>
            )}
        </span>
      );
    case "lastActivity":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {staff.lastActivity
            ? showDateFormat(staff.lastActivity)
            : (
              <span className="text-gray-400 italic">
                {t("StaffTableNoInfo")}
              </span>
            )}
        </span>
      );
    case "createdAt":
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {staff.createdAt
            ? showDateFormat(staff.createdAt)
            : (
              <span className="text-gray-400 italic">
                {t("StaffTableNoInfo")}
              </span>
            )}
        </span>
      );
    case "actions":
      return (
        <div className="flex justify-center items-center">
          <span className="text-xs text-gray-400">Actions</span>
        </div>
      );
    default:
      return (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {staff[col] !== undefined ? String(staff[col]) : "â€”"}

        </span>
      );
  }
};

const StaffTable = ({ staffs, lang, roleOptions = [], selectedIds = [], visibleColumns = {}, onSelectOne, onViewProfile }) => {
  const {
    title,
    serviceId,
    handleModalOpen,
    handleUpdate,
    isSubmitting,
  } = useToggleDrawer();

  const { showDateFormat } = useUtilsFunction();
  const { role, hasPermission } = useGetCData();
  const { t } = useTranslation();
  const { setIsUpdate } = useContext(SidebarContext);
  const canUpdateStaff = hasPermission("staff", "update");
  const canDeleteStaff = hasPermission("staff", "delete");

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [staffForRolesInfo, setStaffForRolesInfo] = useState(null);

  const handleDetailsModalOpen = (staff) => {
    setSelectedStaff(staff);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setSelectedStaff(null);
    setIsDetailsModalOpen(false);
  };

  const [selectedStatusStaff, setSelectedStatusStaff] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const handleStatusModalOpen = (staff) => {
    if (!canUpdateStaff) {
      return notifyError(
        "Only Super Admin and Admin can enable/disable any staff!"
      );
    }
    setSelectedStatusStaff(staff);
    setIsStatusModalOpen(true);
  };

  const handleStatusModalClose = () => {
    setSelectedStatusStaff(null);
    setIsStatusModalOpen(false);
  };

  const handleStatusChangeSuccess = () => {
    setIsUpdate(true);
    handleStatusModalClose();
  };

  return (
    <>
      <DeleteModal id={serviceId} title={title} />
      {isDetailsModalOpen && (
        <StaffDetailsModal
          staff={selectedStaff}
          isOpen={isDetailsModalOpen}
          onClose={handleDetailsModalClose}
          roleOptions={roleOptions}
        />
      )}

      {isStatusModalOpen && (
        <StatusChangeModal
          isOpen={isStatusModalOpen}
          onClose={handleStatusModalClose}
          staffId={selectedStatusStaff?._id}
          staffName={selectedStatusStaff?.name}
          currentStatus={selectedStatusStaff?.status}
          onSuccess={handleStatusChangeSuccess}
        />
      )}

      <UserRolesInfoModal
        isOpen={!!staffForRolesInfo}
        onClose={() => setStaffForRolesInfo(null)}
        userName={staffForRolesInfo?.name}
        roleNames={staffForRolesInfo?.roleNames}
      />

      <MainDrawer>
        <StaffDrawer id={serviceId} />
      </MainDrawer>

      <TableBody>
        {staffs?.map((staff) => {
          const currentRoles = toRoleArray(staff?.role);
          const stores = staff?.storeIds || staff?.storesManaged || [];
          const storeNames = Array.isArray(stores)
            ? stores.map((s) => (typeof s === "object" ? s?.name : s)).filter(Boolean)
            : [];
          const isSelected = selectedIds.includes(staff._id);

          return (
            <TableRow
              key={staff._id}
              className={`group border-b border-gray-50 dark:border-gray-700/40 hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors duration-150 ${
                isSelected ? "bg-emerald-50/70 dark:bg-emerald-900/10" : ""
              }`}
            >
              <TableCell className={`w-10 px-4 sticky left-0 z-10 transition-colors duration-150 ${
                isSelected
                  ? "bg-emerald-50/70 dark:bg-emerald-900/10"
                  : "bg-white dark:bg-gray-800 group-hover:bg-gray-50/80 dark:group-hover:bg-gray-700/40"
              }`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectOne?.(staff._id)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </TableCell>

              {visibleColumns.name !== false && (
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-gray-700 shadow-sm">
                      {staff?.image ? (
                        <img
                          src={staff.image}
                          alt={staff?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-white">
                          {staff?.name
                            ?.split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {staff?.name || (
                          <span className="text-gray-400 italic">
                            {t("StaffTableNoInfo")}
                          </span>
                        )}
                      </h2>
                    </div>
                  </div>
                </TableCell>
              )}

              {visibleColumns.email !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {staff.email || (
                      <span className="text-gray-400 italic">
                        {t("StaffTableNoInfo")}
                      </span>
                    )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.phone !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {staff.phone || (
                      <span className="text-gray-400 italic">
                        {t("StaffTableNoInfo")}
                      </span>
                    )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.department !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {staff.department || (
                      <span className="text-gray-400 italic">
                        {t("StaffTableNoInfo")}
                      </span>
                    )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.role !== false && (
                <TableCell>
                  {(() => {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        {currentRoles.length > 0 ? (
                          <>
                            {currentRoles
                              .slice(0, VISIBLE_ROLES_LIMIT)
                              .map((roleItem) => (
                                <CBadge
                                  key={typeof roleItem === "string" ? roleItem : roleItem?._id}
                                  role={resolveRoleName(roleItem, roleOptions)}
                                />
                              ))}
                            {currentRoles.length > VISIBLE_ROLES_LIMIT && (
                              <Button
                                type="button"
                                onClick={() =>
                                  setStaffForRolesInfo({
                                    name: staff?.name,
                                    roleNames: currentRoles.map((roleItem) =>
                                      resolveRoleName(roleItem, roleOptions)
                                    ),
                                  })
                                }
                                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                +{currentRoles.length - VISIBLE_ROLES_LIMIT}
                                <FiInfo className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">
                            {t("StaffDetailsNoRole")}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>
              )}

              {visibleColumns.twoFactorEnabled !== false && (
                <TableCell className="text-center">
                  {staff.twoFactorEnabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm" title="2FA Enabled">
                      <FiShield className="w-4 h-4" />
                      <span className="text-xs font-medium">âœ“</span>

                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-300 dark:text-gray-600 text-sm" title="2FA Disabled">
                      <FiShield className="w-4 h-4" />
                      <span className="text-xs font-medium">â€”</span>

                    </span>
                  )}
                </TableCell>
              )}

              {visibleColumns.status !== false && (
                <TableCell>
                  <StaffStatusBadge
                    status={staff.status}
                    onToggle={() => handleStatusModalOpen(staff)}
                  />
                </TableCell>
              )}

              {visibleColumns.storesManaged !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {storeNames.length > 0 ? (
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{storeNames.length}</span>
                    ) : (
                      <span className="text-gray-400 italic">0</span>
                    )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.lastLogin !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {staff.lastLogin
                      ? showDateFormat(staff.lastLogin)
                      : (
                        <span className="text-gray-400 italic">
                          {t("StaffTableNoInfo")}
                        </span>
                      )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.lastActivity !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {staff.lastActivity
                      ? showDateFormat(staff.lastActivity)
                      : (
                        <span className="text-gray-400 italic">
                          {t("StaffTableNoInfo")}
                        </span>
                      )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.createdAt !== false && (
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {staff.createdAt
                      ? showDateFormat(staff.createdAt)
                      : (
                        <span className="text-gray-400 italic">
                          {t("StaffTableNoInfo")}
                        </span>
                      )}
                  </span>
                </TableCell>
              )}

              {visibleColumns.actions !== false && (
                <TableCell>
                  <div className="flex justify-center items-center">
                    <StaffActionsMenu
                      id={staff._id}
                      isSubmitting={isSubmitting}
                      handleUpdate={handleUpdate}
                      handleModalOpen={handleModalOpen}
                      handleView={() => onViewProfile?.(staff)}
                      handleDetailsModalOpen={handleDetailsModalOpen}
                      title={staff?.name}
                      status={staff?.status}
                      showEdit={canUpdateStaff}
                      showDelete={canDeleteStaff}
                    />
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </>
  );
};

export default StaffTable;