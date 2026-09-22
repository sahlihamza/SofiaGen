import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { clearRegistry, getAllLibraries, registerLibrary, unregisterLibrary, STYLE_FILTERS } from "../utils/iconRegistry";
import { iconService } from "../services/iconService";

const IconContext = createContext(null);

const STORAGE_KEYS = {
  favorites: "icon-system-favorites",
  recent: "icon-system-recent",
  custom: "icon-system-custom-icons",
};

const MAX_RECENT = 24;

function loadFromStorage(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function IconProvider({ children, storeId }) {
  const [libraries, setLibraries] = useState(() => getAllLibraries());
  const [favorites, setFavorites] = useState(() => loadFromStorage(STORAGE_KEYS.favorites));
  const [recent, setRecent] = useState(() => loadFromStorage(STORAGE_KEYS.recent));
  const [customIcons, setCustomIcons] = useState(() => loadFromStorage(STORAGE_KEYS.custom));
  const [isLoading, setIsLoading] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState("all");
  const [activeStyle, setActiveStyle] = useState("all");

  useEffect(() => {
    const libs = getAllLibraries();
    setLibraries([...libs]);
  }, []);

  const refreshLibraries = useCallback(() => {
    setLibraries([...getAllLibraries()]);
  }, []);

  const addToRecent = useCallback(
    (icon) => {
      setRecent((prev) => {
        const filtered = prev.filter((r) => r.libraryId !== icon.libraryId || r.id !== icon.id);
        const updated = [{ ...icon, addedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
        saveToStorage(STORAGE_KEYS.recent, updated);
        return updated;
      });
    },
    [setRecent]
  );

  const toggleFavorite = useCallback(
    async (icon) => {
      setFavorites((prev) => {
        const isFav = prev.some((f) => f.libraryId === icon.libraryId && f.id === icon.id);
        const updated = isFav
          ? prev.filter((f) => !(f.libraryId === icon.libraryId && f.id === icon.id))
          : [...prev, { ...icon, favoritedAt: Date.now() }];
        saveToStorage(STORAGE_KEYS.favorites, updated);
        return updated;
      });

      if (storeId && icon.libraryId === "custom") {
        try {
          await iconService.toggleFavorite(storeId, icon.id);
        } catch {
          // silent fail for offline / permission errors
        }
      }
    },
    [storeId, setFavorites]
  );

  const isFavorite = useCallback(
    (icon) => favorites.some((f) => f.libraryId === icon.libraryId && f.id === icon.id),
    [favorites]
  );

  const addCustomIcons = useCallback(
    (icons) => {
      const withIds = icons.map((ic, idx) => ({
        ...ic,
        id: ic.id || ic.name || `custom-${Date.now()}-${idx}`,
        libraryId: "custom",
        libraryName: "Mes Icônes Custom",
        category: "custom",
        tags: ic.tags || ["custom"],
      }));
      setCustomIcons((prev) => {
        const merged = [...withIds, ...prev];
        saveToStorage(STORAGE_KEYS.custom, merged);
        return merged;
      });
      refreshLibraries();
      return withIds;
    },
    [setCustomIcons, refreshLibraries]
  );

  const removeCustomIcon = useCallback(
    async (icon) => {
      setCustomIcons((prev) => {
        const updated = prev.filter((ic) => ic.id !== icon.id);
        saveToStorage(STORAGE_KEYS.custom, updated);
        return updated;
      });
      setFavorites((prev) => prev.filter((f) => !(f.libraryId === icon.libraryId && f.id === icon.id)));
      setRecent((prev) => prev.filter((r) => !(r.libraryId === icon.libraryId && r.id === icon.id)));

      if (storeId) {
        try {
          await iconService.remove(storeId, icon.id);
        } catch {
          // silent
        }
      }
      refreshLibraries();
    },
    [storeId, setCustomIcons, setFavorites, setRecent, refreshLibraries]
  );

  const loadCustomIconsFromServer = useCallback(async () => {
    if (!storeId) return;
    setIsLoading(true);
    try {
      const { data } = await iconService.list({ storeId, limit: 200 });
      if (data.data?.length) {
        const mapped = data.data.map((ic) => ({
          ...ic,
          id: ic.name,
          libraryId: "custom",
          libraryName: "Mes Icônes Custom",
          category: "custom",
          tags: ic.tags || ["custom"],
        }));
        setCustomIcons(mapped);
        saveToStorage(STORAGE_KEYS.custom, mapped);
        refreshLibraries();
      }
    } catch {
      // silent - custom icons not required
    } finally {
      setIsLoading(false);
    }
  }, [storeId, setCustomIcons, refreshLibraries]);

  const value = useMemo(
    () => ({
      libraries,
      activeLibrary,
      setActiveLibrary,
      activeStyle,
      setActiveStyle,
      styleFilters: STYLE_FILTERS,
      favorites,
      recent,
      customIcons,
      isLoading,
      addToRecent,
      toggleFavorite,
      isFavorite,
      addCustomIcons,
      removeCustomIcon,
      loadCustomIconsFromServer,
      refreshLibraries,
      registerLibrary,
      unregisterLibrary: (id) => {
        unregisterLibrary(id);
        refreshLibraries();
      },
    }),
    [
      libraries,
      activeLibrary,
      activeStyle,
      favorites,
      recent,
      customIcons,
      isLoading,
      addToRecent,
      toggleFavorite,
      isFavorite,
      addCustomIcons,
      removeCustomIcon,
      loadCustomIconsFromServer,
      refreshLibraries,
    ]
  );

  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
}

export function useIconContext() {
  const ctx = useContext(IconContext);
  if (!ctx) throw new Error("useIconContext must be used within IconProvider");
  return ctx;
}
