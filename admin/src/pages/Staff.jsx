import { Card, CardBody, Input, Select } from "@windmill/react-ui";

import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiDownload,
  FiUpload,
  FiUserPlus,
  FiSettings,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiShield,
  FiUsers,
  FiAlertTriangle,
  FiSliders,
  FiSearch,
  FiX,
  FiList,
  FiGrid,
} from "react-icons/fi";

//internal import

import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import useGetCData from "@/hooks/useGetCData";
import MainDrawer from "@/components/drawer/MainDrawer";
import StaffDrawer from "@/components/drawer/StaffDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import StaffCardGrid from "@/components/staff/StaffCardGrid";
import NotFound from "@/components/table/NotFound";
import ProfileViewDrawer from "@/components/drawer/ProfileViewDrawer";
import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import { StoreContext, useStoreContext } from "@/context/StoreContext";
import RoleServices from "@/services/RoleServices";
import UserServices from "@/services/UserServices";
import StoreServices from "@/services/StoreServices";
import AnimatedContent from "@/components/common/AnimatedContent";
import platformAPI from "@/services/api/platformAPI";
import { notifySuccess, notifyError } from "@/utils/toast";
import { renderStaffCell } from "@/components/staff/StaffTable";
import SortableDataTable from "@/components/tables/SortableDataTable";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import StaffDetailsModal from "@/components/modal/StaffDetailsModal";
import StatusChangeModal from "@/components/modal/StatusChangeModal";
import UserRolesInfoModal from "@/components/modal/UserRolesInfoModal";
import StaffActionsMenu from "@/components/staff/StaffActionsMenu";
import CBadge from "@/components/ui/CBadge";
import InvitationsPanel from "@/components/staff/InvitationsPanel";
import TeamsPanel from "@/components/staff/TeamsPanel";
import { Button } from "@sofia/ui";

const STAT_CARDS = [
  {
    key: "totalAdmins",
    icon: FiUsers,
    gradient: "from-blue-500 to-blue-600",
    soft: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    valueClass: "text-gray-900 dark:text-white",
  },
  {
    key: "active",
    icon: FiCheckCircle,
    gradient: "from-emerald-500 to-teal-600",
    soft: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    valueClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "blocked",
    icon: FiAlertTriangle,
    gradient: "from-red-500 to-rose-600",
    soft: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    valueClass: "text-red-600 dark:text-red-400",
  },
  {
    key: "pendingInvitation",
    icon: FiClock,
    gradient: "from-amber-500 to-orange-600",
    soft: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    valueClass: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "twoFactorEnabled",
    icon: FiShield,
    gradient: "from-indigo-500 to-violet-600",
    soft: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    valueClass: "text-indigo-600 dark:text-indigo-400",
  },
];

const STAT_LABEL_KEYS = {
  totalAdmins: "StatTotalAdmins",
  active: "StatActive",
  blocked: "StatBlocked",
  pendingInvitation: "StatPendingInvitation",
  twoFactorEnabled: "Stat2FAEnabled",
};

const Staff = () => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;
  const isSuperAdmin = adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin";
  const { toggleDrawer, lang, isUpdate } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const canCreateStaff = hasPermission("staff", "create");
  const { currentStoreId } = useStoreContext();

  const [activeTab, setActiveTab] = useState("members");

  const [staffData, setStaffData] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState("");
  const [staffKey, setStaffKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchStaff = async () => {
      setStaffLoading(true);
      setStaffError("");
      try {
        const res = isSuperAdmin
          ? await platformAPI.getAllUsers({ limit: 1000 })
          : await UserServices.getStaff();
        if (isMounted) {
          setStaffData(res);
          setStaffLoading(false);
        }
      } catch (err) {
        if (isMounted && err.name !== "AbortError") {
          setStaffError(err.message);
          setStaffLoading(false);
          setStaffData([]);
        }
      }
    };

    fetchStaff();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentStoreId, isSuperAdmin, staffKey, isUpdate]);

  const { data, loading, error } = {
    data: staffData,
    loading: staffLoading,
    error: staffError,
  };

  const { data: rolesData } = useAsync(() => RoleServices.getRoles());

  const roleOptions = Array.isArray(rolesData?.data) ? rolesData.data : [];

  const [selectedIds, setSelectedIds] = useState([]);
  const [profileStaff, setProfileStaff] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" &&
    window.localStorage.getItem("staffViewMode") === "cards"
      ? "cards"
      : "table"
  );
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    email: true,
    phone: true,
    department: true,
    role: true,
    twoFactorEnabled: false,
    status: true,
    storesManaged: false,
    lastLogin: true,
    lastActivity: false,
    createdAt: false,
    actions: true,
  });

  const visibleColumns = useMemo(() => {
    return Object.keys(columnVisibility).filter((key) => columnVisibility[key] !== false);
  }, [columnVisibility]);

  const handleVisibleColumnsChange = (newVisibleKeys) => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = newVisibleKeys.includes(key);
      });
      return next;
    });
  };

  const [statusFilter, setStatusFilter] = useState("");
  const [twoFactorFilter, setTwoFactorFilter] = useState("");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState("");

  const {
    title,
    serviceId,
    handleModalOpen,
    handleUpdate,
    isSubmitting,
  } = useToggleDrawer();

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [staffForRolesInfo, setStaffForRolesInfo] = useState(null);
  const [selectedStatusStaff, setSelectedStatusStaff] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const handleDetailsModalOpen = (staff) => {
    setSelectedStaff(staff);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setSelectedStaff(null);
    setIsDetailsModalOpen(false);
  };

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

  const {
    userRef,
    role,
    setRole,
    totalResults,
    resultsPerPage,
    dataTable,
    serviceData,
    handleChangePage,
    handleSubmitUser,
    handleSort,
    sortColumn,
    sortDirection,
  } = useFilter(data?.data, roleOptions);

  const { t } = useTranslation();

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Real calls against the store-scoped membership endpoints (SO-10-style:
  // storeId always comes from currentStoreId, never trusted from the
  // selection itself). Each of these used to just show a success toast with
  // no backend call at all â€” a Store Owner clicking "Suspend" believed it

  // worked while nothing happened.
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0 || !currentStoreId) return;

    const statusByAction = { activate: "active", suspend: "suspended" };

    try {
      if (action === "delete") {
        await Promise.all(
          selectedIds.map((userId) => StoreServices.removeStoreStaff(currentStoreId, userId))
        );
        notifySuccess(t("BulkDeleteSuccess", { count: selectedIds.length }));
      } else if (statusByAction[action]) {
        await Promise.all(
          selectedIds.map((userId) =>
            StoreServices.updateStoreStaffStatus(currentStoreId, userId, statusByAction[action])
          )
        );
        notifySuccess(
          action === "activate"
            ? t("BulkActivateSuccess", { count: selectedIds.length })
            : t("BulkSuspendSuccess", { count: selectedIds.length })
        );
      }
      setStaffKey((k) => k + 1);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }

    setSelectedIds([]);
  };

  const handleResetField = () => {
    setRole("");
    setStatusFilter("");
    setTwoFactorFilter("");
    setInvitationStatusFilter("");
    userRef.current.value = "";
  };

  const renderSortIcon = (column) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-1 inline-flex flex-col leading-none text-gray-300 dark:text-gray-600">
          <FiChevronUp className="-mb-0.5" size={10} />
          <FiChevronDown size={10} />
        </span>
      );
    }

    return sortDirection === "asc" ? (
      <FiChevronUp className="ml-1 text-emerald-500" size={12} />
    ) : (
      <FiChevronDown className="ml-1 text-emerald-500" size={12} />
    );
  };

  const sortableHeaderCells = [
    { column: "name", label: t("StaffNameTbl") },
    { column: "email", label: t("StaffEmailTbl") },
    { column: "phone", label: t("StaffContactTbl") },
    { column: "department", label: t("StaffDepartmentTbl") },
    { column: "role", label: t("StaffRoleTbl") },
    { column: "twoFactorEnabled", label: t("Staff2FATbl") },
    { column: "status", label: t("StaffStatusTbl") },
    { column: "storesManaged", label: t("StaffStoresTbl") },
    { column: "lastLogin", label: t("StaffLastLoginTbl") },
    { column: "lastActivity", label: t("StaffLastActivityTbl") },
    { column: "createdAt", label: t("StaffCreatedAtTbl") },
  ];

  const sortOptions = sortableHeaderCells.map(({ column, label }) => ({
    key: column,
    label,
  }));

  const visibleSortableHeaderCells = sortableHeaderCells.filter(
    ({ column }) => columnVisibility[column] !== false
  );

  const usersList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.users) ? data.users : [];

  const stats = useMemo(() => {
    const totalAdmins = usersList.length;
    const active = usersList.filter((u) => u.status === "Active").length;
    const blocked = usersList.filter((u) => u.status === "Blocked").length;
    const pendingInvitation = usersList.filter((u) => u.status === "Invited" || u.status === "PendingActivation").length;
    const twoFactorEnabled = usersList.filter((u) => u.twoFactorEnabled === true).length;

    return {
      totalAdmins,
      active,
      blocked,
      pendingInvitation,
      twoFactorEnabled,
    };
  }, [usersList]);

  const activeFilterCount = [statusFilter, twoFactorFilter, invitationStatusFilter].filter(Boolean).length;

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("staffViewMode", mode);
    }
  };

  const STATUS_OPTION_KEYS = {
    Active: "StatusActive",
    Pending: "StatusPending",
    Invited: "StatusInvited",
    Blocked: "StatusBlocked",
    Suspended: "StatusSuspended",
    Archived: "StatusArchived",
  };
  const TWO_FA_OPTION_KEYS = {
    true: "Filter2FAEnabled",
    false: "Filter2FADisabled",
  };
  const INVITATION_OPTION_KEYS = {
    not_invited: "FilterNotInvited",
    invited: "FilterInvited",
    accepted: "FilterAccepted",
    expired: "FilterExpired",
  };

  const activeFilterChips = [];
  if (role && role !== "All") {
    activeFilterChips.push({
      label: `${t("StaffRole")}: ${role}`,
      clear: () => setRole(""),
    });
  }
  if (statusFilter) {
    activeFilterChips.push({
      label: `${t("FilterStatus")}: ${t(STATUS_OPTION_KEYS[statusFilter] || statusFilter)}`,
      clear: () => setStatusFilter(""),
    });
  }
  if (twoFactorFilter) {
    activeFilterChips.push({
      label: `${t("Filter2FA")}: ${t(TWO_FA_OPTION_KEYS[twoFactorFilter] || twoFactorFilter)}`,
      clear: () => setTwoFactorFilter(""),
    });
  }
  if (invitationStatusFilter) {
    activeFilterChips.push({
      label: `${t("FilterInvitationStatus")}: ${t(INVITATION_OPTION_KEYS[invitationStatusFilter] || invitationStatusFilter)}`,
      clear: () => setInvitationStatusFilter(""),
    });
  }

  const selectedUsers = serviceData?.filter(s => selectedIds.includes(s._id)) || [];
  const hasStatus = (statusArr) => selectedUsers.some(u => statusArr.includes(u.status));
  const hasNotStatus = (statusArr) => selectedUsers.some(u => !statusArr.includes(u.status));

  // Trimmed to the three actions that actually have a backing store-scoped
  // endpoint (reactivate / suspend / remove) â€” the others used to be pure

  // toasts with no real effect (see handleBulkAction above).
  const bulkActions = [
    { action: "activate", labelKey: "BulkActivate", cls: "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/40", show: hasStatus(["Inactive", "Suspended"]) },
    { action: "suspend", labelKey: "BulkSuspend", cls: "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30", show: hasStatus(["Active", "Pending"]) },
    { action: "delete", labelKey: "BulkDelete", cls: "text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30", show: true },
  ];

  const iconActionClass =
    "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors duration-150";

  return (
    <>
      {/* Page header */}
      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t("StaffPageTitle")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("StatTotalAdminsDesc")} Â· {totalResults}

          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" title={t("QuickActionImport")} className={iconActionClass}>
            <FiUpload size={16} />
          </Button>
          <Button type="button" title={t("QuickActionExport")} className={iconActionClass}>
            <FiDownload size={16} />
          </Button>
          <Button type="button" title={t("QuickActionInviteAdmin")} className={iconActionClass}>
            <FiUserPlus size={16} />
          </Button>
          <Button type="button" title={t("QuickActionAssignRole")} className={iconActionClass}>
            <FiSettings size={16} />
          </Button>
          {canCreateStaff && (
            <Button
              onClick={toggleDrawer}
              className="h-10 px-4 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <FiPlus size={14} /> {t("QuickActionCreateAdmin")}
            </Button>
          )}
        </div>
      </div>

      {/* Team / Staff tabs: Members / Invitations / Teams â€” one screen,

          not three separate maintained pages (per the ticket's explicit
          "converge into a single experience" rule). */}
      <div className="mb-6 inline-flex overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 p-1">
        {[
          { key: "members", label: t("TabMembers", "Members") },
          { key: "invitations", label: t("TabInvitations", "Invitations") },
          { key: "teams", label: t("TabTeams", "Teams") },
        ].map((tab) => (
          <Button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
              activeTab === tab.key
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "invitations" && <InvitationsPanel roleOptions={roleOptions} />}
      {activeTab === "teams" && <TeamsPanel staffOptions={usersList} />}

      {activeTab === "members" && (
        <>
      <MainDrawer>
        <StaffDrawer id={serviceId} />
      </MainDrawer>

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

      {isProfileOpen && profileStaff && (
        <ProfileViewDrawer
          staff={profileStaff}
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setProfileStaff(null);
          }}
          roleOptions={roleOptions}
        />
      )}

      <AnimatedContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
          {STAT_CARDS.map(({ key, icon: Icon, soft }) => (
            <Card key={key} className="shadow-xs bg-white dark:bg-gray-800">
              <CardBody className="p-4 lg:p-5 flex items-center gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${soft}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t(STAT_LABEL_KEYS[key])}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats[key]}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Search & Filters */}
        <Card className="shadow-xs bg-white dark:bg-gray-800 mb-5">
          <CardBody className="p-4">
            <form onSubmit={handleSubmitUser}>
              {/* Primary row: search + role + actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-grow min-w-[220px]">
                  <FiSearch className="absolute right-[10px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <Input
                    ref={userRef}
                    type="search"
                    name="search"
                    placeholder={t("StaffSearchBy")}
                    className="pr-9 pl-3 h-10"
                  />
                </div>

                <div className="w-full sm:w-44">
                  <Select
                    onChange={(e) => setRole(e.target.value)}
                    value={role || "All"}
                    className="text-sm h-10"
                  >
                    <option value="All">{t("StaffRole")}</option>
                    {roleOptions.map((roleOption) => (
                    <option key={roleOption._id} value={roleOption.name}>
                      {roleOption.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* View toggle */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5">
                <Button
                  type="button"
                  title={t("StaffViewTable")}
                  onClick={() => handleViewModeChange("table")}
                  className={`inline-flex items-center justify-center w-9 h-10 rounded-md transition-colors duration-150 ${
                    viewMode === "table"
                      ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <FiList size={15} />
                </Button>
                <Button
                  type="button"
                  title={t("StaffViewCards")}
                  onClick={() => handleViewModeChange("cards")}
                  className={`inline-flex items-center justify-center w-9 h-10 rounded-md transition-colors duration-150 ${
                    viewMode === "cards"
                      ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <FiGrid size={15} />
                </Button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button type="submit" className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-sm font-medium shadow-sm">
                  {t("Filter")}
                </Button>
                <Button
                  type="button"
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors duration-150 ${
                    filterOpen || activeFilterCount > 0
                      ? "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                  }`}
                >
                  <FiFilter size={14} />
                  {t("Filters")}
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                  {filterOpen ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                </Button>
                {(activeFilterCount > 0 || (role && role !== "All")) && (
                  <Button
                    type="reset"
                    onClick={handleResetField}
                    title={t("Reset")}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700 transition-colors duration-150"
                  >
                    <FiX size={15} />
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced filters */}
            {filterOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Select
                  onChange={(e) => setStatusFilter(e.target.value)}
                  value={statusFilter}
                  className="text-sm h-10"
                >
                  <option value="" defaultValue hidden>
                    {t("FilterStatus")}
                  </option>
                  <option value="Active">{t("StatusActive")}</option>
                  <option value="Pending">{t("StatusPending")}</option>
                  <option value="Invited">{t("StatusInvited")}</option>
                  <option value="Blocked">{t("StatusBlocked")}</option>
                  <option value="Suspended">{t("StatusSuspended")}</option>
                  <option value="Archived">{t("StatusArchived")}</option>
                </Select>

                <Select
                  onChange={(e) => setTwoFactorFilter(e.target.value)}
                  value={twoFactorFilter}
                  className="text-sm h-10"
                >
                  <option value="" defaultValue hidden>
                    {t("Filter2FA")}
                  </option>
                  <option value="true">{t("Filter2FAEnabled")}</option>
                  <option value="false">{t("Filter2FADisabled")}</option>
                </Select>

                <Select
                  onChange={(e) => setInvitationStatusFilter(e.target.value)}
                  value={invitationStatusFilter}
                  className="text-sm h-10"
                >
                  <option value="" defaultValue hidden>
                    {t("FilterInvitationStatus")}
                  </option>
                  <option value="not_invited">{t("FilterNotInvited")}</option>
                  <option value="invited">{t("FilterInvited")}</option>
                  <option value="accepted">{t("FilterAccepted")}</option>
                  <option value="expired">{t("FilterExpired")}</option>
                </Select>
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterChips.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 pl-3 pr-1.5 py-1 text-xs font-medium"
                  >
                    {chip.label}
                    <Button
                      type="button"
                      onClick={chip.clear}
                      title={t("Reset")}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-emerald-500 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 transition-colors"
                    >
                      <FiX size={11} />
                    </Button>
                  </span>
                ))}
                <Button
                  type="button"
                  onClick={handleResetField}
                  className="text-xs font-medium text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  {t("StaffClearAllFilters")}
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
    </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={13} width={163} height={20} />
      ) : error ? (
        <div className="text-center py-12">
          <span className="text-red-500 text-sm">
            {error?.response?.data?.message || error?.message || String(error)}
          </span>
        </div>
      ) : serviceData?.length !== 0 ? (
        <>
          {/* Floating bulk actions bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[95vw]">
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-800/95 backdrop-blur px-4 py-3 shadow-2xl shadow-gray-900/10 dark:shadow-black/40">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mr-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    {selectedIds.length}
                  </span>
                  {t("BulkActions")}
                </span>
                {bulkActions.filter(action => action.show !== false).map(({ action, labelKey, cls }) => (
                  <Button
                    key={action}
                    onClick={() => handleBulkAction(action)}
                    className={`px-3 h-10 rounded-lg text-xs font-medium transition-colors ${cls}`}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
                <Button
                  onClick={() => setSelectedIds([])}
                  title={t("Reset")}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <FiX size={14} />
                </Button>
              </div>
            </div>
          )}

          {viewMode === "cards" ? (
            <>
              <StaffCardGrid
                staffs={dataTable}
                roleOptions={roleOptions}
                selectedIds={selectedIds}
                onSelectOne={handleSelectOne}
                onViewProfile={(staff) => {
                  setProfileStaff(staff);
                  setIsProfileOpen(true);
                }}
              />
              <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                <Pagination
                  totalResults={totalResults}
                  resultsPerPage={resultsPerPage}
                  onChange={handleChangePage}
                  label="Table navigation"
                />
              </div>
            </>
          ) : (
            <SortableDataTable
              columns={[
                ...sortableHeaderCells.map(({ column, label }) => ({
                  key: column,
                  header: label,
                  sortable: true,
                })),
                { key: "actions", header: "", sortable: false },
              ]}
              rows={dataTable}
              getRowKey={(row) => row._id}
              loading={staffLoading}
              loadingRows={12}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              sortOptions={sortOptions}
              rowClassName={(row) => selectedIds.includes(row._id) ? "bg-emerald-50/70 dark:bg-emerald-900/10" : ""}
              rowSelection={true}
              selectedRowKeys={selectedIds}
              onSelectionChange={(keys) => setSelectedIds(keys || [])}
              showSelectAll={true}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={handleVisibleColumnsChange}
              columnSelectorLabel="Visible fields"
              renderCell={({ row }) => {
                const ctx = {
                  t,
                  roleOptions,
                  selectedIds,
                  onSelectOne: handleSelectOne,
                  onViewProfile: (s) => { setProfileStaff(s); setIsProfileOpen(true); },
                  canUpdateStaff,
                  canDeleteStaff,
                  handleDetailsModalOpen,
                  handleStatusModalOpen,
                  setStaffForRolesInfo,
                  showDateFormat,
                };
                return {
                  ...visibleSortableHeaderCells.reduce((acc, { column }) => {
                    acc[column] = renderStaffCell(column, row, ctx);
                    return acc;
                  }, {}),
                  ...(columnVisibility.actions !== false ? {
                    actions: (
                      <div className="flex justify-center items-center">
                        <StaffActionsMenu
                          id={row._id}
                          isSubmitting={isSubmitting}
                          handleUpdate={(id) => handleUpdate(id)}
                          handleModalOpen={(id, title) => handleModalOpen(id, title)}
                          handleView={(staff) => { setProfileStaff(staff); setIsProfileOpen(true); }}
                          handleDetailsModalOpen={(staff) => handleDetailsModalOpen(staff)}
                          title={row?.name}
                          status={row?.status}
                          showEdit={canUpdateStaff}
                          showDelete={canDeleteStaff}
                        />
                      </div>
                    ),
                  } : {}),
                };
              }}
              pagination={{
                page: currentPage,
                total: totalResults,
                limit: resultsPerPage,
                onChange: handleChangePage,
              }}
            />
          )}
        </>
      ) : (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="py-12">
            <NotFound title={t("NoStaffFound") || "No staff found"} />
          </div>
        </div>
      )}
        </>
      )}
    </>
  );
};

export default Staff;
