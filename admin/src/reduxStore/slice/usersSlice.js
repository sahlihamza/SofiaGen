import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";

const defaultColumns = [
  { key: "name", label: "User", visible: true },
  { key: "email", label: "Email", visible: true },
  { key: "phone", label: "Phone", visible: true },
  { key: "status", label: "Status", visible: true },
  { key: "platformRole", label: "Platform Role", visible: true },
  { key: "storeCount", label: "Stores", visible: true },
  { key: "lastLogin", label: "Last Login", visible: true },
  { key: "createdAt", label: "Created", visible: true },
  { key: "actions", label: "Actions", visible: true, sortable: false },
];

const initialState = {
  users: [],
  selected: [],
  filters: {
    search: "",
    userType: [],
    status: [],
    twoFactorEnabled: null,
    twoFactorVerified: null,
    forcePasswordChange: null,
    storeIds: [],
    roleIds: [],
    teamId: null,
    department: null,
    platformOnly: false,
    dateFrom: null,
    dateTo: null,
    lastLoginFrom: null,
    lastLoginTo: null,
    createdBy: null,
  },
  sort: { field: "createdAt", direction: "desc" },
  pagination: { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1 },
  viewMode: "list",
  rowsPerPage: DEFAULT_PAGE_SIZE,
  loading: false,
  error: null,
  selectedUser: null,
  userDetail: null,
  userDetailLoading: false,
  columns: defaultColumns,
  bulkActionStatus: { loading: false, error: null, result: null },
  invitations: {
    list: [],
    pagination: { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1 },
    loading: false,
    error: null,
  },
  teams: {
    list: [],
    pagination: { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1 },
    loading: false,
    error: null,
    departments: [],
  },
  loginHistory: {
    list: [],
    pagination: { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1 },
    loading: false,
    error: null,
  },
  dashboardStats: {
    data: null,
    loading: false,
    error: null,
  },
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload.users;
      state.pagination = action.payload.pagination;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      if (!state.pagination) {
        state.pagination = { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1 };
      } else {
        state.pagination.page = 1;
      }
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSort: (state, action) => {
      state.sort = action.payload;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    setRowsPerPage: (state, action) => {
      state.rowsPerPage = action.payload;
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    toggleUserSelection: (state, action) => {
      const userId = action.payload;
      const index = state.selected.indexOf(userId);
      if (index > -1) {
        state.selected.splice(index, 1);
      } else {
        state.selected.push(userId);
      }
    },
    selectAllUsers: (state, action) => {
      state.selected = action.payload || state.users.map((u) => u._id);
    },
    clearSelection: (state) => {
      state.selected = [];
    },
    addUser: (state, action) => {
      state.users.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateUser: (state, action) => {
      const index = state.users.findIndex((u) => u._id === action.payload._id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
      if (state.selectedUser && state.selectedUser._id === action.payload._id) {
        state.selectedUser = action.payload;
      }
    },
    removeUser: (state, action) => {
      state.users = state.users.filter((u) => u._id !== action.payload);
      state.selected = state.selected.filter((id) => id !== action.payload);
      state.pagination.total -= 1;
    },
    setColumns: (state, action) => {
      state.columns = action.payload;
    },
    toggleColumn: (state, action) => {
      const col = state.columns.find((c) => c.key === action.payload);
      if (col) {
        col.visible = !col.visible;
      }
    },
    setBulkActionStatus: (state, action) => {
      state.bulkActionStatus = { ...state.bulkActionStatus, ...action.payload };
    },
    clearBulkActionStatus: (state) => {
      state.bulkActionStatus = initialState.bulkActionStatus;
    },
    setInvitations: (state, action) => {
      state.invitations.list = action.payload.invitations;
      state.invitations.pagination = action.payload.pagination;
      state.invitations.loading = false;
      state.invitations.error = null;
    },
    setInvitationsLoading: (state, action) => {
      state.invitations.loading = action.payload;
    },
    setInvitationsError: (state, action) => {
      state.invitations.error = action.payload;
      state.invitations.loading = false;
    },
    setTeams: (state, action) => {
      state.teams.list = action.payload.teams;
      state.teams.pagination = action.payload.pagination;
      state.teams.loading = false;
      state.teams.error = null;
    },
    setTeamsLoading: (state, action) => {
      state.teams.loading = action.payload;
    },
    setTeamsError: (state, action) => {
      state.teams.error = action.payload;
      state.teams.loading = false;
    },
    setDepartments: (state, action) => {
      state.teams.departments = action.payload;
    },
    setLoginHistory: (state, action) => {
      state.loginHistory.list = action.payload.entries;
      state.loginHistory.pagination = action.payload.pagination;
      state.loginHistory.loading = false;
      state.loginHistory.error = null;
    },
    setLoginHistoryLoading: (state, action) => {
      state.loginHistory.loading = action.payload;
    },
    setLoginHistoryError: (state, action) => {
      state.loginHistory.error = action.payload;
      state.loginHistory.loading = false;
    },
    setDashboardStats: (state, action) => {
      state.dashboardStats.data = action.payload;
      state.dashboardStats.loading = false;
      state.dashboardStats.error = null;
    },
    setDashboardStatsLoading: (state, action) => {
      state.dashboardStats.loading = action.payload;
    },
    setDashboardStatsError: (state, action) => {
      state.dashboardStats.error = action.payload;
      state.dashboardStats.loading = false;
    },
    setUserDetail: (state, action) => {
      state.userDetail = action.payload;
      state.userDetailLoading = false;
    },
    setUserDetailLoading: (state, action) => {
      state.userDetailLoading = action.payload;
    },
  },
});

export const {
  setUsers,
  setLoading,
  setError,
  setSelectedUser,
  clearSelectedUser,
  setFilters,
  resetFilters,
  setSort,
  setPage,
  setRowsPerPage,
  setViewMode,
  toggleUserSelection,
  selectAllUsers,
  clearSelection,
  addUser,
  updateUser,
  removeUser,
  setColumns,
  toggleColumn,
  setBulkActionStatus,
  clearBulkActionStatus,
  setInvitations,
  setInvitationsLoading,
  setInvitationsError,
  setTeams,
  setTeamsLoading,
  setTeamsError,
  setDepartments,
  setLoginHistory,
  setLoginHistoryLoading,
  setLoginHistoryError,
  setDashboardStats,
  setDashboardStatsLoading,
  setDashboardStatsError,
  setUserDetail,
  setUserDetailLoading,
} = usersSlice.actions;

export default usersSlice.reducer;
