import React, { useState, useEffect } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import templateService from "@/services/templateService";
import { Button } from "@sofia/ui";

export default function TemplateLibraryModal({ onClose, onPickTemplate }) {
  const { tk, effectiveStoreId, storeId } = useEditor();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tous");

  const storeScopeId = effectiveStoreId || storeId;

  useEffect(() => {
    if (!storeScopeId) return;
    setLoading(true);
    templateService
      .listTemplates(storeScopeId)
      .then((list) => setTemplates(list))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [storeScopeId]);

  const categories = ["Tous", ...new Set(templates.map((t) => t.category))];
  const filtered =
    activeCategory === "Tous" ? templates : templates.filter((t) => t.category === activeCategory);

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
          width: 480,
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
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: tk.headerText }}>
            BibliothÃ¨que de modÃ¨les
          </h2>
          <Button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: tk.tabText, fontSize: 24, cursor: "pointer", lineHeight: 1 }}
          >
            &times;
          </Button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "12px 20px", borderBottom: `1px solid ${tk.sidebarBorder}`, overflowX: "auto" }}>
          {categories.map((cat) => (
            <Button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 11,
                whiteSpace: "nowrap",
                border: `1px solid ${activeCategory === cat ? "#2563EB" : tk.sidebarBorder}`,
                background: activeCategory === cat ? "rgba(37, 99, 235, 0.12)" : "transparent",
                color: activeCategory === cat ? "#2563EB" : tk.tabText,
                cursor: "pointer",
              }}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading && (
            <div style={{ color: tk.tabText, fontSize: 13, textAlign: "center", padding: 40 }}>
              Chargement des modÃ¨les...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ color: tk.tabText, fontSize: 13, textAlign: "center", padding: 40 }}>
              Aucun modÃ¨le disponible dans cette catÃ©gorie.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map((template) => (
              <div
                key={template._id}
                style={{
                  border: `1px solid ${tk.sidebarBorder}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: tk.canvasBg,
                }}
              >
                <div
                  style={{
                    height: 100,
                    background: tk.sidebarBorder,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: tk.tabText,
                    fontSize: 24,
                  }}
                >
                  {template.thumbnail ? (
                    <img src={template.thumbnail} alt={template.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "ðŸ“„"

                  )}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tk.headerText, marginBottom: 2 }}>
                    {template.name}
                    {template.isSystem && (
                      <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "#2563EB", color: "#fff" }}>
                        SofiaGen
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: tk.tabText, marginBottom: 8 }}>{template.category}</div>
                  <Button
                    onClick={() => onPickTemplate(template)}
                    style={{
                      width: "100%",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 0",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Utiliser ce modÃ¨le
                  </Button>

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
