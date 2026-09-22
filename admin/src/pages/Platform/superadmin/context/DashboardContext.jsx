import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * DashboardContext
 *
 * Global dashboard state:
 *  - filters (date range, country, plan, provider, status, store)
 *  - auto-refresh interval (seconds, 0 = disabled)
 *  - widget visibility + layout persistence (localStorage)
 */
const DashboardContext = createContext();

const LAYOUT_KEY = "superadmin_dashboard_layout_v1";
const VISIBILITY_KEY = "superadmin_dashboard_visibility_v1";

const defaultFilters = {
  range: "30d", // 7d | 30d | 90d | 12m | custom
  startDate: null,
  endDate: null,
  country: "all",
  plan: "all",
  provider: "all",
  status: "all",
  store: "all",
};

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const DashboardProvider = ({ children }) => {
  const [filters, setFilters] = useState(defaultFilters);
  const [refreshInterval, setRefreshInterval] = useState(60); // seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [layout, setLayout] = useState(() =>
    loadJSON(LAYOUT_KEY, {})
  );
  const [visibility, setVisibility] = useState(() =>
    loadJSON(VISIBILITY_KEY, {})
  );

  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => setFilters(defaultFilters);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setLastUpdated(new Date());
    // small delay to avoid flicker while new data loads
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Auto-refresh polling
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return undefined;
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1);
      setLastUpdated(new Date());
    }, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval]);

  const setWidgetVisibility = (widgetId, visible) => {
    setVisibility((prev) => {
      const next = { ...prev, [widgetId]: visible };
      try {
        localStorage.setItem(VISIBILITY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const moveWidget = (fromId, toId) => {
    setLayout((prev) => {
      const keys = Object.keys(prev).length
        ? Object.keys(prev)
        : [];
      if (!keys.length) return prev;
      const fromIdx = keys.indexOf(fromId);
      const toIdx = keys.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const nextKeys = [...keys];
      nextKeys.splice(toIdx, 0, nextKeys.splice(fromIdx, 1)[0]);
      const next = {};
      nextKeys.forEach((k, i) => {
        next[k] = prev[k] || { order: i };
      });
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const resetLayout = () => {
    try {
      localStorage.removeItem(LAYOUT_KEY);
      localStorage.removeItem(VISIBILITY_KEY);
    } catch {
      /* ignore */
    }
    setLayout({});
    setVisibility({});
  };

  const value = useMemo(
    () => ({
      filters,
      updateFilters,
      resetFilters,
      refreshInterval,
      setRefreshInterval,
      isRefreshing,
      lastUpdated,
      refreshKey,
      triggerRefresh,
      visibility,
      setWidgetVisibility,
      layout,
      moveWidget,
      resetLayout,
    }),
    [
      filters,
      refreshInterval,
      isRefreshing,
      lastUpdated,
      refreshKey,
      visibility,
      layout,
    ]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
};

