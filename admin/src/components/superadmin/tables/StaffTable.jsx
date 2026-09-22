import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { FiEye, FiShieldOff, FiPower, FiLock, FiCheck, FiX, FiMoreVertical } from "react-icons/fi";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";
import { Button } from "@sofia/ui";


const USER_TYPE_CONFIG = {
  superadmin: { label: "SuperAdmin", className: "badge-superadmin" },
  store_admin: { label: "Store Admin", className: "badge-store-admin" },
  staff: { label: "Staff", className: "badge-staff" },
  customer: { label: "Customer", className: "badge-customer" },
  platform_admin: { label: "Platform Admin", className: "badge-platform-admin" },
};

const getStatusBadge = (status) => {
  switch (status) {
    case "Active":
      return { label: "Active", className: "status-active", icon: "âœ“" };
    case "Inactive":
      return { label: "Inactive", className: "status-inactive", icon: "â€”" };
    case "Suspended":
      return { label: "Suspended", className: "status-suspended", icon: "âš " };

    case "PendingActivation":
      return { label: "Pending", className: "status-pending", icon: "â³" };
    case "Invited":
      return { label: "Invited", className: "status-invited", icon: "âœ‰" };
    default:
      return { label: status || "Unknown", className: "status-inactive", icon: "â€”" };

  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "â€”";

  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getColumns = (userType) => {
  switch (userType) {
    case "superadmin":
      return ["name", "email", "status", "twoFA", "lastLogin", "actions"];
    case "platform_admin":
      return ["name", "email", "platformRole", "status", "lastLogin", "actions"];
    case "staff":
      return ["name", "email", "platformRole", "status", "lastLogin", "actions"];
    default:
      return ["name", "email", "userType", "platformRole", "status", "lastLogin", "actions"];
  }
};

const renderCell = (user, columnKey, t) => {
  switch (columnKey) {
    case "name":
      return (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
            {user.image ? (
              <img src={user.image} alt={user.firstName || user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {(user.firstName || user.name || user.email)?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.displayName || user.name}
            </p>
          </div>
        </div>
      );
    case "email":
      return <span className="text-sm text-gray-900 dark:text-gray-100">{user.email}</span>;
    case "userType": {
      const config = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.customer;
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
          {t(config.label) || config.label}
        </span>
      );
    }
    case "platformRole": {
      const roles = toRoleArray(user?.platformRoles || user?.role);
      return (
        <div className="flex flex-wrap gap-1">
          {roles.length > 0 ? (
            roles.map((role, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
              >
                {typeof role === "string" ? resolveRoleName(role, []) : role?.name || "â€”"}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">â€”</span>

          )}
        </div>
      );
    }
    case "status": {
      const badge = getStatusBadge(user.status);
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
          <span>{badge.icon}</span>
          {t(badge.label) || badge.label}
        </span>
      );
    }
    case "twoFA":
      return user.twoFactorEnabled ? (
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <FiLock size={14} /> {t("Enabled") || "Enabled"}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          {t("Disabled") || "Disabled"}
        </span>
      );
    case "lastLogin":
      return <span className="text-sm text-gray-600 dark:text-gray-300">{formatDate(user.lastLogin)}</span>;
    default:
      return <span className="text-sm text-gray-600 dark:text-gray-300">{user[columnKey] || "â€”"}</span>;

  }
};

const StaffTable = ({ users = [], userType = "all", onViewUser, pagination = {}, onSuspendUser, onReactivateUser, onDeleteUser, onResetPassword, onPageChange, onApproveUser, onRejectUser }) => {
  const { t } = useTranslation();
  const columns = getColumns(userType);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("staff-dropdown-portal");
      if (dropdown && !dropdown.contains(event.target) && !event.target.closest(".action-dropdown")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const labelMap = {
    name: "Name",
    email: "Email",
    userType: "Type",
    platformRole: "PlatformRole",
    status: "Status",
    twoFA: "2FA",
    lastLogin: "LastLogin",
    actions: "Actions",
  };

  const renderActions = (user) => {
    const isDropdownOpen = openDropdownId === user._id;
    const isPending = user.status === "PendingActivation" || user.status === "Invited";
    const isSuspended = user.status === "Suspended";

    return (
      <div className="relative action-dropdown" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={(e) => {
            if (isDropdownOpen) {
              setOpenDropdownId(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, left: rect.right - 192 });
              setOpenDropdownId(user._id);
            }
          }}
          className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={t("Actions") || "Actions"}
        >
          <FiMoreVertical size={18} />
        </Button>

        {isDropdownOpen && dropdownPos &&
          createPortal(
            <div
              id="staff-dropdown-portal"
              className="fixed w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 z-50"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className="py-1">
                <Button
                  type="button"

                  onClick={() => {
                    onViewUser && onViewUser(user);
                    setOpenDropdownId(null);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  icon={<FiEye className="w-4 h-4" />}
                >
                  {t("ViewDetails") || "View details"}
                </Button>

                {isPending && (
                  <>
                    <Button
                      type="button"

                      onClick={() => {
                        onApproveUser && onApproveUser(user);
                        setOpenDropdownId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      icon={<FiCheck className="w-4 h-4" />}
                    >
                      {t("Approve") || "Approve"}
                    </Button>
                    <Button
                      type="button"

                      onClick={() => {
                        onRejectUser && onRejectUser(user);
                        setOpenDropdownId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      icon={<FiX className="w-4 h-4" />}
                    >
                      {t("Reject") || "Reject"}
                    </Button>

                  </>
                )}

                {isSuspended ? (
                  <Button
                    type="button"

                    onClick={() => {
                      onReactivateUser && onReactivateUser(user);
                      setOpenDropdownId(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    icon={<FiPower className="w-4 h-4" />}
                  >
                    {t("Reactivate") || "Reactivate"}
                  </Button>
                ) : (
                  !isPending && (
                    <Button
                      type="button"

                      onClick={() => {
                        onSuspendUser && onSuspendUser(user);
                        setOpenDropdownId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-amber-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      icon={<FiShieldOff className="w-4 h-4" />}
                    >
                      {t("Suspend") || "Suspend"}
                    </Button>
                  )
                )}

                <Button
                  type="button"

                  onClick={() => {
                    onResetPassword && onResetPassword(user);
                    setOpenDropdownId(null);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  icon={<FiLock className="w-4 h-4" />}
                >
                  {t("ResetPassword") || "Reset Password"}
                </Button>

              </div>
            </div>,
            document.body
          )
        }
      </div>
    );
  };

  const tableColumns = columns.map((col) => ({
    key: col,
    header: t(labelMap[col] || col),
    sortable: false,
  }));

  return (
    <SortableDataTable
      columns={tableColumns}
      rows={users}
      getRowKey={(user) => user._id}
      renderCell={({ row: user, column }) => {
        if (column.key === "actions") {
          return renderActions(user);
        }
        return renderCell(user, column.key, t);
      }}
      pagination={
        pagination.total > 0
          ? {
              page: pagination.page,
              total: pagination.total,
              limit: pagination.limit,
              onChange: (page) => onPageChange && onPageChange(page + 1),
            }
          : undefined
      }
    />
  );
};

export default StaffTable;
