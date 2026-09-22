import React, { useState, useEffect, useMemo } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import ThemeEditorServices from "@/services/ThemeEditorServices";
import { Button } from "@sofia/ui";

const TABS = [
  { key: "page", label: "Pages" },
  { key: "section", label: "Sections" },
  { key: "component", label: "Composants" },
  { key: "popup", label: "Popups" },
];

const ICON_BY_TYPE = {
  page: "ðŸ“„",
  section: "ðŸ“¦",
  component: "ðŸ§©",
  popup: "ðŸªŸ",

};

const itemLabel = (item, type) => {
  if (type === "component") return item.name;
  return item.name || item.title || item.slug || "Sans titre";
};

export default function LibraryPanel({ onClose, onPickItem, allowedTypes = ["page", "section", "component", "popup"], defaultType = "page" }) {
  const { tk, effectiveStoreId, storeId, insertLibraryItem } = useEditor();
  const storeScopeId = effectiveStoreId || storeId;

  const tabs = useMemo(() => TABS.filter((tab) => allowedTypes.includes(tab.key)), [allowedTypes]);
  const [activeType, setActiveType] = useState(tabs[0]?.key || defaultType);
  const [query, setQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [results, setResults] = useState({ pages: [], sections: [], popups: [], components: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const visibleItems = useMemo(() => {
    const items = results[`${activeType}s`] || [];
    return items;
  }, [results, activeType]);

  const categories = useMemo(() => {
    const items = visibleItems;
    const unique = [...new Set(items.map((item) => item.category || "Autre"))].filter(Boolean);
    return ["Tous", ...unique];
  }, [visibleItems]);

  useEffect(() => {
    if (!storeScopeId) return;
    setActiveType(tabs[0]?.key || defaultType);
  }, [storeScopeId, tabs, defaultType]);

  useEffect(() => {
    if (!storeScopeId) return;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await ThemeEditorServices.searchLibrary(storeScopeId, {
          q: query || undefined,
          type: activeType,
          category: categoryFilter === "Tous" ? undefined : categoryFilter,
          favoritesOnly: showFavoritesOnly ? "true" : undefined,
        });
        setResults(response);
      } catch (err) {
        console.error("Failed searching library:", err);
        setError("Ã‰chec de la recherche");

      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [storeScopeId, query, activeType, categoryFilter, showFavoritesOnly]);

  useEffect(() => {
    if (!categories.includes(categoryFilter)) {
      setCategoryFilter("Tous");
    }
  }, [categories, categoryFilter]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "Tous") return visibleItems;
    return visibleItems.filter((item) => (item.category || "Autre") === categoryFilter);
  }, [visibleItems, categoryFilter]);

  const handleToggleFavorite = async (item, type) => {
    try {
      const itemType = type === "component" ? "component" : "template";
      const response = await ThemeEditorServices.toggleFavorite(itemType, item._id);
      const updated = filteredItems.map((entry) =>
        entry._id === item._id ? { ...entry, isFavorite: response.isFavorite } : entry
      );
      setResults((prev) => ({
        ...prev,
        [`${activeType}s`]: prev[`${activeType}s`].map((entry) =>
          entry._id === item._id ? { ...entry, isFavorite: response.isFavorite } : entry
        ),
      }));
    } catch (err) {
      console.error("Failed toggling favorite:", err);
    }
  };

  const handleItemClick = async (item) => {
    try {
      if (insertLibraryItem) {
        await insertLibraryItem(item, activeType);
      }
      if (onPickItem) {
        onPickItem(item, activeType);
      }
      onClose?.();
    } catch (err) {
      console.error("Failed inserting library item:", err);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10002,
        display: "flex",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(2px)",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          width: 540,
          height: "100%",
          background: tk.sidebar,
          borderLeft: `1px solid ${tk.sidebarBorder}`,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-5px 0 25px rgba(0,0,0,0.2)",
          animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            height: 60,
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${tk.sidebarBorder}`,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: tk.headerText }}>BibliothÃ¨que unifiÃ©e</h2>

            <div style={{ color: tk.tabText, fontSize: 12, marginTop: 4 }}>
              Pages, sections, composants et popups.
            </div>
          </div>
          <Button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: tk.tabText,
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            &times;
          </Button>
        </div>

        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher dans ${tabs.map((tab) => tab.label).join(" / ")}`}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${tk.sidebarBorder}`,
              background: tk.canvasBg,
              color: tk.headerText,
              fontSize: 13,
              outline: "none",
            }}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              type="button"
              onClick={() => setShowFavoritesOnly((prev) => !prev)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${showFavoritesOnly ? "#f59e0b" : tk.sidebarBorder}`,
                background: showFavoritesOnly ? "rgba(245, 158, 11, 0.12)" : "transparent",
                color: showFavoritesOnly ? "#f59e0b" : tk.tabText,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              â­ Favoris uniquement
            </Button>


            {categories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: `1px solid ${tk.sidebarBorder}`,
                  background: tk.canvasBg,
                  color: tk.headerText,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div style={{ display: "flex", padding: "12px 20px", gap: 10, overflowX: "auto", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              onClick={() => setActiveType(tab.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${activeType === tab.key ? "#2563EB" : tk.sidebarBorder}`,
                background: activeType === tab.key ? "rgba(37, 99, 235, 0.12)" : "transparent",
                color: activeType === tab.key ? "#2563EB" : tk.tabText,
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading && (
            <div style={{ color: tk.tabText, textAlign: "center", paddingTop: 40 }}>Chargement...</div>
          )}

          {error && (
            <div style={{ color: "#f87171", textAlign: "center", paddingTop: 40 }}>{error}</div>
          )}

          {!loading && filteredItems.length === 0 && !error && (
            <div style={{ color: tk.tabText, textAlign: "center", paddingTop: 40 }}>
              Aucun rÃ©sultat pour cette recherche.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {filteredItems.map((item) => (
              <div
                key={item._id}
                onClick={() => handleItemClick(item)}
                style={{
                  cursor: "pointer",
                  border: `1px solid ${tk.sidebarBorder}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: tk.canvasBg,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 180,
                }}
              >
                <div style={{ position: "relative", height: 110, background: tk.sidebarBorder, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={itemLabel(item, activeType)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 40 }}>{ICON_BY_TYPE[activeType] || "ðŸ“„"}</span>

                  )}
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(item, activeType);
                    }}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "none",
                      background: item.isFavorite ? "#facc15" : "rgba(255,255,255,0.85)",
                      color: item.isFavorite ? "#1e293b" : "#111827",
                      cursor: "pointer",
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 5px 15px rgba(0,0,0,0.12)",
                    }}
                  >
                    â˜…
                  </Button>

                </div>
                <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tk.headerText, marginBottom: 6, minHeight: 38 }}>
                      {itemLabel(item, activeType)}
                    </div>
                    <div style={{ fontSize: 11, color: tk.tabText, marginBottom: 10, minHeight: 30 }}>
                      {item.category || "GÃ©nÃ©ral"}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: tk.tabText }}>{activeType === "popup" ? "Ouvrir en Ã©dition" : "InsÃ©rer"}</span>
                    {item.isSystem && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#e5e7eb", color: "#111827" }}>
                        SystÃ¨me
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
