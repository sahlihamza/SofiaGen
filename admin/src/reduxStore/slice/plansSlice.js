import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";

const initialState = {
  plans: [],
  total: 0,
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  loading: false,
  error: null,
  selectedPlan: null,
  filters: {
    search: "",
    status: "",
  },
};

const plansSlice = createSlice({
  name: "plans",
  initialState,
  reducers: {
    setPlans: (state, action) => {
      state.plans = action.payload.plans;
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
    setSelectedPlan: (state, action) => {
      state.selectedPlan = action.payload;
    },
    clearSelectedPlan: (state) => {
      state.selectedPlan = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addPlan: (state, action) => {
      state.plans.unshift(action.payload);
      state.total += 1;
    },
    updatePlan: (state, action) => {
      const index = state.plans.findIndex((p) => p._id === action.payload._id);
      if (index !== -1) {
        state.plans[index] = action.payload;
      }
    },
    removePlan: (state, action) => {
      state.plans = state.plans.filter((p) => p._id !== action.payload);
      state.total -= 1;
    },
  },
});

export const {
  setPlans,
  setLoading,
  setError,
  setSelectedPlan,
  clearSelectedPlan,
  setFilters,
  addPlan,
  updatePlan,
  removePlan,
} = plansSlice.actions;

export default plansSlice.reducer;