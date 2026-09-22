import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiX, FiMail, FiPhone, FiMapPin, FiShield, FiLock, FiCalendar, FiShoppingBag, FiDollarSign, FiPackage } from "react-icons/fi";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";
import formatMoney from "@/utils/formatMoney";
import { Button } from "@sofia/ui";

const USER_TYPE_CONFIG = {
  superadmin: { label: "SuperAdmin", className: "badge-superadmin" },
  store_admin: { label: "Store Admin", className: "badge-store-admin" },
  staff: { label: "Staff", className: "badge-staff" },
  customer: { label: "Customer", className: "badge-customer" },
  platform_admin: { label: "Platform Admin", className: "badge-store-admin" },
};

const getStatusBadge = (status) => {
  switch (status) {
    case "Active":
      return { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    case "Inactive":
      return { label: "Inactive", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
    case "Suspended":
      return { label: "Suspended", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" };
    case "PendingActivation":
      return { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
    case "Invited":
      return { label: "Invited", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
    default:
      return { label: status || "Unknown", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
  }
};

const SuperAdminFields = ({ user }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-2 text-sm">
        <FiShield className="text-purple-500" />
        <span className="text-gray-500 dark:text-gray-400">Permissions:</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {user.permissions?.length || 0} permissions
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <FiLock className="text-blue-500" />
        <span className="text-gray-500 dark:text-gray-400">2FA:</span>
        <span className={`font-medium ${user.twoFactorEnabled ? "text-green-600" : "text-gray-400"}`}>
          {user.twoFactorEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>
    </div>
    {user.permissions && user.permissions.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</h4>
        <div className="flex flex-wrap gap-1">
          {user.permissions.map((perm, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
              {perm}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const StoreAdminFields = ({ user }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-sm">
      <FiShoppingBag className="text-blue-500" />
      <span className="text-gray-500 dark:text-gray-400">Store:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {user.storeIds?.[0]?.name || "â€”"}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <FiShield className="text-emerald-500" />
      <span className="text-gray-500 dark:text-gray-400">Role:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {toRoleArray(user?.role).map((r) => resolveRoleName(r, [])).filter(Boolean).join(", ") || "â€”"}
      </span>
    </div>
  </div>
);

const StaffFields = ({ user }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-sm">
      <FiShoppingBag className="text-blue-500" />
      <span className="text-gray-500 dark:text-gray-400">Store:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {user.storeIds?.[0]?.name || "â€”"}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <FiShield className="text-emerald-500" />
      <span className="text-gray-500 dark:text-gray-400">Role:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {toRoleArray(user?.role).map((r) => resolveRoleName(r, [])).filter(Boolean).join(", ") || "â€”"}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 dark:text-gray-400">Department:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {user.department || "â€”"}
      </span>
    </div>
  </div>
);

const CustomerFields = ({ user }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-sm">
      <FiShoppingBag className="text-blue-500" />
      <span className="text-gray-500 dark:text-gray-400">Store:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {user.storeIds?.[0]?.name || "â€”"}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <FiPackage className="text-emerald-500" />
      <span className="text-gray-500 dark:text-gray-400">Orders:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {user.orders?.length || 0}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <FiDollarSign className="text-amber-500" />
      <span className="text-gray-500 dark:text-gray-400">Total Spent:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {formatMoney(user.totalSpent, "EUR")}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <FiCalendar className="text-gray-400" />
      <span className="text-gray-500 dark:text-gray-400">Join Date:</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "â€”"}
      </span>
    </div>
  </div>
);

const renderUserTypeFields = (userType, user) => {
  switch (userType) {
    case "superadmin":
      return <SuperAdminFields user={user} />;
    case "store_admin":
      return <StoreAdminFields user={user} />;
    case "staff":
      return <StaffFields user={user} />;
    case "customer":
      return <CustomerFields user={user} />;
    default:
      return null;
  }
};

const StaffDetailModal = ({ user, isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!user) return null;

  const userTypeConfig = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.customer;
  const statusBadge = getStatusBadge(user.status);
  const roles = toRoleArray(user?.role);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="superadmin-detail-modal"
    >
      <ModalBody className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("UserDetails")}
          </h2>
          <Button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={20} />
          </Button>
        </div>

        {/* User Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
            {user.image ? (
              <img src={user.image} alt={user.firstName || user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                {(user.firstName || user.name || user.email)?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.displayName || user.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userTypeConfig.className}`}>
                {t(userTypeConfig.label) || userTypeConfig.label}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                {t(statusBadge.label) || statusBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <FiMail className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("Email")}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FiPhone className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("Phone")}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user.phone || "â€”"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FiMapPin className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("Address")}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user.address || "â€”"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FiCalendar className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("CreatedAt")}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {user.createdAt ? new Date(user.createdAt).toLocaleString() : "â€”"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FiCalendar className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("LastLogin")}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : t("Never")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FiLock className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("TwoFA")}:</span>
            <span className={`font-medium ${user.twoFactorEnabled ? "text-green-600" : "text-gray-400"}`}>
              {user.twoFactorEnabled ? t("Enabled") : t("Disabled")}
            </span>
          </div>
        </div>

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("Roles")}</h4>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((roleItem, idx) => (
                <span
                  key={typeof roleItem === "string" ? roleItem : roleItem?._id ?? idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  {resolveRoleName(roleItem, [])}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User Type Specific Fields */}
        {renderUserTypeFields(user.userType, user)}
      </ModalBody>

      <ModalFooter className="justify-end gap-2">
        <Button onClick={onClose} layout="outline" className="w-28 justify-center text-sm">
          {t("Close")}
        </Button>
        <Button
          onClick={() => {
            onClose();
            window.location.href = `/platform/users/${user._id}`;
          }}
          className="w-28 justify-center bg-emerald-700 text-sm hover:bg-emerald-800"
        >
          {t("ViewFullDetails")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StaffDetailModal;