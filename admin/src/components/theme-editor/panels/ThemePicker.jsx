import React, { useState } from "react";
import { SITE_THEMES, SITE_THEME_CATEGORIES } from "../core/siteThemes";
import { useEditor } from "../hooks/editor/EditorProvider";
import { Button } from "@sofia/ui";

const ThemePicker = ({ onClose }) => {
  const { tk, editor } = useEditor();
  const [activeCategory, setActiveCategory] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = SITE_THEMES.filter(
    t => activeCategory === "all" || t.category === activeCategory
  );

  const handleApply = () => {
    if (!selected || !editor) return;
    const theme = SITE_THEMES.find(t => t.id === selected);
    if (!theme) return;

    // If the theme has GrapesJS projectData, use loadProjectData (most powerful)
    if (theme.projectData) {
      editor.loadProjectData(theme.projectData);
    } else {
      // Fallback: load via HTML + CSS
      editor.setComponents(theme.html);
      editor.setStyle(theme.css);
    }
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: tk.sidebar,
        border: `1px solid ${tk.sidebarBorder}`,
        borderRadius: 16,
        width: 860,
        maxWidth: "95vw",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 28px 16px",
          borderBottom: `1px solid ${tk.sidebarBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ color: tk.headerText, margin: 0, fontSize: 22, fontWeight: 700 }}>
              ðŸŽ¨ Choose a Theme
            </h2>
            <p style={{ color: tk.tabText, margin: "4px 0 0", fontSize: 13 }}>
              Select a starting template â€” you can customize everything after
            </p>
          </div>
          <Button onClick={onClose} style={{
            background: "transparent", border: "none", color: tk.tabText,
            fontSize: 22, cursor: "pointer", padding: "4px 8px", borderRadius: 8,
          }}>âœ•</Button>
        </div>

        {/* Category Filter */}
        <div style={{ padding: "16px 28px 0", display: "flex", gap: 8 }}>
          {SITE_THEME_CATEGORIES.map(cat => (
            <Button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                borderRadius: 20,
                border: activeCategory === cat
                  ? `1.5px solid ${tk.tabActiveBorder}`
                  : `1.5px solid ${tk.sidebarBorder}`,
                background: activeCategory === cat ? tk.tabActive : "transparent",
                color: activeCategory === cat ? tk.tabActiveText : tk.tabText,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Theme Grid */}
        <div style={{
          padding: 28,
          overflowY: "auto",
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
          alignContent: "start",
        }}>
          {filtered.map(theme => {
            const isSelected = selected === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => setSelected(theme.id)}
                style={{
                  border: isSelected
                    ? `2px solid ${tk.tabActiveBorder}`
                    : `2px solid ${tk.sidebarBorder}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: tk.canvasBg,
                  transition: "all 0.18s",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                  boxShadow: isSelected ? `0 0 0 4px ${tk.tabActiveBorder}33` : "none",
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  height: 130,
                  background: `linear-gradient(135deg, ${tk.tabActive}, ${tk.header})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 56,
                  position: "relative",
                }}>
                  {theme.thumbnail}
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: tk.tabActiveBorder,
                      color: "white", borderRadius: "50%",
                      width: 28, height: 28, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 14,
                    }}>âœ“</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "14px 16px 16px" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: tk.headerText, marginBottom: 4 }}>
                    {theme.label}
                  </div>
                  <div style={{ fontSize: 12, color: tk.tabText }}>{theme.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px",
          borderTop: `1px solid ${tk.sidebarBorder}`,
          display: "flex", justifyContent: "flex-end", gap: 12,
          background: tk.header,
        }}>
          <Button onClick={onClose} style={{
            padding: "10px 24px", background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: tk.tabText, borderRadius: 8,
            cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={!selected}
            style={{
              padding: "10px 28px",
              background: selected ? "#10b981" : "#555",
              color: "white", border: "none", borderRadius: 8,
              cursor: selected ? "pointer" : "not-allowed",
              fontWeight: 700, fontSize: 13,
              transition: "background 0.2s",
            }}
          >
            Apply Theme
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemePicker;
