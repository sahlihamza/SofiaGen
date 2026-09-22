import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";

const initialState = {
  roles: [],
  total: 0,
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  loading: false,
  error: null,
  selectedRole: null,
  filters: {
    search: "",
    scope: "",
  },
  templates: [],
  templatesLoading: false,
  templatesError: null,
  selectedTemplate: null,
};

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    setRoles: (state, action) => {
      state.roles = action.payload.roles;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedRole: (state, action) => {
      state.selectedRole = action.payload;
    },
    clearSelectedRole: (state) => {
      state.selectedRole = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addRole: (state, action) => {
      state.roles.unshift(action.payload);
      state.total += 1;
    },
    updateRole: (state, action) => {
      const index = state.roles.findIndex((r) => r._id === action.payload._id);
      if (index !== -1) {
        state.roles[index] = action.payload;
      }
    },
    removeRole: (state, action) => {
      state.roles = state.roles.filter((r) => r._id !== action.payload);
      state.total -= 1;
    },
    setTemplates: (state, action) => {
      state.templates = action.payload;
      state.templatesLoading = false;
    },
    setTemplatesLoading: (state, action) => {
      state.templatesLoading = action.payload;
    },
    setTemplatesError: (state, action) => {
      state.templatesError = action.payload;
      state.templatesLoading = false;
    },
    addTemplate: (state, action) => {
      state.templates.unshift(action.payload);
    },
    updateTemplate: (state, action) => {
      const index = state.templates.findIndex((t) => t._id === action.payload._id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
    },
    removeTemplate: (state, action) => {
      state.templates = state.templates.filter((t) => t._id !== action.payload);
    },
  },
});

export const {
  setRoles,
  setLoading,
  setError,
  setSelectedRole,
  clearSelectedRole,
  setFilters,
  addRole,
  updateRole,
  removeRole,
  setTemplates,
  setTemplatesLoading,
  setTemplatesError,
  addTemplate,
  updateTemplate,
  removeTemplate,
} = rolesSlice.actions;

export default rolesSlice.reducer;