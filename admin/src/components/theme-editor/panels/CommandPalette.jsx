import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";

/**
 * Command Palette  overlay triggered by Ctrl/Cmd+K.
 * Self-contained (no external fuzzy-search lib): builds a simple command list
 * and filters by substring. Uses the existing EditorProvider context
 * (pages, addPage, selectPage, GLOBAL_SECTION_IDS, open/close command palette).
 */

export default function CommandPalette() {
  const {
    tk,
    isCommandPaletteOpen,
    closeCommandPalette,
    pages,
    addPage,
    selectPage,
    GLOBAL_SECTION_IDS,
  } = useEditor();

  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  // Reset query each time the palette opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      // focus the input shortly after mount
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isCommandPaletteOpen]);

  // Build the static + dynamic commands
  const commands = useMemo(() => {
    const list = [
      {
        id: "new-page",
        group: "Actions rapides",
        label: " Crér une nouvelle page",
        run: () => addPage({ name: "Nouvelle page" }),
      },
      {
        id: "edit-header",
        group: "Actions rapides",
        label: "= Modifier le Header",
        run: () => selectPage(GLOBAL_SECTION_IDS.header),
      },
      {
        id: "edit-footer",
        group: "Actions rapides",
        label: "=; Modifier le Footer",
        run: () => selectPage(GLOBAL_SECTION_IDS.footer),
      },
      {
        id: "edit-announcement",
        group: "Actions rapides",
        label: "= Modifier la barre d'annonce",
        run: () => selectPage(GLOBAL_SECTION_IDS.announcement_bar),
      },
      {
        id: "edit-cookie",
        group: "Actions rapides",
        label: "<j Modifier le bandeau cookies",
        run: () => selectPage(GLOBAL_SECTION_IDS.cookie_banner),
      },
    ];

    (pages || []).forEach((page) => {
      list.push({
        id: `page-${page._id}`,
        group: "Pages",
        label: `= ${page.title || page.name || "Sans titre"}`,
        run: () => selectPage(page._id),
      });
    });

    return list;
  }, [pages, addPage, selectPage, GLOBAL_SECTION_IDS]);

  // Filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // Group preserving order
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group).push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const runCommand = (cmd) => {
    try {
      cmd.run();
    } catch (e) {
      console.error("Command failed", e);
    } finally {
      closeCommandPalette();
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      onMouseDown={(e) => {
        // click on the dimmed backdrop closes; clicks inside don't
        if (e.target === e.currentTarget) closeCommandPalette();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 10003,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: "92vw",
          background: tk.sidebar,
          border: `1px solid ${tk.sidebarBorder}`,
          borderRadius: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
          color: tk.headerText,
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              closeCommandPalette();
            }
            if (e.key === "Enter" && filtered.length > 0) {
              e.preventDefault();
              runCommand(filtered[0]);
            }
          }}
          placeholder="Tapez une commande ou recherchez..."
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "none",
            borderBottom: `1px solid ${tk.sidebarBorder}`,
            background: "transparent",
            color: tk.headerText,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: tk.tabText, fontSize: 13 }}>
              Aucun résultat.
            </div>
          )}

          {grouped.map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: tk.tabText,
                  opacity: 0.8,
                  padding: "6px 8px",
                }}
              >
                {group}
              </div>
              {items.map((cmd) => (
                <div
                  key={cmd.id}
                  onClick={() => runCommand(cmd)}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    color: tk.headerText,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = tk.canvasBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {cmd.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
