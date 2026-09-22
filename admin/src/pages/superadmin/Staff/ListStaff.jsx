import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardBody, Input, Badge } from "@windmill/react-ui";
import {
  FiUsers,
  FiShield,
  FiShoppingBag,
  FiUserCheck,
  FiSearch,
  FiEye,
  FiShieldOff,
  FiPower,
  FiLock,
  FiTrash2,
  FiPlus,
  FiCheck,
  FiX,
} from "react-icons/fi";
import PageTitle from "@/components/Typography/PageTitle";
import CTabSwitcher from "@/components/ui/CTabSwitcher";
import StaffTable from "@/components/superadmin/tables/StaffTable";
import StaffDetailModal from "@/components/superadmin/modals/StaffDetailModal";
import ConfirmActionModal from "@/components/superadmin/modals/ConfirmActionModal";
import CreateStaffDrawer from "@/components/drawer/CreateStaffDrawer";
import platformAPI from "@/services/api/platformAPI";
import { useDispatch, useSelector } from "react-redux";
import { setFilters } from "@/reduxStore/slice/usersSlice";
import { CButton } from "@/components/ui";
import { notifySuccess, notifyError } from "@/utils/toast";
import AnimatedContent from "@/components/common/AnimatedContent";

const USER_TYPE_TABS = [
  { value: "all", label: "All Staff", icon: FiUsers },
  { value: "superadmin", label: "Super Admin", icon: FiShield },
  { value: "platform_admin", label: "Platform Admin", icon: FiShoppingBag },
];

const ListStaff = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { filters } = useSelector((state) => state.users);
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchUsers = useCallback(
    async ({ queryKey }) => {
      const [, userType, page, limit, search] = queryKey;
      const params = { page, limit };
      if (userType && userType !== "all") {
        params.userType = userType;
      }
      if (search) {
        params.search = search;
      }
      const response = await platformAPI.getStaffList(params);
      if (import.meta.env.DEV) {
        console.log("[ListStaff] fetchUsers response:", response);
      }
      return response;
    },
    []
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["platformUsers", activeTab, page, 25, debouncedSearch],
    queryFn: fetchUsers,
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });

  const apiResponse = data || {};
  const users = Array.isArray(apiResponse?.data) ? apiResponse.data : [];
  const paginationData = apiResponse?.pagination || { total: 0, page: 1, limit: 25, pages: 1 };
  const serverStats = apiResponse?.stats;

  useEffect(() => {
    const pages = paginationData?.pages || 1;
    if (!isLoading && page > pages) {
      setPage(pages);
    }
  }, [data, isLoading, page, paginationData]);

  if (import.meta.env.DEV) {
    console.log("[ListStaff] raw data:", data, "users:", users, "pagination:", paginationData, "error:", error);
  }

  const stats = useMemo(() => {
    if (serverStats) return serverStats;
    const total = paginationData.total || 0;
    const active = users.filter((u) => u.status === "Active").length;
    const suspended = users.filter((u) => u.status === "Suspended").length;
    const pending = users.filter((u) => u.status === "PendingActivation" || u.status === "Invited").length;
    const superAdmins = users.filter((u) => u.isSuperAdmin).length;
    return { total, active, suspended, pending, superAdmins };
  }, [users, paginationData.total, serverStats]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setPage(1);
    dispatch(setFilters({ userType: value === "all" ? "" : value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
  };

  const openActionModal = (user, type) => {
    setActionUser(user);
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const handleActionConfirm = async (type, payload) => {
    if (!actionUser) return;
    setIsSubmitting(true);
    try {
      switch (type) {
        case "suspend":
          await platformAPI.suspendUser(actionUser._id, { reason: payload.reason || "Suspended by administrator" });
          notifySuccess(t("UserSuspendedSuccess"));
          break;
        case "reactivate":
          await platformAPI.reactivateUser(actionUser._id);
          notifySuccess(t("UserReactivatedSuccess"));
          break;
        case "delete":
          await platformAPI.deleteUser(actionUser._id);
          notifySuccess(t("UserDeletedSuccess"));
          break;
        case "reset_password":
          await platformAPI.resetPassword(actionUser._id);
          notifySuccess(t("PasswordResetSent"));
          break;
        case "approve_staff":
          await platformAPI.reactivateUser(actionUser._id);
          notifySuccess(t("StaffApprovedSuccess") || "Staff member approved successfully");
          break;
        case "reject_staff":
          await platformAPI.suspendUser(actionUser._id, { reason: payload.reason || "Rejected by administrator" });
          notifySuccess(t("StaffRejectedSuccess") || "Staff member rejected successfully");
          break;
        default:
          break;
      }
      refetch();
      setIsActionModalOpen(false);
      setActionUser(null);
      setActionType(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || t("ErrorLoadingUsers"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendUser = (user) => openActionModal(user, "suspend");
  const handleReactivateUser = (user) => openActionModal(user, "reactivate");
  const handleDeleteUser = (user) => openActionModal(user, "delete");
  const handleResetPassword = (user) => openActionModal(user, "reset_password");
  const handleApproveUser = (user) => openActionModal(user, "approve_staff");
  const handleRejectUser = (user) => openActionModal(user, "reject_staff");

  const handleCreateStaff = async (payload) => {
    setIsSubmitting(true);
    try {
      await platformAPI.createUser(payload);
      notifySuccess(t("StaffCreatedSuccess") || "Staff member created successfully");
      refetch();
      setIsCreateDrawerOpen(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || t("ErrorCreatingStaff") || "Failed to create staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabCounts = [
    { value: "all", label: "All Staff", icon: FiUsers, count: paginationData.total },
    { value: "superadmin", label: "Super Admin", icon: FiShield, count: null },
    { value: "platform_admin", label: "Platform Admin", icon: FiShoppingBag, count: null },
  ];

  return (
    <div className="staff-list-page">
      <PageTitle>Platform Staff</PageTitle>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("TotalStaff") || "Total Staff"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <FiShield size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Active") || "Active"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
              <FiUserCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("PendingApproval") || "Pending Approval"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
              <FiShieldOff size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Suspended") || "Suspended"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.suspended}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters Card */}
      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 w-full sm:max-w-md">
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="search"
                    placeholder={t("SearchStaff") || "Search by name, email..."}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-4 pr-9"
                  />
                  <FiSearch className="absolute right-[10px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </form>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <CTabSwitcher
                  tabs={tabCounts.map((tab) => ({
                    value: tab.value,
                    label: tab.label,
                    icon: tab.icon,
                    count: tab.count,
                  }))}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                />
                <CButton
                  onClick={() => setIsCreateDrawerOpen(true)}
                  icon="plus"
                  className="hidden sm:inline-flex"
                >
                  {t("CreateStaff") || "Create Staff"}
                </CButton>
              </div>
            </div>
          </CardBody>
        </Card>
      </AnimatedContent>

      {/* Table Card */}
      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">
                {error?.response?.data?.message || error?.message || t("ErrorLoadingUsers")}
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <FiUsers className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchText ? t("NoSearchResults") || "No results found" : t("NoUsersFound")}
                </p>
                {searchText && (
                  <CButton
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSearchText("")}
                  >
                    {t("ClearSearch") || "Clear search"}
                  </CButton>
                )}
              </div>
            ) : (
              <StaffTable
                users={users}
                userType={activeTab}
                onViewUser={handleViewUser}
                onSuspendUser={handleSuspendUser}
                onReactivateUser={handleReactivateUser}
                onDeleteUser={handleDeleteUser}
                onResetPassword={handleResetPassword}
                onApproveUser={handleApproveUser}
                onRejectUser={handleRejectUser}
                pagination={paginationData}
                onPageChange={setPage}
              />
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      <StaffDetailModal
        user={selectedUser}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
      />

      <ConfirmActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setActionUser(null);
          setActionType(null);
        }}
        action={actionType}
        user={actionUser}
        isSubmitting={isSubmitting}
        onConfirm={handleActionConfirm}
      />

      <CreateStaffDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        isSubmitting={isSubmitting}
        onSubmit={handleCreateStaff}
      />
    </div>
  );
};

export default ListStaff;
