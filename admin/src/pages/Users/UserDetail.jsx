import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useHistory } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Select, Badge, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow, Textarea, Pagination } from "@windmill/react-ui";
import {
  FiArrowLeft,
  FiSave,
  FiShield,
  FiShieldOff,
  FiKey,
  FiLogOut,
  FiRefreshCw,
  FiActivity,
  FiUsers,
   FiTrash,
   FiLock,
   FiUnlock,
   FiArchive,
   FiRefreshCcw,
  FiRotateCcw,
  FiTrash2,
  FiPower,
  FiUserPlus,
  FiSend,
  FiUpload,
  FiMail,
  FiLogIn,
  FiShoppingBag,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import userAPI from "@/services/api/userAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import UserActivityTimeline from "@/components/superadmin/UserActivityTimeline";
import ConfirmActionModal from "@/components/superadmin/modals/ConfirmActionModal";
import { CButton, ConfirmAction, Button } from "@/components/ui";
import { Button } from "@sofia/ui";

const Tabs = ({ children, className = "" }) => <div className={`user-detail-tabs ${className}`}>{children}</div>;

const Tab = ({ children, selected, onSelect }) => (

  <Button
    type="button"
    variant={selected ? "primary" : "ghost"}
    size="sm"
    className={`user-detail-tab ${selected ? "user-detail-tab-active" : ""}`}
    onClick={onSelect}
  >
    {children}
  </Button>
);


const USER_TYPE_CONFIG = {
  superadmin: { label: "SuperAdmin", className: "badge-superadmin" },
  platform_admin: { label: "Platform Admin", className: "badge-platform-admin" },
  store_admin: { label: "Store Admin", className: "badge-store-admin" },
  staff: { label: "Staff", className: "badge-staff" },
  customer: { label: "Customer", className: "badge-customer" },
};

const getStatusBadge = (status) => {
  const map = {
    Active: { label: "Active", className: "status-active", icon: "âœ“" },
    Inactive: { label: "Inactive", className: "status-inactive", icon: "âŠ—" },
    Suspended: { label: "Suspended", className: "status-suspended", icon: "âš " },
    Blocked: { label: "Blocked", className: "status-blocked", icon: "ðŸš«" },
    Archived: { label: "Archived", className: "status-archived", icon: "ðŸ“¦" },
    Invited: { label: "Invited", className: "status-invited", icon: "âœ‰" },
    PendingActivation: { label: "PendingActivation", className: "status-pending", icon: "â€¦" },
    Draft: { label: "Draft", className: "status-draft", icon: "D" },
  };
  return map[status] || { label: status || "Unknown", className: "status-inactive", icon: "âŠ—" };
};

const TABS = ["general", "store-memberships", "activity", "sessions", "loginhistory", "security"];

const UserDetail = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const history = useHistory();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null,
    user: null,
  });

  const { data: userResp, isLoading } = useQuery({
    queryKey: ["platformUser", userId],
    queryFn: () => userAPI.getUserById(userId),
    enabled: !!userId,
  });

  const user = userResp?.data?.data || userResp?.data || null;

  const handleUpdate = async (updates) => {
    try {
      setIsSubmitting(true);
      await userAPI.updateUser(userId, updates);
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserUpdatedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async (reason) => {
    try {
      setIsSubmitting(true);
      await userAPI.suspendUser(user._id, reason || "Suspended by administrator");
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserSuspendedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleReactivate = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.reactivateUser(user._id);
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserReactivatedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleBlock = async (reason) => {
    try {
      setIsSubmitting(true);
      await userAPI.blockUser(user._id, { reason: reason || "Blocked by administrator" });
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserBlockedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleUnblock = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.unblockUser(user._id);
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserUnblockedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleArchive = async (reason) => {
    try {
      setIsSubmitting(true);
      await userAPI.archiveUser(user._id, { reason: reason || "Archived by administrator" });
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserArchivedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleUnarchive = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.unarchiveUser(user._id);
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserUnarchivedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleResetPassword = async (password) => {
    try {
      setIsSubmitting(true);
      await userAPI.resetPassword(user._id, password);
      queryClient.invalidateQueries(["platformUser", userId]);
      notifySuccess(t("PasswordResetSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleReset2FA = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.reset2FA(user._id);
      notifySuccess(t("TwoFAResetSuccess"));
      queryClient.invalidateQueries(["platformUser", userId]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.revokeSessions(user._id);
      notifySuccess(t("AllSessionsRevoked"));
      queryClient.invalidateQueries(["platformUser", userId]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.deleteUser(user._id);
      queryClient.invalidateQueries(["platformUsers"]);
      notifySuccess(t("UserDeletedSuccess"));
      history.push("/platform/users");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleImpersonate = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.impersonateUser(user._id);
      notifySuccess(t("ImpersonationTokenGenerated"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleResendInvitation = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.resendInvitation(user._id);
      notifySuccess(t("InvitationResentSuccess"));
      queryClient.invalidateQueries(["platformUser", userId]);
      queryClient.invalidateQueries(["platformUsers"]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleForcePasswordChange = async (password) => {
    try {
      setIsSubmitting(true);
      await userAPI.forcePasswordChange(user._id, password);
      notifySuccess(password ? t("PasswordChangedSuccess") : t("ForcePasswordChangeSuccess"));
      queryClient.invalidateQueries(["platformUser", userId]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const handleSendSetupEmail = async () => {
    try {
      setIsSubmitting(true);
      await userAPI.sendSetupEmail(user._id);
      notifySuccess(t("SetupEmailSentSuccess"));
      queryClient.invalidateQueries(["platformUser", userId]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ isOpen: false, action: null, user: null });
    }
  };

  const openConfirm = (action) => {
    setConfirmModal({ isOpen: true, action, user });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false, action: null, user: null });
  };

  const handleConfirm = (action, payload) => {
    const { reason, password } = payload;
    if (action === "suspend") handleSuspend(reason);
    else if (action === "reactivate") handleReactivate();
    else if (action === "block") handleBlock(reason);
    else if (action === "unblock") handleUnblock();
    else if (action === "archive") handleArchive(reason);
    else if (action === "unarchive") handleUnarchive();
    else if (action === "reset_password") handleResetPassword(password);
    else if (action === "reset_2fa") handleReset2FA();
    else if (action === "logout_all_devices") handleLogoutAllDevices();
    else if (action === "delete") handleDelete();
    else if (action === "impersonate") handleImpersonate();
    else if (action === "resend_invitation") handleResendInvitation();
    else if (action === "force_password_change") handleForcePasswordChange(password);
    else if (action === "send_setup_email") handleSendSetupEmail();
  };

  const statusBadge = user ? getStatusBadge(user.status) : null;
  const userTypeConfig = user ? USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.customer : null;

  const statusActionEnabled = !user?.isSuperAdmin && user?.status !== "Archived";

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <NotFound title={t("UserNotFound")} />;
  }

  return (
    <div className="mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <CButton
          icon="arrow-left"
          variant="outline"
          onClick={() => history.push("/platform/users")}
          size="sm"
        >
          {t("Back")}
        </CButton>
        <div>
          <PageTitle>{t("UserDetails")}</PageTitle>
        </div>
      </div>

      {/* User Header Card */}
      <Card className="user-detail-header shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mb-6">
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="user-detail-avatar w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-md flex-shrink-0">
              {user.image ? (
                <img src={user.image} alt={user.firstName || user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-gray-600 dark:text-gray-300">
                  {(user.firstName || user.name || user.email)?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.displayName || user.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userTypeConfig.className}`}
                  >
                    {t(userTypeConfig.label) || userTypeConfig.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                  >
                    <span className={`status-dot ${statusBadge.dotClass}`}></span>
                    {t(statusBadge.label) || statusBadge.label}
                  </span>
                  {user.twoFactorEnabled && (
                    <Badge type="success" className="text-xs">
                      {t("TwoFAEnabled")}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1 truncate">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CButton
                size="sm"
                variant="outline"
                onClick={() => history.push(`/platform/users/${user._id}/edit`)}
                icon="save"
              >
                {t("Edit")}
              </CButton>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <Tab selected={activeTab === "general"} onSelect={() => setActiveTab("general")}>
          <FiSave className="mr-2" />
          {t("General")}
        </Tab>
        <Tab selected={activeTab === "store-memberships"} onSelect={() => setActiveTab("store-memberships")}>
          <FiShoppingBag className="mr-2" />
          {t("StoreMemberships")}
        </Tab>
        <Tab selected={activeTab === "activity"} onSelect={() => setActiveTab("activity")}>
          <FiActivity className="mr-2" />
          {t("Activity")}
        </Tab>
        <Tab selected={activeTab === "sessions"} onSelect={() => setActiveTab("sessions")}>
          <FiUsers className="mr-2" />
          {t("Sessions")}
        </Tab>
        <Tab selected={activeTab === "loginhistory"} onSelect={() => setActiveTab("loginhistory")}>
          <FiLogIn className="mr-2" />
          {t("LoginHistory")}
        </Tab>
        <Tab selected={activeTab === "security"} onSelect={() => setActiveTab("security")}>
          <FiShield className="mr-2" />
          {t("SecuritySettings")}
        </Tab>
      </Tabs>

      {/* Tab Content: General */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t("Profile") || "Profile"}
              </h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updates = {
                    firstName: formData.get("firstName"),
                    lastName: formData.get("lastName"),
                    displayName: `${formData.get("firstName")} ${formData.get("lastName")}`.trim(),
                    phone: formData.get("phone"),
                    status: formData.get("status"),
                    department: formData.get("department"),
                  };
                  await handleUpdate(updates);
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("FirstName")}
                    </label>
                    <Input
                      name="firstName"
                      defaultValue={user.firstName || user.name?.split(" ")[0] || ""}
                      required
                      disabled={isSubmitting}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("LastName")}
                    </label>
                    <Input
                      name="lastName"
                      defaultValue={user.lastName || user.name?.split(" ").slice(1).join(" ") || ""}
                      required
                      disabled={isSubmitting}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("Email")}
                    </label>
                    <Input
                      name="email"
                      type="email"
                      defaultValue={user.email || ""}
                      disabled
                      className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("Phone")}
                    </label>
                    <Input
                      name="phone"
                      defaultValue={user.phone || ""}
                      disabled={isSubmitting}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("Status")}
                    </label>
                    <Select
                      name="status"
                      defaultValue={user.status || "Active"}
                      disabled={user.isSuperAdmin || isSubmitting}
                      className="bg-gray-50 dark:bg-gray-700"
                    >
                      <option value="Active">{t("Active")}</option>
                      <option value="Inactive">{t("Inactive")}</option>
                      <option value="Suspended">{t("Suspended")}</option>
                      <option value="Blocked">{t("Blocked")}</option>
                      <option value="Archived">{t("Archived")}</option>
                      <option value="Invited">{t("Invited")}</option>
                      <option value="PendingActivation">{t("PendingActivation")}</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("Department")}
                    </label>
                    <Input
                      name="department"
                      defaultValue={user.department || ""}
                      disabled={isSubmitting}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <CButton type="submit" icon="save" loading={isSubmitting}>
                    {t("SaveChanges")}
                  </CButton>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t("PlatformAccess")}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t("PlatformRoles") || "Platform Roles"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(user.platformRoles || []).length > 0 ? user.platformRoles.map((role) => (
                    <Badge key={role._id || role.slug} type="info">{role.name || role.slug}</Badge>
                  )) : <span className="text-sm text-gray-500 dark:text-gray-400">{t("NoPlatformRoles")}</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t("PlatformPermissions") || "Platform Permissions"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(user.platformPermissions || []).length > 0 ? user.platformPermissions.map((permission) => (
                    <span key={permission._id || permission.code} className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 font-mono">
                      {permission.code}
                    </span>
                  )) : <span className="text-sm text-gray-500 dark:text-gray-400">{t("NoPlatformPermissions")}</span>}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab Content: Store Memberships */}
      {activeTab === "store-memberships" && (
        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardBody className="p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t("StoreMemberships")}
            </h3>
            {!user?.storeMemberships || user.storeMemberships.length === 0 ? (
              <div className="text-center py-8">
                <FiShoppingBag className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoStoreMemberships")}</p>
              </div>
            ) : (
              <TableContainer className="rounded-lg border border-gray-200 dark:border-gray-700">
                <Table>
                  <TableHeader>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <TableCell>{t("Store")}</TableCell>
                      <TableCell>{t("Role")}</TableCell>
                      <TableCell>{t("Status")}</TableCell>
                      <TableCell>{t("Scope")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {user.storeMemberships.map((membership) => (
                      <TableRow key={membership.storeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <TableCell>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {membership.storeName || membership.storeId}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {membership.storeSlug || ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {membership.roleName || "â€”"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {membership.roleSlug || ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            membership.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : membership.status === "suspended"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}>
                            {membership.status || "active"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {membership.roleScope || "store"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Activity */}
      {activeTab === "activity" && (
        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardBody className="p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t("UserActivity")}
            </h3>
            <UserActivityWrapper userId={userId} />
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Sessions */}
      {activeTab === "sessions" && (
        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("ActiveSessions")}
              </h3>
              <CButton
                size="sm"
                variant="danger"
                onClick={handleLogoutAllDevices}
                disabled={isSubmitting}
                icon="logout"
              >
                {t("LogoutAllDevices")}
              </CButton>
            </div>
            <SessionList userId={userId} />
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Login History */}
      {activeTab === "loginhistory" && (
        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardBody className="p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t("LoginHistory")}
            </h3>
            <LoginHistoryList userId={userId} />
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Security */}
      {activeTab === "security" && (
        <div className="space-y-5">
          {/* 2FA Section */}
          <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <FiShield size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t("TwoFactorAuthentication")}
                    </h4>
                    <Badge type={user.twoFactorEnabled ? "success" : "warning"}>
                      {user.twoFactorEnabled ? t("Enabled") : t("Disabled")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.twoFactorEnabled ? t("TwoFAEnabledDesc") : t("TwoFADisabledDesc")}
                  </p>
                  {user.twoFactorEnabled && (
                    <div className="mt-3">
                      <CButton
                        size="sm"
                        variant="outline"
                        onClick={() => openConfirm("reset_2fa")}
                        disabled={isSubmitting || user.isSuperAdmin}
                        icon="refresh"
                      >
                        {t("Reset2FA")}
                      </CButton>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Password Section */}
          <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <FiKey size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t("PasswordManagement")}
                    </h4>
                    {user.forcePasswordChange && (
                      <Badge type="warning">{t("ForcePasswordChange")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("PasswordLastChanged", {
                      date: user.lastPasswordChange
                        ? new Date(user.lastPasswordChange).toLocaleDateString()
                        : t("Never"),
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CButton
                      size="sm"
                      variant="outline"
                      onClick={() => openConfirm("reset_password")}
                      disabled={isSubmitting || user.isSuperAdmin}
                      icon="key"
                    >
                      {t("ResetPassword")}
                    </CButton>
                    <CButton
                      size="sm"
                      variant="warning"
                      onClick={() => openConfirm("force_password_change")}
                      disabled={isSubmitting || user.isSuperAdmin}
                      icon="lock"
                    >
                      {t("ForcePasswordChange")}
                    </CButton>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Account Status */}
          <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                  user.status === "Suspended" || user.status === "Blocked"
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    : user.status === "Archived"
                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <FiShieldOff size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t("AccountStatus")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {user.status === "Suspended" ? (
                        <CButton
                          size="sm"
                          variant="success"
                          onClick={() => openConfirm("reactivate")}
                          disabled={isSubmitting}
                          icon="power"
                        >
                          {t("ReactivateUser")}
                        </CButton>
                      ) : user.status === "Blocked" ? (
                        <CButton
                          size="sm"
                          variant="success"
                          onClick={() => openConfirm("unblock")}
                          disabled={isSubmitting}
                          icon="unlock"
                        >
                          {t("UnblockUser")}
                        </CButton>
                      ) : user.status === "Archived" ? (
                        <CButton
                          size="sm"
                          variant="secondary"
                          onClick={() => openConfirm("unarchive")}
                          disabled={isSubmitting}
                          icon="rotate-ccw"
                        >
                          {t("UnarchiveUser")}
                        </CButton>
                      ) : user.status !== "Inactive" && statusActionEnabled ? (
                        <>
                          <CButton
                            size="sm"
                            variant="warning"
                            onClick={() => openConfirm("suspend")}
                            disabled={isSubmitting || user.isSuperAdmin}
                            icon="shield-off"
                          >
                            {t("SuspendUser")}
                          </CButton>
                          <CButton
                            size="sm"
                            variant="danger"
                            onClick={() => openConfirm("block")}
                            disabled={isSubmitting || user.isSuperAdmin}
                            icon="shield-off"
                          >
                            {t("BlockUser")}
                          </CButton>
                          <CButton
                            size="sm"
                            variant="secondary"
                            onClick={() => openConfirm("archive")}
                            disabled={isSubmitting || user.isSuperAdmin}
                            icon="archive"
                          >
                            {t("ArchiveUser")}
                          </CButton>
                        </>
                      ) : null}

                      {!user.isSuperAdmin && !user.isArchived && (
                        <CButton
                          size="sm"
                          variant="danger"
                          onClick={() => openConfirm("delete")}
                          disabled={isSubmitting}
                          icon="trash"
                        >
                          {t("DeleteUser")}
                        </CButton>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {user.suspendedReason && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{t("SuspensionReason")}:</span> {user.suspendedReason}
                      </p>
                    )}
                    {user.blockedReason && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{t("BlockReason")}:</span> {user.blockedReason}
                      </p>
                    )}
                    {user.archivedReason && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{t("ArchiveReason")}:</span> {user.archivedReason}
                      </p>
                    )}
                    {!user.suspendedReason && !user.blockedReason && !user.archivedReason && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {t("Active")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Invitation & Impersonation */}
          {(user.status === "Invited" || user.status === "PendingActivation") && (
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex-shrink-0">
                    <FiMail size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t("Invitation")}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {t("InvitationStatus", { status: user.status })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <CButton
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirm("resend_invitation")}
                          disabled={isSubmitting}
                          icon="upload"
                        >
                          {t("ResendInvitation")}
                        </CButton>
                        <CButton
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirm("send_setup_email")}
                          disabled={isSubmitting}
                          icon="send"
                        >
                          {t("SendSetupEmail")}
                        </CButton>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {!user.isSuperAdmin && user.status !== "Archived" && user.status !== "Blocked" && (
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <FiUserPlus size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t("ImpersonateUser")}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {t("ImpersonateUserDesc")}
                        </p>
                      </div>
                      <CButton
                        size="sm"
                        variant="secondary"
                        onClick={() => openConfirm("impersonate")}
                        disabled={isSubmitting}
                        icon="user-plus"
                      >
                        {t("Impersonate")}
                      </CButton>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        action={confirmModal.action}
        user={confirmModal.user}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

function UserActivityWrapper({ userId }) {
  const { t } = useTranslation();
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["userActivity", userId],
    queryFn: () => userAPI.getUserActivity(userId),
    enabled: !!userId,
  });

  const activities = activityData?.data?.data || activityData?.data || [];

  return <UserActivityTimeline activities={activities} isLoading={activityLoading} />;
};

function SessionList({ userId }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["userSessions", userId],
    queryFn: () => userAPI.getUserSessions(userId),
    enabled: !!userId,
  });

  const sessions = sessionsData?.data?.data || sessionsData?.data || [];

  if (sessionsLoading) {
    return <TableLoading row={3} col={5} />;
  }

  if (!sessions || sessions.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoActiveSessions")}</p>;
  }

  return (
    <TableContainer className="rounded-lg">
      <Table>
        <TableHeader>
          <tr>
            <TableCell>{t("Device")}</TableCell>
            <TableCell>{t("IPAddress")}</TableCell>
            <TableCell>{t("CreatedAt")}</TableCell>
            <TableCell>{t("LastActivity")}</TableCell>
            <TableCell className="text-center">{t("Actions")}</TableCell>
          </tr>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.sessionId}>
              <TableCell>{session.deviceName || t("UnknownDevice")}</TableCell>
              <TableCell>{session.ipAddress || "-"}</TableCell>
              <TableCell>
                {session.createdAt ? new Date(session.createdAt).toLocaleString() : "-"}
              </TableCell>
              <TableCell>
                {session.lastActivity ? new Date(session.lastActivity).toLocaleString() : "-"}
              </TableCell>
              <TableCell className="text-center">
                <CButton
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    try {
                      await userAPI.logoutDevice(userId, session.sessionId);
                      qc.invalidateQueries(["userSessions", userId]);
                      notifySuccess(t("SessionRevoked"));
                    } catch (err) {
                      notifyError(err?.response?.data?.message || err?.message);
                    }
                  }}
                >
                  {t("Logout")}
                </CButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

function LoginHistoryList({ userId }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["userLoginHistory", userId, page, limit],
    queryFn: () => userAPI.getUserLoginHistory(userId, { page, limit }),
    enabled: !!userId,
  });

  const entries = historyData?.data?.data || historyData?.data || [];
  const paginationData = historyData?.data?.pagination || { total: 0, page, limit, pages: 1 };

  if (historyLoading) {
    return <TableLoading row={5} col={5} />;
  }

  if (!entries || entries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoLoginHistory")}</p>;
  }

  return (
    <>
      <TableContainer className="rounded-lg">
        <Table>
          <TableHeader>
            <tr>
              <TableCell>{t("Status")}</TableCell>
              <TableCell>{t("IPAddress")}</TableCell>
              <TableCell>{t("Device")}</TableCell>
              <TableCell>{t("Browser")}</TableCell>
              <TableCell>{t("OS")}</TableCell>
              <TableCell>{t("Location")}</TableCell>
              <TableCell>{t("LoginAt")}</TableCell>
              <TableCell>{t("Duration")}</TableCell>
            </tr>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry._id}>
                <TableCell>
                  <Badge
                    type={
                      entry.status === "success"
                        ? "success"
                        : entry.status === "failed"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {entry.status}
                  </Badge>
                </TableCell>
                <TableCell>{entry.ipAddress || "-"}</TableCell>
                <TableCell>{entry.device || "-"}</TableCell>
                <TableCell>{entry.browser || "-"}</TableCell>
                <TableCell>{entry.os || "-"}</TableCell>
                <TableCell>{entry.country || entry.city || "-"}</TableCell>
                <TableCell>
                  {entry.loginAt ? new Date(entry.loginAt).toLocaleString() : "-"}
                </TableCell>
                <TableCell>
                  {entry.sessionDuration
                    ? `${Math.floor(entry.sessionDuration / 60000)}m`
                    : entry.logoutAt
                    ? t("Expired")
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {paginationData.pages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            totalResults={paginationData.total || 0}
            resultsPerPage={paginationData.limit || 10}
            onChange={(page) => setPage(page + 1)}
            label="Login history pagination"
          />
        </div>
      )}
    </>
  );
};

export default UserDetail;
