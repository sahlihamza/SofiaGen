import { useState, useContext, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody } from "@windmill/react-ui";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { CButton, IconButton } from "@/components/ui";
import {
   FiMail,
  FiSearch,
  FiPlus,
  FiFilter,
  FiList,
  FiGrid,
  FiDownload,
  FiTrash2,
  FiShieldOff,
  FiPower,
  FiUpload,
  FiArchive,
  FiRotateCcw,
   FiChevronUp,
   FiChevronDown,
   FiUsers,
  FiShield,
  FiLock,
  FiUnlock,
  FiEye,
  FiEdit,
  FiMoreVertical,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import classnames from "classnames";

import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import platformAPI from "@/services/api/platformAPI";
import userAPI from "@/services/api/userAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";


import UserFilterPanel from "@/components/superadmin/filters/UserFilterPanel";
import UserCard from "@/components/superadmin/cards/UserCard";
import MainDrawer from "@/components/drawer/MainDrawer";
import CreateUserDrawer from "@/components/drawer/CreateUserDrawer";
import EditUserDrawer from "@/components/drawer/EditUserDrawer";
import BulkActionModal from "@/components/superadmin/modals/BulkActionModal";
import { SidebarContext } from "@/context/SidebarContext";
import { Button } from "@sofia/ui";

const SORTABLE_COLUMNS = [
  { column: "name", label: "Name" },
  { column: "email", label: "Email" },
  { column: "status", label: "Status" },
  { column: "lastLogin", label: "LastLogin" },
  { column: "createdAt", label: "CreatedAt" },
];

const ALL_STATUSES = ["Active", "Inactive", "Suspended", "Blocked", "Archived", "Invited", "PendingActivation"];

const UsersList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { toggleDrawer } = useContext(SidebarContext);

  const usersState = useSelector((state) => state.users) || {};
  const {
    selected,
    filters,
    sort = { field: "createdAt", direction: "desc" },
    pagination = { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1 },
    viewMode,
    rowsPerPage = DEFAULT_PAGE_SIZE,
    columns,
  } = usersState;

  const safeSelected = Array.isArray(selected) ? selected : [];
  const [searchText, setSearchText] = useState(filters?.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters?.search || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const allUserTypes = ["superadmin", "platform_admin", "store_admin", "staff", "customer"];
  const allStatuses = ALL_STATUSES;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest(".context-menu")) {
        setContextMenu(null);
      }
      if (openDropdownId && !e.target.closest(".action-dropdown")) {
        setOpenDropdownId(null);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setContextMenu(null);
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

  const listQueryKey = ["platformUsers", pagination.page, rowsPerPage, debouncedSearch, filters, sort];

  const hasActiveFilters = useMemo(() => {
    return (
      (filters?.userType && filters.userType.length > 0) ||
      (filters?.status && filters.status.length > 0) ||
      (filters?.twoFactorEnabled !== null && filters.twoFactorEnabled !== undefined) ||
      (filters?.teamId && filters.teamId.length > 0) ||
      (filters?.department && filters.department.length > 0) ||
      (filters?.storeIds && filters.storeIds.length > 0) ||
      (filters?.roleIds && filters.roleIds.length > 0) ||
      debouncedSearch
    );
  }, [filters, debouncedSearch]);

  const updateUsersCache = (updater) => {
    queryClient.setQueryData(listQueryKey, (oldData) => {
      if (!oldData) return oldData;
      const users = oldData.data?.data || oldData.data || oldData;
      const updatedUsers = updater(users);
      if (oldData.data) {
        return { ...oldData, data: { ...oldData.data, data: updatedUsers } };
      }
      return updatedUsers;
    });
  };

  const removeUserFromCache = (userId) => {
    queryClient.setQueryData(listQueryKey, (oldData) => {
      if (!oldData) return oldData;
      const users = oldData.data?.data || oldData.data || oldData;
      const updatedUsers = users.filter((u) => u._id !== userId);
      if (oldData.data) {
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: updatedUsers,
            pagination: {
              ...oldData.data.pagination,
              total: Math.max(0, (oldData.data.pagination?.total || 0) - 1),
            },
          },
        };
      }
      return updatedUsers;
    });
  };

  const buildQueryParams = () => {
    const params = {
      page: pagination?.page || 1,
      limit: rowsPerPage || DEFAULT_PAGE_SIZE,
      search: debouncedSearch,
    };

    const selectedUserTypes = filters.userType;
    const selectedStatuses = filters.status;
    if (selectedUserTypes && selectedUserTypes.length > 0) {
      params.userType = selectedUserTypes;
    }
    if (selectedStatuses && selectedStatuses.length > 0) {
      params.status = selectedStatuses;
    }
    if (filters.twoFactorEnabled !== null && filters.twoFactorEnabled !== undefined) {
      params.twoFactorEnabled = filters.twoFactorEnabled;
    }
    if (filters.twoFactorVerified !== null && filters.twoFactorVerified !== undefined) {
      params.twoFactorVerified = filters.twoFactorVerified;
    }
    if (filters.forcePasswordChange !== null && filters.forcePasswordChange !== undefined) {
      params.forcePasswordChange = filters.forcePasswordChange;
    }
    if (filters.platformOnly !== undefined) {
      params.platformOnly = filters.platformOnly;
    }
    if (filters.teamId) {
      params.teamId = filters.teamId;
    }
    if (filters.department) {
      params.department = filters.department;
    }
    if (filters.storeIds && filters.storeIds.length > 0) {
      params.storeIds = filters.storeIds;
    }
    if (filters.roleIds && filters.roleIds.length > 0) {
      params.roleIds = filters.roleIds;
    }
    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom.toISOString();
    }
    if (filters.dateTo) {
      params.dateTo = filters.dateTo.toISOString();
    }
    if (filters.lastLoginFrom) {
      params.lastLoginFrom = filters.lastLoginFrom.toISOString();
    }
    if (filters.lastLoginTo) {
      params.lastLoginTo = filters.lastLoginTo.toISOString();
    }

    if (sort?.field && sort.field !== "platformRole" && sort.field !== "storeCount") {
      params.sortBy = sort.field;
      params.sortOrder = sort.direction;
    }

    return params;
  };

  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      const params = buildQueryParams();
      return await userAPI.getAllUsers(params);
    },
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["platformRoles"],
    queryFn: async () => {
      return await platformAPI.getRoles({ limit: 100 });
    },
  });

  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      return await platformAPI.getAllStores({ limit: 100 });
    },
  });

  const users = usersData?.data?.data || usersData?.data || [];
  const paginationData = useMemo(
    () =>
      usersData?.data?.pagination ||
      usersData?.pagination ||
      { total: 0, page: 1, limit: rowsPerPage, pages: 1 },
    [usersData, rowsPerPage]
  );
  const serverStats = usersData?.data?.stats || usersData?.stats;

  useEffect(() => {
    dispatch({ type: "users/setPage", payload: 1 });
  }, [debouncedSearch]);

  // paginationData is rebuilt as a fresh object literal every render (see
  // its `||` fallback chain above), so depending on the object itself made
  // this effect re-run after every single render regardless of whether the
  // actual page count changed Ã¢â‚¬â€ combined with dispatching a page that
  // didn't clear the "too high" condition, that's exactly React's "Maximum
  // update depth exceeded" infinite-render-loop signature (confirmed: this
  // crashed /platform/users outright for a Super Admin). Depending on the
  // primitive `pages` number instead means the effect only re-fires when
  // the real page count actually changes, and the explicit
  // pagination.page !== pages guard means it can never re-dispatch the same
  // value twice in a row.
  const totalPages = Math.max(1, paginationData?.pages || 1);
  useEffect(() => {
    if (!isLoading && pagination.page > totalPages) {
      handlePageChange(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pagination.page, totalPages]);

  const stats = useMemo(() => {
    if (serverStats) return serverStats;
    const total = paginationData.total || users.length || 0;
    const active = users.filter((u) => u.status === "Active").length;
    const suspended = users.filter((u) => u.status === "Suspended").length;
    const blocked = users.filter((u) => u.status === "Blocked").length;
    return { total, active, suspended, blocked };
  }, [users, paginationData.total, serverStats]);

  const roleOptions = rolesData?.data?.data || rolesData?.data || [];
  const storeOptions = storesData?.data || [];
  const tableColumns = columns?.filter((column) => column.visible).map((column) => column.key) || [
    "name", "email", "phone", "userType", "platformRole", "status", "twoFactorEnabled", "lastLogin", "createdAt", "actions",
  ];
  const allColumnKeys = useMemo(() => columns?.map((c) => c.key) || tableColumns, [columns, tableColumns]);
  const visibleColumnKeys = useMemo(() => columns?.filter((c) => c.visible).map((c) => c.key) || tableColumns, [columns, tableColumns]);

  const handleVisibleColumnsChange = (newVisibleKeys) => {
    allColumnKeys.forEach((key) => {
      const shouldBeVisible = newVisibleKeys.includes(key);
      const currentlyVisible = columns?.find((c) => c.key === key)?.visible;
      if (shouldBeVisible !== currentlyVisible) {
        dispatch({ type: "users/toggleColumn", payload: key });
      }
    });
  };
  const columnLabels = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    userType: "Type",
    platformRole: "PlatformRole",
    status: "Status",
    twoFactorEnabled: "2FA",
    lastLogin: "LastLogin",
    createdAt: "CreatedAt",
    actions: "Actions",
    role: "Role",
    storeIds: "Stores",
  };

  const allUserEmails = users.map((u) => u.email?.toLowerCase()).filter(Boolean);

  const toggleSelection = (userId) => {
    dispatch({ type: "users/toggleUserSelection", payload: userId });
  };

  const selectAll = () => {
    if (safeSelected.length === users.length) {
      dispatch({ type: "users/clearSelection" });
    } else {
      dispatch({ type: "users/selectAllUsers", payload: users.map((u) => u._id) });
    }
  };

  const handleContextMenu = (e, user) => {
    e.preventDefault();
    setContextMenu({
      user,
      position: {
        top: e.clientY,
        left: e.clientX,
      },
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleSort = (column) => {
    const newDirection =
      sort?.field === column && sort?.direction === "asc" ? "desc" : "asc";
    dispatch({
      type: "users/setSort",
      payload: { field: column, direction: newDirection },
    });
  };

const handlePageChange = useCallback((page) => {
    // Redux Toolkit's slices are Immer-backed Ã¢â‚¬â€ dispatching setPage with the
    // SAME value the state already holds still produces a brand-new state
    // object reference, which still re-renders every useSelector consumer.
    // Windmill's <Pagination> below can call onChange on every render under
    // some prop combinations (notably totalResults: 0); without this guard
    // that turns into "re-render -> Pagination re-evaluates -> onChange
    // fires again -> dispatch -> re-render" forever Ã¢â‚¬â€ exactly React's
    // "Maximum update depth exceeded" signature, which is what crashed this
    // page outright for a Super Admin.
    if (page === pagination.page) return;
    dispatch({ type: "users/setPage", payload: page });
  }, [dispatch, pagination.page]);

  const handlePaginationChange = useCallback((page) => {
    handlePageChange(page + 1);
  }, [handlePageChange]);

  const handleRowsPerPageChange = useCallback((limit) => {
    dispatch({ type: "users/setRowsPerPage", payload: limit });
    dispatch({ type: "users/setPage", payload: 1 });
  }, [dispatch]);

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleApplyFilters = useCallback((newFilters) => {
    dispatch({ type: "users/setFilters", payload: newFilters });
    dispatch({ type: "users/setPage", payload: 1 });
    setIsFilterOpen(false);
  }, [dispatch]);

  const handlePresetSelect = (presetKey) => {
    const presetMap = {
      platformOnly: {
        userType: ["superadmin", "platform_admin"],
        platformOnly: true,
        storeIds: [],
        roleIds: [],
        status: [],
        twoFactorEnabled: null,
        twoFactorVerified: null,
        forcePasswordChange: null,
        teamId: null,
        department: null,
        dateFrom: null,
        dateTo: null,
        lastLoginFrom: null,
        lastLoginTo: null,
      },
      storeOwners: {
        userType: ["store_admin"],
        platformOnly: false,
        storeIds: [],
        roleIds: [],
        status: [],
        twoFactorEnabled: null,
        twoFactorVerified: null,
        forcePasswordChange: null,
        teamId: null,
        department: null,
        dateFrom: null,
        dateTo: null,
        lastLoginFrom: null,
        lastLoginTo: null,
      },
      staff: {
        userType: ["staff"],
        platformOnly: false,
        storeIds: [],
        roleIds: [],
        status: [],
        twoFactorEnabled: null,
        twoFactorVerified: null,
        forcePasswordChange: null,
        teamId: null,
        department: null,
        dateFrom: null,
        dateTo: null,
        lastLoginFrom: null,
        lastLoginTo: null,
      },
      all: {
        userType: [],
        platformOnly: false,
        storeIds: [],
        roleIds: [],
        status: [],
        twoFactorEnabled: null,
        twoFactorVerified: null,
        forcePasswordChange: null,
        teamId: null,
        department: null,
        dateFrom: null,
        dateTo: null,
        lastLoginFrom: null,
        lastLoginTo: null,
      },
    };

    const presetFilters = presetMap[presetKey] || presetMap.platformOnly;
    dispatch({ type: "users/setFilters", payload: presetFilters });
    dispatch({ type: "users/setPage", payload: 1 });
    setSearchText("");
  };

  const handleCreateUser = async (userData) => {
    try {
      setIsSubmitting(true);
      const res = await userAPI.createUser(userData);
      const newUser = res?.data?.data?.user || res?.data?.data;
      if (newUser && newUser._id) {
        updateUsersCache((users) => [newUser, ...users]);
      } else {
        queryClient.invalidateQueries(listQueryKey);
      }
      notifySuccess(t("UserCreatedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      setIsSubmitting(true);
      const res = await userAPI.updateUser(userId, updates);
      const updatedUser = res?.data?.data;
      if (updatedUser) {
        updateUsersCache((users) => users.map((u) => (u._id === userId ? updatedUser : u)));
        queryClient.setQueryData(["platformUser", userId], updatedUser);
      } else {
        queryClient.invalidateQueries(listQueryKey);
        queryClient.invalidateQueries(["platformUser", userId]);
      }
      notifySuccess(t("UserUpdatedSuccess"));
      setIsEditDrawerOpen(false);
      setEditingUser(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setIsSubmitting(true);
      await userAPI.deleteUser(userId);
      removeUserFromCache(userId);
      queryClient.removeQueries(["platformUser", userId]);
      notifySuccess(t("UserDeletedSuccess"));
      dispatch({ type: "users/clearSelection" });
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleSuspendUser = async (user) => {
    try {
       setIsSubmitting(true);
       const res = await userAPI.suspendUser(user._id, "Suspended by administrator");
       const { id, status } = res?.data?.data || {};
       if (id && status) {
         updateUsersCache((users) => users.map((u) => (u._id === id ? { ...u, status } : u)));
       } else {
         queryClient.invalidateQueries(listQueryKey);
       }
       notifySuccess(t("UserSuspendedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
   };

    const handleReactivateUser = async (user) => {
     try {
       setIsSubmitting(true);
       const res = await userAPI.reactivateUser(user._id);
       const { id, status } = res?.data?.data || {};
       if (id && status) {
         updateUsersCache((users) => users.map((u) => (u._id === id ? { ...u, status } : u)));
       } else {
         queryClient.invalidateQueries(listQueryKey);
       }
       notifySuccess(t("UserReactivatedSuccess"));
     } catch (err) {
       notifyError(err?.response?.data?.message || err?.message);
     } finally {
       setIsSubmitting(false);
     }
    };

   const handleBlockUser = async (user) => {
     try {
       setIsSubmitting(true);
       const res = await userAPI.blockUser(user._id, { reason: "Blocked by administrator" });
       const { id, status } = res?.data?.data || {};
       if (id && status) {
         updateUsersCache((users) => users.map((u) => (u._id === id ? { ...u, status } : u)));
       } else {
         queryClient.invalidateQueries(listQueryKey);
       }
       notifySuccess(t("UserBlockedSuccess"));
     } catch (err) {
       notifyError(err?.response?.data?.message || err?.message);
     } finally {
       setIsSubmitting(false);
     }
   };

   const handleUnblockUser = async (user) => {
     try {
       setIsSubmitting(true);
       const res = await userAPI.unblockUser(user._id);
       const { id, status } = res?.data?.data || {};
       if (id && status) {
         updateUsersCache((users) => users.map((u) => (u._id === id ? { ...u, status } : u)));
       } else {
         queryClient.invalidateQueries(listQueryKey);
       }
       notifySuccess(t("UserUnblockedSuccess"));
     } catch (err) {
       notifyError(err?.response?.data?.message || err?.message);
     } finally {
       setIsSubmitting(false);
     }
   };

   const handleArchiveUser = async (user) => {
     try {
       setIsSubmitting(true);
       const res = await userAPI.archiveUser(user._id, { reason: "Archived by administrator" });
       const { id, status } = res?.data?.data || {};
       if (id && status) {
         updateUsersCache((users) => users.map((u) => (u._id === id ? { ...u, status } : u)));
       } else {
         queryClient.invalidateQueries(listQueryKey);
       }
       notifySuccess(t("UserArchivedSuccess"));
     } catch (err) {
       notifyError(err?.response?.data?.message || err?.message);
     } finally {
       setIsSubmitting(false);
     }
   };

  const handleUnarchiveUser = async (user) => {
    try {
      setIsSubmitting(true);
      await userAPI.unarchiveUser(user._id);
      queryClient.invalidateQueries(listQueryKey);
      notifySuccess(t("UserUnarchivedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (user) => {
    try {
      setIsSubmitting(true);
      await userAPI.resendInvitation(user._id);
      notifySuccess(t("InvitationResentSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleBulkAction = async (action, extraData = {}) => {
      const userIds = safeSelected;
     if (userIds.length === 0) {
       notifyError(t("SelectUsersAction"));
       return;
     }

     setIsSubmitting(true);
     try {
       if (action === "export") {
         const res = await platformAPI.bulkExport({
           userIds,
           format: extraData.format || "csv",
         });
         const blob = new Blob([res.data], {
           type: extraData.format === "json" ? "application/json" : "text/csv",
         });
         const url = URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `users-export-${Date.now()}.${extraData.format || "csv"}`;
         a.click();
         URL.revokeObjectURL(url);
         notifySuccess(t("ExportSuccess"));
       } else if (action === "suspend") {
         await platformAPI.bulkSuspend({ userIds, reason: extraData.reason });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkSuspendSuccess", { count: userIds.length }));
       } else if (action === "block") {
         await platformAPI.bulkBlock({ userIds, reason: extraData.reason });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkBlockSuccess", { count: userIds.length }));
       } else if (action === "unblock") {
         await platformAPI.bulkUnblock({ userIds });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkUnblockSuccess", { count: userIds.length }));
       } else if (action === "archive") {
         await platformAPI.bulkArchive({ userIds, reason: extraData.reason });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkArchiveSuccess", { count: userIds.length }));
       } else if (action === "unarchive") {
         await platformAPI.bulkUnarchive({ userIds });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkUnarchiveSuccess", { count: userIds.length }));
       } else if (action === "force_password_change") {
         await platformAPI.bulkForcePasswordChange({ userIds });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkForcePasswordChangeSuccess", { count: userIds.length }));
       } else if (action === "resend_invitation") {
         await platformAPI.bulkResendInvitation({ userIds });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkResendInvitationSuccess", { count: userIds.length }));
       } else if (action === "delete") {
         await platformAPI.bulkDelete({ userIds });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkDeleteSuccess", { count: userIds.length }));
       } else if (action === "reactivate") {
         await platformAPI.bulkReactivate({ userIds });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkReactivateSuccess", { count: userIds.length }));
       } else if (action === "assign_role") {
         await platformAPI.bulkAssignRole({ userIds, roleId: extraData.roleId, storeId: extraData.storeId });
         queryClient.invalidateQueries(listQueryKey);
         notifySuccess(t("BulkRoleAssignSuccess", { count: userIds.length }));
       }

       dispatch({ type: "users/clearSelection" });
       setIsBulkModalOpen(false);
     } catch (err) {
       notifyError(err?.response?.data?.message || err?.message);
     } finally {
       setIsSubmitting(false);
     }
   };

  const renderSortIcon = (column) => {
    if (sort?.field !== column) {
      return (
        <span className="ml-1 inline-flex flex-col leading-none text-gray-400">
          <FiChevronUp className="-mb-0.5" size={12} />
          <FiChevronDown size={12} />
        </span>
      );
    }
    return sort?.direction === "asc" ? (
      <FiChevronUp className="ml-1 text-emerald-600" size={14} />
    ) : (
      <FiChevronDown className="ml-1 text-emerald-600" size={14} />
    );
  };

  const bulkActionsAvailable = safeSelected.length > 0;

  return (
    <div className="mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
            <FiUsers size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-300">User Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("UsersManagementDesc") || "Manage platform users, roles, and permissions"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CButton as={Link} to="/platform/invitations" variant="secondary" icon="mail" size="lg" className="no-underline">
            {t("InvitationsPending") || "Invitations"}
          </CButton>
          <CButton
            type="button"
            onClick={toggleDrawer}
            icon="plus"
            size="lg"
          >
            {t("InviteUser")}
          </CButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
              <FiUsers size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("TotalUsers") || "Total Users"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <FiShield size={22} />
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
              <FiShieldOff size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Suspended") || "Suspended"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.suspended}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
              <FiLock size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Blocked") || "Blocked"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.blocked}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute right-[10px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder={t("SearchUsers")}
                value={searchText}
                onChange={handleSearchChange}
                className="pl-4 pr-9 py-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Preset Quick Filters */}
            <div className="users-presets">
              <span className="users-presets-label">
                {t("Presets") || "Presets"}
              </span>
              <Button
                key="platformOnly"
                type="button"
                onClick={() => handlePresetSelect("platformOnly")}
                className={classnames(
                  "preset-pill",
                  filters?.platformOnly === true && filters?.userType?.length > 0
                    ? "preset-pill-active-platform"
                    : ""
                )}
              >
                {t("PlatformUsers") || "Platform Users"}
              </Button>
              <Button
                key="storeOwners"
                type="button"
                onClick={() => handlePresetSelect("storeOwners")}
                className={classnames(
                  "preset-pill",
                  filters?.userType?.includes("store_admin") && filters?.platformOnly === false
                    ? "preset-pill-active-stores"
                    : ""
                )}
              >
                {t("StoreOwners") || "Store Owners"}
              </Button>
              <Button
                key="staff"
                type="button"
                onClick={() => handlePresetSelect("staff")}
                className={classnames(
                  "preset-pill",
                  filters?.userType?.includes("staff") && filters?.platformOnly === false
                    ? "preset-pill-active-staff"
                    : ""
                )}
              >
                {t("Staff") || "Staff"}
              </Button>
              <Button
                key="all"
                type="button"
                onClick={() => handlePresetSelect("all")}
                className={classnames(
                  "preset-pill",
                  !filters?.platformOnly && filters?.userType?.length === 0
                    ? "preset-pill-active"
                    : ""
                )}
              >
                {t("AllUsers") || "All"}
              </Button>
            </div>

            {/* Toolbar Actions */}
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <CButton
                type="button"
                onClick={() => setIsFilterOpen(true)}
                variant={hasActiveFilters ? "success" : "secondary"}
                icon="filter"
              >
                {t("Filter")}
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </CButton>

              <div className="view-toggle">
                <IconButton
                  icon="list"
                  variant={viewMode === "list" ? "primary" : "ghost"}
                  size="sm"
                  aria-label="List view"
                  onClick={() => dispatch({ type: "users/setViewMode", payload: "list" })}
                />
                <IconButton
                  icon="grid"
                  variant={viewMode === "grid" ? "primary" : "ghost"}
                  size="sm"
                  aria-label="Grid view"
                  onClick={() => dispatch({ type: "users/setViewMode", payload: "grid" })}
                />
              </div>

              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="users-rpp-select"
                aria-label={t("RowsPerPage") || "Rows per page"}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / {t("Page")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filters display */}
          {bulkActionsAvailable && (
            <div className="bulk-actions-bar mt-4 flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {safeSelected.length} {t("UsersSelected")}
              </span>
              <div className="flex gap-2 flex-wrap">
                <CButton
                  type="button"
                  size="sm"
                  variant="success"
                  icon="download"
                  onClick={() => {
                    setBulkAction("export");
                    setIsBulkModalOpen(true);
                  }}
                >
                  {t("Export")}
                </CButton>
                <CButton
                  type="button"
                  size="sm"
                  variant="warning"
                  icon="shield-off"
                  onClick={() => {
                    setBulkAction("suspend");
                    setIsBulkModalOpen(true);
                  }}
                >
                  {t("Suspend")}
                </CButton>
                <CButton
                  type="button"
                  size="sm"
                  variant="danger"
                  icon="shield-off"
                  onClick={() => {
                    setBulkAction("block");
                    setIsBulkModalOpen(true);
                  }}
                >
                  {t("Block")}
                </CButton>
                <CButton
                  type="button"
                  size="sm"
                  variant="danger"
                  icon="trash"
                  onClick={() => {
                    setBulkAction("delete");
                    setIsBulkModalOpen(true);
                  }}
                >
                  {t("Delete")}
                </CButton>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <TableLoading row={rowsPerPage} col={8} />
      ) : error ? (
        <NotFound title={error?.response?.data?.message || error?.message || t("ErrorLoadingUsers")} />
      ) : !users || users.length === 0 ? (
        <NotFound
          title={hasActiveFilters ? (t("NoSearchResults") || "No results found") : t("NoUsersFound")}
          text={hasActiveFilters ? (t("TryAdjustingFilters") || "Try adjusting your search or filter criteria.") : t("NoUsersFoundDesc") || "Get started by inviting your first platform user."}
        />
      ) : (
        <>
          {viewMode === "list" ? (
            <SortableDataTable
              columns={allColumnKeys.map((column) => ({
                key: column,
                header: t(columnLabels[column] || column),
                sortable: SORTABLE_COLUMNS.some((item) => item.column === column),
              }))}
              rows={users}
              getRowKey={(row) => row._id}
              sortColumn={sort?.field}
              sortDirection={sort?.direction}
              onSort={handleSort}
              sortOptions={SORTABLE_COLUMNS.map((item) => ({
                key: item.column,
                label: t(columnLabels[item.column] || item.column),
              }))}
              rowClassName={(row) => safeSelected.includes(row._id) ? "users-table-row-selected" : ""}
              loading={isLoading}
              loadingRows={rowsPerPage}
              rowSelection={true}
              selectedRowKeys={safeSelected}
              onSelectionChange={(keys) => {
                const next = Array.isArray(keys) ? keys : [];
                const currentSet = new Set(safeSelected);
                const nextSet = new Set(next);
                if (next.length === 0) {
                  dispatch({ type: "users/clearSelection" });
                } else if (next.length === users.length) {
                  dispatch({ type: "users/selectAllUsers", payload: next });
                } else {
                  const added = next.find((k) => !currentSet.has(k));
                  const removed = safeSelected.find((k) => !nextSet.has(k));
                  if (added) dispatch({ type: "users/toggleUserSelection", payload: added });
                  else if (removed) dispatch({ type: "users/toggleUserSelection", payload: removed });
                  else dispatch({ type: "users/selectAllUsers", payload: next });
                }
              }}
              showSelectAll={true}
              visibleColumns={visibleColumnKeys}
              onVisibleColumnsChange={handleVisibleColumnsChange}
              columnSelectorLabel="Visible columns"
              renderCell={({ row }) => {
                const isDropdownOpen = openDropdownId === row._id;
                return {
                  name: (
                    <div className="flex items-center gap-3">
                      <div className="user-avatar-fallback">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt={row.firstName || row.name}
                            className="user-avatar"
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {(row.firstName || row.name || row.email)?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {row.firstName && row.lastName
                            ? `${row.firstName} ${row.lastName}`
                            : row.displayName || row.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  ),
                  email: (
                    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
                      {row.email}
                    </span>
                  ),
                  phone: (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {row.phone || "Ã¢â‚¬â€"}
                    </span>
                  ),
                  userType: (() => {
                    const config = {
                      superadmin: { label: "SuperAdmin", className: "badge-superadmin" },
                      platform_admin: { label: "Platform Admin", className: "badge-platform-admin" },
                      store_admin: { label: "Store Admin", className: "badge-store-admin" },
                      staff: { label: "Staff", className: "badge-staff" },
                      customer: { label: "Customer", className: "badge-customer" },
                    }[row.userType] || { label: "Customer", className: "badge-customer" };
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                        {t(config.label) || config.label}
                      </span>
                    );
                  })(),
                  platformRole: (() => {
                    const platformRoles = row.platformRoles || (Array.isArray(row.role)
                      ? row.role.filter((role) => role?.scope === "platform")
                      : []);
                    return (
                      <div className="flex flex-wrap gap-1">
                        {platformRoles.length > 0 ? platformRoles.map((role) => (
                          <span key={role._id || role.slug || role.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                            {role.name || role.slug}
                          </span>
                        )) : <span className="text-xs text-gray-400 dark:text-gray-500">Ã¢â‚¬â€</span>}
                      </div>
                    );
                  })(),
                  status: (() => {
                    const badge = (() => {
                      switch (row.status) {
                        case "Active": return { label: "Active", className: "status-active", dotClass: "status-dot-active" };
                        case "Inactive": return { label: "Inactive", className: "status-inactive", dotClass: "status-dot-inactive" };
                        case "Suspended": return { label: "Suspended", className: "status-suspended", dotClass: "status-dot-suspended" };
                        case "Blocked": return { label: "Blocked", className: "status-blocked", dotClass: "status-dot-blocked" };
                        case "Archived": return { label: "Archived", className: "status-archived", dotClass: "status-dot-archived" };
                        case "Invited": return { label: "Invited", className: "status-invited", dotClass: "status-dot-invited" };
                        case "PendingActivation": return { label: "PendingActivation", className: "status-pending", dotClass: "status-dot-pending" };
                        case "Draft": return { label: "Draft", className: "status-draft", dotClass: "status-dot-draft" };
                        default: return { label: row.status || "Unknown", className: "status-inactive", dotClass: "status-dot-inactive" };
                      }
                    })();
                    return (
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                          <span className={`status-dot ${badge.dotClass}`}></span>
                          {t(badge.label) || badge.label}
                        </span>
                        {(row.suspendedReason || row.blockedReason || row.archivedReason) && (
                          <span
                            className="mt-1 block text-xs text-gray-400 dark:text-gray-500 truncate max-w-[150px]"
                            title={row.suspendedReason || row.blockedReason || row.archivedReason}
                          >

                            {(row.suspendedReason || row.blockedReason || row.archivedReason).length > 40
                              ? `${(row.suspendedReason || row.blockedReason || row.archivedReason).slice(0, 40)}...`
                              : row.suspendedReason || row.blockedReason || row.archivedReason}
                          </span>
                        )}
                      </div>
                    );
                  })(),
                  twoFactorEnabled: (
                    <span className="text-center">
                      {row.twoFactorEnabled ? (
                        <FiLock className="text-blue-500 mx-auto" size={18} title={t("TwoFAEnabled")} />
                      ) : (
                        <FiUnlock className="text-gray-400 mx-auto" size={18} title={t("TwoFADisabled")} />
                      )}
                    </span>
                  ),
                  lastLogin: (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {(() => {
                        if (!row.lastLogin) return t("Never");
                        const date = new Date(row.lastLogin);
                        const diffMs = Date.now() - date.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);
                        if (diffMins < 1) return t("JustNow");
                        if (diffMins < 60) return `${diffMins} ${t("MinutesAgo")}`;
                        if (diffHours < 24) return `${diffHours} ${t("HoursAgo")}`;
                        if (diffDays < 7) return `${diffDays} ${t("DaysAgo")}`;
                        return date.toLocaleDateString();
                      })()}
                    </span>
                  ),
                  createdAt: (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "Ã¢â‚¬â€"}

                    </span>
                  ),
                  lastActivity: (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {(() => {
                        if (!row.lastActivity) return t("Never");
                        const date = new Date(row.lastActivity);
                        const diffMs = Date.now() - date.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);
                        if (diffMins < 1) return t("JustNow");
                        if (diffMins < 60) return `${diffMins} ${t("MinutesAgo")}`;
                        if (diffHours < 24) return `${diffHours} ${t("HoursAgo")}`;
                        if (diffDays < 7) return `${diffDays} ${t("DaysAgo")}`;
                        return date.toLocaleDateString();
                      })()}
                    </span>
                  ),
                  actions: (
                    <div className="relative action-dropdown" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        icon="more-vertical"
                        variant="ghost"
                        size="sm"
                        aria-label={t("Actions") || "Actions"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(isDropdownOpen ? null : row._id);
                        }}
                      />

                      {isDropdownOpen && (
                        <div className="action-menu" role="menu">
                          <div className="action-menu-header">
                            {t("Actions") || "Actions"}
                          </div>
                          <div>
                            <Button
                              type="button"
                              onClick={() => {
                                window.location.href = `/platform/users/${row._id}`;
                                setOpenDropdownId(null);
                              }}
                              className="action-menu-item action-menu-item-info"
                              role="menuitem"
                            >
                              <FiEye className="w-4 h-4" />
                              {t("ViewDetails") || "Voir les dÃƒÂ©tails"}
                            </Button>
                            <Button
                              type="button"

                              onClick={() => {
                                setEditingUser(row);
                                setIsEditDrawerOpen(true);
                                setOpenDropdownId(null);
                              }}
                              className="action-menu-item action-menu-item-info"
                              role="menuitem"
                            >
                              <FiEdit className="w-4 h-4" />
                              {t("Edit") || "Modifier"}
                            </Button>


                            {row.status === "Blocked" ? (
                              <>
                                <div className="action-menu-divider" />
                                <Button
                                  type="button"

                                  onClick={() => {
                                    handleUnblockUser(row._id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="action-menu-item action-menu-item-success"
                                  role="menuitem"
                                >
                                  <FiUnlock className="w-4 h-4" />
                                  {t("UnblockUser") || "DÃƒÂ©bloquer"}
                                </Button>

                              </>
                            ) : row.status === "Archived" ? (
                              <>
                                <div className="action-menu-divider" />
                                <Button
                                  type="button"

                                  onClick={() => {
                                    handleUnarchiveUser(row._id);
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
                                {!row.isSuperAdmin && (
                                  <Button
                                    type="button"

                                    onClick={() => {
                                      handleBlockUser(row._id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="action-menu-item action-menu-item-danger"
                                    role="menuitem"
                                  >
                                    <FiShieldOff className="w-4 h-4" />
                                    {t("BlockUser") || "Bloquer"}
                                  </Button>
                                )}
                                {!row.isSuperAdmin && (
                                  <Button
                                    type="button"

                                    onClick={() => {
                                      handleArchiveUser(row._id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="action-menu-item action-menu-item-purple"
                                    role="menuitem"
                                  >
                                    <FiArchive className="w-4 h-4" />
                                    {t("ArchiveUser") || "Archiver"}
                                  </Button>
                                )}
                                {row.status === "Suspended" ? (
                                  <Button
                                    type="button"

                                    onClick={() => {
                                      handleReactivateUser(row._id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="action-menu-item action-menu-item-success"
                                    role="menuitem"
                                  >
                                    <FiPower className="w-4 h-4" />
                                    {t("ReactivateUser") || "RÃƒÂ©activer"}
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"

                                    onClick={() => {
                                      handleSuspendUser(row._id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="action-menu-item action-menu-item-warning"
                                    role="menuitem"
                                  >
                                    <FiShieldOff className="w-4 h-4" />
                                    {t("SuspendUser") || "Suspendre"}
                                  </Button>
                                )}
                                {row.status === "Invited" && (
                                  <Button
                                    type="button"

                                    onClick={() => {
                                      handleResendInvitation(row._id);
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

                            {!row.isSuperAdmin && !row.isArchived && !row.isBlocked && (
                              <>
                                <div className="action-menu-divider" />
                                <Button
                                  type="button"

                                  onClick={() => {
                                    handleDeleteUser(row._id);
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
                  ),
                };
              }}
              pagination={{
                page: paginationData.page,
                total: paginationData.total,
                limit: paginationData.limit,
                onChange: handlePageChange,
              }}

            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {users.map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                   isSelected={safeSelected.includes(user._id)}
                  onToggleSelect={toggleSelection}
                  onView={(user) => {
                    window.location.href = `/platform/users/${user._id}`;
                  }}
                   onEdit={(user) => {
                      setEditingUser(user);
                      setIsEditDrawerOpen(true);
                    }}
                   onDelete={(user) => handleDeleteUser(user._id)}
                   onSuspend={handleSuspendUser}
                   onReactivate={handleReactivateUser}
                   onBlock={handleBlockUser}
                   onUnblock={handleUnblockUser}
                   onArchive={handleArchiveUser}
                   roleOptions={roleOptions}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Filter Panel */}
      <UserFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={(f) => dispatch({ type: "users/setFilters", payload: f })}
        userTypes={allUserTypes}
        statuses={allStatuses}
        roleOptions={roleOptions.filter((r) => r.scope === "platform")}
        stores={storeOptions}
        onApply={handleApplyFilters}
        onPresetSelect={handlePresetSelect}
      />

      <MainDrawer hideCloseButton>
        <CreateUserDrawer
          roleOptions={roleOptions}
          stores={storeOptions}
          existingEmails={allUserEmails}
          onSubmit={handleCreateUser}
        />
      </MainDrawer>

      {/* Edit User Drawer */}
      <MainDrawer isOpen={isEditDrawerOpen} onClose={() => { setIsEditDrawerOpen(false); setEditingUser(null); }} hideCloseButton>
        <EditUserDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => { setIsEditDrawerOpen(false); setEditingUser(null); }}
          user={editingUser}
          isSubmitting={isSubmitting}
          onSubmit={(updates) => handleUpdateUser(editingUser._id, updates)}
          roleOptions={roleOptions.filter((r) => r.scope === "platform")}
        />
      </MainDrawer>

      {/* Bulk Action Modal */}
       <BulkActionModal
         isOpen={isBulkModalOpen}
         onClose={() => {
           setIsBulkModalOpen(false);
           setBulkAction(null);
         }}
         action={bulkAction}
           selectedCount={safeSelected.length}
         isSubmitting={isSubmitting}
         onSubmit={handleBulkAction}
         roleOptions={roleOptions.filter((r) => r.scope === "platform")}
       />


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
                   window.location.href = `/platform/users/${contextMenu.user._id}`;
                   closeContextMenu();
                 }}
                 className="action-menu-item action-menu-item-info"
                 role="menuitem"
               >
                 <FiEye className="w-4 h-4" />
                 {t("ViewDetails") || "Voir les dÃƒÂ©tails"}
               </Button>
             </li>
             <li>
               <Button
                 type="button"
                  onClick={() => {
                    setEditingUser(contextMenu.user);
                    setIsEditDrawerOpen(true);
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
                     handleDeleteUser(contextMenu.user._id);
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
     </div>
   );
 };

export default UsersList;