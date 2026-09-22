import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FiLock,
  FiUnlock,
  FiEye,
  FiEdit,
  FiTrash2,
  FiShieldOff,
  FiPower,
  FiUpload,
  FiArchive,
  FiRotateCcw,
  FiUserPlus,
  FiMoreVertical,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";
import ActionMenuItem from "@/components/table/ActionMenuItem";
import classnames from "classnames";
import { Button } from "@sofia/ui";

const USER_TYPE_CONFIG = {
  superadmin: { label: "SuperAdmin", className: "badge-superadmin" },
  platform_admin: { label: "Platform Admin", className: "badge-platform-admin" },
  store_admin: { label: "Store Admin", className: "badge-store-admin" },
  staff: { label: "Staff", className: "badge-staff" },
  customer: { label: "Customer", className: "badge-customer" },
};

const getStatusBadge = (status) => {
  switch (status) {
    case "Active":
      return { label: "Active", className: "status-active", dotClass: "status-dot-active" };
    case "Inactive":
      return { label: "Inactive", className: "status-inactive", dotClass: "status-dot-inactive" };
    case "Suspended":
      return { label: "Suspended", className: "status-suspended", dotClass: "status-dot-suspended" };
    case "Blocked":
      return { label: "Blocked", className: "status-blocked", dotClass: "status-dot-blocked" };
    case "Archived":
      return { label: "Archived", className: "status-archived", dotClass: "status-dot-archived" };
    case "Invited":
      return { label: "Invited", className: "status-invited", dotClass: "status-dot-invited" };
    case "PendingActivation":
      return { label: "PendingActivation", className: "status-pending", dotClass: "status-dot-pending" };
    case "Draft":
      return { label: "Draft", className: "status-draft", dotClass: "status-dot-draft" };
    default:
      return { label: status || "Unknown", className: "status-inactive", dotClass: "status-dot-inactive" };
  }
};

const UsersTable = ({
  users = [],
  selected = [],
  toggleSelection,
  selectAll,
  sortColumn,
  sortDirection,
  onSort,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onSuspendUser,
  onReactivateUser,
  onBlockUser,
  onUnblockUser,
  onArchiveUser,
  onUnarchiveUser,
  onImpersonateUser,
  onResendInvitation,
  onDuplicateUser,
  roleOptions = [],
  isLoading = false,
  columns = null,
}) => {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const tableRef = useRef(null);

  const handleContextMenu = (e, user) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      user,
      position: {
        top: e.clientY,
        left: e.clientX,
      },
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest(".context-menu")) {
        closeContextMenu();
      }
      if (openDropdownId && !e.target.closest(".action-dropdown")) {
        setOpenDropdownId(null);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeContextMenu();
        setOpenDropdownId(null);
      }
    };

    if (contextMenu || openDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenu, openDropdownId]);

  const allSelected = users.length > 0 && selected.length === users.length;
  const isIndeterminate = selected.length > 0 && selected.length < users.length;

  const getRoleNames = (user) => {
    return toRoleArray(user?.role)
      .map((r) => resolveRoleName(r, roleOptions))
      .filter(Boolean);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return t("Never");
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("JustNow");
    if (diffMins < 60) return `${diffMins} ${t("MinutesAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("HoursAgo")}`;
    if (diffDays < 7) return `${diffDays} ${t("DaysAgo")}`;
    return date.toLocaleDateString();
  };

  const renderColumn = (col, user) => {
    switch (col) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <div className="user-avatar-fallback">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.firstName || user.name}
                  className="user-avatar"
                />
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>
          </div>
        );
      case "email":
        return (
          <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
            {user.email}
          </span>
        );
      case "phone":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {user.phone || "â€”"}
          </span>
        );
      case "userType":
        const config = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.customer;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
          >
            {t(config.label) || config.label}
          </span>
        );
      case "status":
        const badge = getStatusBadge(user.status);
        return (
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
            >
              <span className={`status-dot ${badge.dotClass}`}></span>
              {t(badge.label) || badge.label}
            </span>
            {(user.suspendedReason || user.blockedReason || user.archivedReason) && (
              <span
                className="mt-1 block text-xs text-gray-400 dark:text-gray-500 truncate max-w-[150px]"
                title={user.suspendedReason || user.blockedReason || user.archivedReason}
              >
                {(user.suspendedReason || user.blockedReason || user.archivedReason).length > 40
                  ? `${(user.suspendedReason || user.blockedReason || user.archivedReason).slice(0, 40)}...`
                  : user.suspendedReason || user.blockedReason || user.archivedReason}
              </span>
            )}
          </div>
        );
      case "role":
        const roleNames = getRoleNames(user);
        return (
          <div className="flex flex-wrap gap-1">
            {roleNames.length > 0 ? (
              roleNames.map((roleName, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  {roleName}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">â€”</span>
            )}
          </div>
        );
      case "platformRole": {
        const platformRoles = user.platformRoles || (Array.isArray(user.role)
          ? user.role.filter((role) => role?.scope === "platform")
          : []);
        return (
          <div className="flex flex-wrap gap-1">
            {platformRoles.length > 0 ? platformRoles.map((role) => (
              <span key={role._id || role.slug || role.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                {role.name || role.slug}
              </span>
            )) : <span className="text-xs text-gray-400 dark:text-gray-500">â€”</span>}
          </div>
        );
      }
      case "storeCount":
        return <span className="text-sm text-gray-600 dark:text-gray-300">{user.storeCount ?? user.storeMemberships?.length ?? 0}</span>;
      case "team":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {typeof user.team === "object" && user.team?.name
              ? user.team.name
              : user.team || "â€”"}
          </span>
        );
      case "department":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {user.department || "â€”"}
          </span>
        );
      case "storeIds":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {Array.isArray(user.storeIds)
              ? user.storeIds
                  .map((s) => (typeof s === "object" ? s.name : String(s)))
                  .join(", ")
              : ""}
          </span>
        );
      case "twoFactorEnabled":
        return (
          <span className="text-center">
            {user.twoFactorEnabled ? (
              <FiLock className="text-blue-500 mx-auto" size={18} title={t("TwoFAEnabled")} />
            ) : (
              <FiUnlock className="text-gray-400 mx-auto" size={18} title={t("TwoFADisabled")} />
            )}
          </span>
        );
      case "lastLogin":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {formatDate(user.lastLogin)}
          </span>
        );
      case "createdAt":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "â€”"}
          </span>
        );
      case "lastActivity":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {user.lastActivity ? formatDate(user.lastActivity) : t("Never")}
          </span>
        );
      case "actions":
        const isSuspended = user.status === "Suspended";
        const isBlocked = user.status === "Blocked";
        const isArchived = user.status === "Archived";
        const isInvited = user.status === "Invited";
        const isSuperAdmin = user.isSuperAdmin;
        const isDropdownOpen = openDropdownId === user._id;

        return (
          <div className="relative action-dropdown" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdownId(isDropdownOpen ? null : user._id);
              }}
              className={classnames(
                "action-dropdown-trigger",
                isDropdownOpen && "action-dropdown-trigger-active"
              )}
              title={t("Actions") || "Actions"}
              aria-label={t("Actions") || "Actions"}
              aria-expanded={isDropdownOpen}
            >
              <FiMoreVertical size={18} />
            </Button>

            {isDropdownOpen && (
              <div className="action-menu" role="menu">
                <div className="action-menu-header">
                  {t("Actions") || "Actions"}
                </div>
                <div>
                  <Button
                    type="button"

                    onClick={() => {
                      onViewUser && onViewUser(user);
                      setOpenDropdownId(null);
                    }}
                    className="action-menu-item action-menu-item-info"
                    role="menuitem"
                  >
                    <FiEye className="w-4 h-4" />
                    {t("ViewDetails") || "Voir les dÃ©tails"}
                  </Button>
                  <Button
                    type="button"

                    onClick={() => {
                      onEditUser && onEditUser(user);
                      setOpenDropdownId(null);
                    }}
                    className="action-menu-item action-menu-item-info"
                    role="menuitem"
                  >
                    <FiEdit className="w-4 h-4" />
                    {t("Edit") || "Modifier"}
                  </Button>

                  {isBlocked ? (
                    <>
                      <div className="action-menu-divider" />
                      <Button
                        type="button"
                        onClick={() => {
                          onUnblockUser && onUnblockUser(user);
                          setOpenDropdownId(null);
                        }}
                        className="action-menu-item action-menu-item-success"
                        role="menuitem"
                      >
                        <FiUnlock className="w-4 h-4" />
                        {t("UnblockUser") || "DÃ©bloquer"}
                      </Button>
                    </>
                  ) : isArchived ? (
                    <>
                      <div className="action-menu-divider" />
                      <Button
                        type="button"
                        onClick={() => {
                          onUnarchiveUser && onUnarchiveUser(user);
                          setOpenDropdownId(null);
                        }}
                        className="action-menu-item action-menu-item-success"
                        role="menuitem"
                      >
                        <FiRotateCcw className="w-4 h-4" />
                        {t("UnarchiveUser") || "Restaurer"}
                      </Button>
                    </>

                  ) : (
                    <>
                      <div className="action-menu-divider" />
                      {!isSuperAdmin && (
                        <Button
                          type="button"

                          onClick={() => {
                            onBlockUser && onBlockUser(user);
                            setOpenDropdownId(null);
                          }}
                          className="action-menu-item action-menu-item-danger"
                          role="menuitem"
                        >
                          <FiShieldOff className="w-4 h-4" />
                          {t("BlockUser") || "Bloquer"}
                        </Button>
                      )}
                      {!isSuperAdmin && (
                        <Button
                          type="button"

                          onClick={() => {
                            onArchiveUser && onArchiveUser(user);
                            setOpenDropdownId(null);
                          }}
                          className="action-menu-item action-menu-item-purple"
                          role="menuitem"
                        >
                          <FiArchive className="w-4 h-4" />
                          {t("ArchiveUser") || "Archiver"}
                        </Button>
                      )}
                      {isSuspended ? (
                        <Button
                          type="button"

                          onClick={() => {
                            onReactivateUser && onReactivateUser(user);
                            setOpenDropdownId(null);
                          }}
                          className="action-menu-item action-menu-item-success"
                          role="menuitem"
                        >
                          <FiPower className="w-4 h-4" />
                          {t("ReactivateUser") || "RÃ©activer"}
                        </Button>
                      ) : (
                        <Button
                          type="button"

                          onClick={() => {
                            onSuspendUser && onSuspendUser(user);
                            setOpenDropdownId(null);
                          }}
                          className="action-menu-item action-menu-item-warning"
                          role="menuitem"
                        >
                          <FiShieldOff className="w-4 h-4" />
                          {t("SuspendUser") || "Suspendre"}
                        </Button>
                      )}
                      {isInvited && (
                        <Button
                          type="button"

                          onClick={() => {
                            onResendInvitation && onResendInvitation(user);
                            setOpenDropdownId(null);
                          }}
                          className="action-menu-item action-menu-item-info"
                          role="menuitem"
                        >
                          <FiUpload className="w-4 h-4" />
                          {t("ResendInvitation") || "Renvoyer l'invitation"}
                        </Button>

                      )}
                    </>
                  )}

                  {!isSuperAdmin && !isArchived && !isBlocked && (
                    <>
                      <div className="action-menu-divider" />
                      <Button
                        type="button"
                        onClick={() => {
                          onDeleteUser && onDeleteUser(user);
                          setOpenDropdownId(null);
                        }}
                        className="action-menu-item action-menu-item-danger"
                        role="menuitem"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        {t("Delete") || "Supprimer"}
                      </Button>
                    </>

                  )}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {user[col] !== undefined ? String(user[col]) : "â€”"}

          </span>
        );
    }
  };

  const visibleColumns = columns
    ? columns.filter((c) => c.visible).map((c) => c.key)
    : ["name", "email", "phone", "userType", "platformRole", "status", "twoFactorEnabled", "lastLogin", "createdAt", "actions"];

  return (
    <>
      <TableBody className="bg-white dark:bg-gray-800">
        {users.map((user) => {
          const isUserSelected = selected.includes(user._id);

          return (
            <TableRow
              key={user._id}
              className={classnames(
                "users-table-row cursor-pointer transition-colors",
                isUserSelected && "users-table-row-selected"
              )}
              onContextMenu={(e) => handleContextMenu(e, user)}
              onClick={() => onViewUser && onViewUser(user)}
            >
              <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isUserSelected}
                  onChange={() => toggleSelection && toggleSelection(user._id)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  aria-label={`${t("SelectUser") || "Select user"} ${user.email || user.name || ""}`}
                />
              </TableCell>
              {visibleColumns.map((col) => (
                <TableCell key={col} className={col === "actions" ? "w-20 text-center" : ""}>
                  {renderColumn(col, user)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>

      {contextMenu &&
        createPortal(
          <ul
            className="action-menu"
            style={{
              position: "absolute",
              top: contextMenu.position.top,
              left: contextMenu.position.left,
              minWidth: "14rem",
            }}
            role="menu"
          >
            <li className="action-menu-header">
              {t("Actions") || "Actions"}
            </li>
            <li>
              <Button
                type="button"

                onClick={() => {
                  onViewUser && onViewUser(contextMenu.user);
                  closeContextMenu();
                }}
                className="action-menu-item action-menu-item-info"
                role="menuitem"
              >
                <FiEye className="w-4 h-4" />
                {t("ViewDetails") || "Voir les dÃ©tails"}
              </Button>
            </li>
            <li>
              <Button
                type="button"

                onClick={() => {
                  onEditUser && onEditUser(contextMenu.user);
                  closeContextMenu();
                }}
                className="action-menu-item action-menu-item-info"
                role="menuitem"
              >
                <FiEdit className="w-4 h-4" />
                {t("Edit") || "Modifier"}
              </Button>

            </li>
            <li className="action-menu-divider" />
            {!contextMenu.user.isSuperAdmin && !contextMenu.user.isArchived && (
              <li>
                <Button
                  type="button"

                  onClick={() => {
                    onDeleteUser && onDeleteUser(contextMenu.user);
                    closeContextMenu();
                  }}
                  className="action-menu-item action-menu-item-danger"
                  role="menuitem"
                >
                  <FiTrash2 className="w-4 h-4" />
                  {t("Delete") || "Supprimer"}
                </Button>

              </li>
            )}
          </ul>,
          document.body
      )}
    </>
  );
};

export default UsersTable;
