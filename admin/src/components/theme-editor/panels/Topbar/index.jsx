import React, { useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { THEMES } from "../../core/editorConfig";
import ThemePicker from "../ThemePicker";
import ThemeSettingsPanel from "../ThemeSettings";
import PageManager from "../PageManager";
import PreviewDrawer from "../PreviewDrawer";
import MenuManager from "../MenuManager";
import PopupManager from "../PopupManager";
import GlobalComponentsPanel from "../GlobalComponentsPanel";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const Topbar = () => {
  const {
    tk,
    editorTheme,
    setEditorTheme,
    pages,
    currentPageId,
    currentDevice,
    setShowAddPageModal,
    editor,
    saveCurrentPageNow,
    saveStatus,
    hasUnsavedChanges,
    openHistory,
    openCommandPalette,
    undoAvailable,
    redoAvailable,
    handleUndo,
    handleRedo,
    showStructureOutlines,
    toggleStructureOutlines,
  } = useEditor();

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPageManager, setShowPageManager] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMenuManager, setShowMenuManager] = useState(false);
  const [showPopupManager, setShowPopupManager] = useState(false);
    const { showGlobalComponentsPanel, setShowGlobalComponentsPanel } = useEditor();
  

  const activePage = pages.find((p) => p._id === currentPageId);
  const pageTitle = activePage ? (activePage.title || activePage.name) : "Pages";
  let saveStatusLabel = "";
  if (saveStatus === "saving") saveStatusLabel = "Savingâ€¦";

  else if (saveStatus === "saved") saveStatusLabel = "Saved";
  else if (saveStatus === "error") saveStatusLabel = "Save failed";

  return (
    <>
      {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
      {showSettings && <ThemeSettingsPanel onClose={() => setShowSettings(false)} />}
      {showPageManager && <PageManager onClose={() => setShowPageManager(false)} />}
      {showMenuManager && <MenuManager onClose={() => setShowMenuManager(false)} />}
      {showPopupManager && <PopupManager onClose={() => setShowPopupManager(false)} />}
      <div
        style={{
          height: 40,
          background: tk.header,
          borderBottom: `1px solid ${tk.sidebarBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          flexShrink: 0,
          transition: "background 0.25s",
        }}
      >
      {/* Left side: Page Manager */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Pages and theme controls */}
        <Button
          onClick={() => setShowPageManager(true)}
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>ðŸ“„</span>
          <span>{pageTitle}</span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>â–¼</span>
        </Button>

        <Button

          onClick={() => setShowAddPageModal(true)}
          style={{
            background: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New page
        </Button>

        <Button
          onClick={() => setShowThemePicker(true)}
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          ðŸŽ¨ Themes
        </Button>

        
        <Button
          onClick={() => setShowMenuManager(true)}
          style={{
            background: "transparent",
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ðŸ§­ Navigation
        </Button>

        
        <Button
          onClick={() => setShowPopupManager(true)}
          style={{
            background: "transparent",
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ðŸªŸ Popups
        </Button>
        <Button

          onClick={() => setShowGlobalComponentsPanel(true)}
          style={{
            background: "transparent",
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ðŸŒ Composants globaux
        </Button>

        {showGlobalComponentsPanel && <GlobalComponentsPanel onClose={() => setShowGlobalComponentsPanel(false)} />}
      </div>

      {/* Center: Device Manager */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, justifyContent: "center" }}>
        {["desktop", "tablet", "mobilePortrait"].map(dev => {
          const isSelected = currentDevice === dev;
          let icon = "ðŸ’»";
          if (dev === "tablet") icon = "ðŸ“Ÿ";
          if (dev === "mobilePortrait") icon = "ðŸ“±";


          return (
            <Button
              key={dev}
              title={dev}
              onClick={() => editor && editor.setDevice(dev)}
              style={{
                padding: "4px 8px",
                fontSize: 14,
                background: isSelected ? tk.tabActive : "transparent",
                color: isSelected ? tk.tabActiveText : tk.tabText,
                border: isSelected ? `1px solid ${tk.tabActiveBorder}` : "1px solid transparent",
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {icon}
            </Button>
          )
        })}
      </div>

      {/* Right side: Actions and status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: tk.tabText, opacity: 0.9 }}>
          {saveStatusLabel}
        </span>

        {/* Undo */}
        <Button
          onClick={handleUndo}
          disabled={!undoAvailable}
          title="Annuler (Ctrl+Z)"
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 13,
            fontWeight: 600,
            cursor: undoAvailable ? "pointer" : "not-allowed",
            opacity: undoAvailable ? 1 : 0.4,
          }}
        >
          &#8634;
        </Button>

        {/* Redo */}
        <Button
          onClick={handleRedo}
          disabled={!redoAvailable}
          title="RÃ©tablir (Ctrl+Shift+Z)"
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 13,
            fontWeight: 600,
            cursor: redoAvailable ? "pointer" : "not-allowed",
            opacity: redoAvailable ? 1 : 0.4,
          }}
        >
          &#8635;
        </Button>

        <Button
          onClick={() => setShowPreview(true)}
          title="Preview current page"
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ðŸ‘ï¸ Preview
        </Button>

        <Button

          onClick={toggleStructureOutlines}
          title={showStructureOutlines ? "Hide structure outlines" : "Show structure outlines"}
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          â–¦
        </Button>

        <Button

          onClick={() => openHistory && openHistory()}
          title="View version history"
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ðŸ•’ History
        </Button>

        <Button

          onClick={() => openCommandPalette && openCommandPalette()}
          title="Command Palette (Ctrl+K)"
          style={{
            background: tk.sidebar,
            color: tk.headerText,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          âŒ˜K
        </Button>

        <Button

          onClick={async () => {
            if (!hasUnsavedChanges) {
              notifySuccess("No changes to save");
              return;
            }
            try {
              await saveCurrentPageNow();
              notifySuccess("Saved successfully");
            } catch (err) {
              console.error(err);
              notifyError("Save failed");
            }
          }}
          title="Save current page now"
          style={{
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save
        </Button>

        <div style={{ width: 1, height: 22, background: tk.sidebarBorder }} />

        <span style={{ fontSize: 11, color: tk.tabText }}>Editor theme:</span>

        {Object.entries(THEMES).map(([key, t]) => (
          <Button
            key={key}
            onClick={() => setEditorTheme(key)}
            title={t.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: editorTheme === key
                ? `1.5px solid ${tk.tabActiveBorder}`
                : `1.5px solid ${tk.sidebarBorder}`,
              borderRadius: 20,
              cursor: "pointer",
              background: editorTheme === key ? tk.tabActive : "transparent",
              color: editorTheme === key ? tk.tabActiveText : tk.tabText,
              transition: "all 0.18s",
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </Button>
        ))}

        {/* Settings gear button */}
        <Button
          onClick={() => setShowSettings(true)}
          title="Store Settings"
          style={{
            background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: tk.tabText,
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 16,
            cursor: "pointer",
            marginLeft: 8,
            transition: "all 0.15s",
          }}
        >
          âš™ï¸
        </Button>

      </div>
    </div>
    {showPreview && <PreviewDrawer onClose={() => setShowPreview(false)} />}

  </>
  );
};

export default Topbar;
