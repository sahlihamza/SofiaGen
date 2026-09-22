import React from "react";
import { useIconContext } from "../context/IconContext";
import { getAllIcons, getIconById, getLibrary } from "../utils/iconRegistry";

export function useIcons(options = {}) {
  const ctx = useIconContext();
  return {
    libraries: ctx.libraries,
    activeLibrary: ctx.activeLibrary,
    setActiveLibrary: ctx.setActiveLibrary,
    activeStyle: ctx.activeStyle,
    setActiveStyle: ctx.setActiveStyle,
    styleFilters: ctx.styleFilters,
    ...options,
  };
}

export function useIconSearch(query, options = {}) {
  const [results, setResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const { activeLibrary, activeStyle } = useIcons();

  React.useEffect(() => {
    if (!query && !options.forceRefresh) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const icons = await getAllIcons({
          search: query,
          libraries: activeLibrary !== "all" ? [getLibrary(activeLibrary)].filter(Boolean) : undefined,
          styleFilter: activeStyle,
        });
        if (!cancelled) {
          setResults(icons);
          setIsSearching(false);
        }
      } catch {
        if (!cancelled) setIsSearching(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, activeLibrary, activeStyle, options.forceRefresh]);

  return { results, isSearching };
}

export function useIconFavorites() {
  const ctx = useIconContext();
  return {
    favorites: ctx.favorites,
    toggleFavorite: ctx.toggleFavorite,
    isFavorite: ctx.isFavorite,
  };
}

export function useIconRecent() {
  const ctx = useIconContext();
  return {
    recent: ctx.recent,
    addToRecent: ctx.addToRecent,
  };
}

export function useCustomIcons() {
  const ctx = useIconContext();
  return {
    customIcons: ctx.customIcons,
    addCustomIcons: ctx.addCustomIcons,
    removeCustomIcon: ctx.removeCustomIcon,
    loadFromServer: ctx.loadCustomIconsFromServer,
    isLoading: ctx.isLoading,
  };
}
