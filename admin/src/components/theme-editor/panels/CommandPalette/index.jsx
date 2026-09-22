import React, { useState, useEffect, useRef } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { THEMES } from "../../core/editorConfig";

export default function CommandPalette() {
  const {
    tk,
    isCommandPaletteOpen,
    closeCommandPalette,
    pages,
    selectPage,
    currentPageId,
    isEditingPopup,
    saveCurrentPageNow,
    setShowAddPageModal,
    openHistory,
    openMediaLibrary,
    updatePageStatus,
    duplicatePage,
    // Note: theme settings or other actions might need specific handlers
  } = useEditor();

  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const actions = [
    {
      id: "action-new-page",
      label: "Nouvelle page",
      icon: "",
      onSelect: () => setShowAddPageModal(true),
    },
    {
      id: "action-save",
      label: "Enregistrer",
      icon: "=",
      onSelect: () => saveCurrentPageNow(),
    },
    {
      id: "action-history",
      label: "Historique des versions",
      icon: "",
      onSelect: () => openHistory(),
    },
    {
      id: "action-media",
      label: "Ouvrir la Media Library",
      icon: "=",
      onSelect: () => openMediaLibrary(() => {}),
    },
    ...(!isEditingPopup ? [
      {
        id: "action-publish",
        label: "Publier la page courante",
        icon: "=",
        onSelect: () => {
          const current = pages.find(p => p._id === currentPageId);
          if (current) {
            updatePageStatus(currentPageId, true);
          }
        },
      },
      {
        id: "action-duplicate",
        label: "Dupliquer la page courante",
        icon: "=",
        onSelect: () => duplicatePage(currentPageId),
      },
    ] : []),
  ];

  const pageItems = pages.map(page => ({
    id: `page-${page._id}`,
    label: page.title || page.name,
    subLabel: page.slug === "/" ? "/" : `/${page.slug}`,
    icon: "=",
    onSelect: () => selectPage(page._id),
  }));

  const allItems = [...pageItems, ...actions];

  const filteredItems = allItems.filter(item => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const label = (item.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return label.includes(q);
  });

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeCommandPalette();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        selectedItem.onSelect();
        closeCommandPalette();
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={closeCommandPalette}
    >
      <div
        style={{
          width: 500,
          maxWidth: "90%",
          background: tk.sidebar,
          borderRadius: 8,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: `1px solid ${tk.sidebarBorder}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: 12, borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <input
            ref={inputRef}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Que voulez-vous faire ? (Rechercher une page ou une action...)"
            style={{
              width: "100%",
              padding: "12px 16px",
              boxSizing: "border-box",
              background: tk.canvasBg,
              color: tk.headerText,
              border: `1px solid ${tk.sidebarBorder}`,
              borderRadius: 6,
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto", padding: 8 }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: tk.tabText, fontSize: 13 }}>
              Aucun résultat pour  {search} 
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isActive = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.onSelect();
                    closeCommandPalette();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    cursor: "pointer",
                    borderRadius: 6,
                    background: isActive ? tk.tabActive : "transparent",
                    color: isActive ? tk.tabActiveText : tk.headerText,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                    {item.subLabel && (
                      <span style={{ fontSize: 11, color: tk.tabText, fontFamily: "monospace", marginTop: 2 }}>
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
