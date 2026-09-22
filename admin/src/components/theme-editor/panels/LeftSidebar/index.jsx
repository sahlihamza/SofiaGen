import React, { useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { FiSearch, FiStar, FiArrowLeft, FiSettings, FiLogOut, FiRotateCcw, FiRotateCw, FiEye, FiMonitor, FiTablet, FiSmartphone, FiPlay } from "react-icons/fi";
import { notifySuccess, notifyError } from "../../../../utils/toast";
import { Button } from "@sofia/ui";

const SidebarLabel = ({ children, color, borderColor }) => (
  <div style={{
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 700,
    color,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: `1px solid ${borderColor}`,
  }}>
    {children}
  </div>
);

const LeftSidebar = () => {
  const { tk, handleUndo, handleRedo, undoAvailable, redoAvailable, currentDevice, setCurrentDevice, saveCurrentPageNow, updatePageStatus, editor, hasUnsavedChanges, saveStatus, currentPageId } = useEditor();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("elements");
  const [favorites, setFavorites] = useState([]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const normalizeDevice = (value) => {
    const normalized = String(value || "desktop").toLowerCase();
    if (normalized.includes("mobile")) return "mobile";
    if (normalized.includes("tablet")) return "tablet";
    return "desktop";
  };

  const handleDeviceSelect = (deviceKey) => {
    const normalizedDevice = normalizeDevice(deviceKey);
    setCurrentDevice(normalizedDevice);
    if (editor?.setDevice) {
      editor.setDevice(normalizedDevice === "mobile" ? "mobilePortrait" : normalizedDevice);
    }
    setShowDeviceMenu(false);
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearch(query);
    
    const blocksContainer = document.getElementById("gjs-blocks");
    if (!blocksContainer) return;

    const categories = blocksContainer.querySelectorAll(".gjs-block-category");
    
    categories.forEach(category => {
      const blocks = category.querySelectorAll(".gjs-block");
      let hasVisibleBlock = false;
      
      blocks.forEach(block => {
        const label = block.textContent.toLowerCase();
        if (label.includes(query)) {
          block.style.display = "";
          hasVisibleBlock = true;
        } else {
          block.style.display = "none";
        }
      });
      
      if (hasVisibleBlock || !query) {
        category.style.display = "";
      } else {
        category.style.display = "none";
      }
    });
  };

  return (
    <div style={{
      width: 280,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      background: tk.sidebar,
      borderRight: `1px solid ${tk.sidebarBorder}`,
      transition: "background 0.25s",
    }}>
      {/* Top Header with Back Button & Options */}
      <div style={{
        padding: "12px",
        borderBottom: `1px solid ${tk.sidebarBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}>
        <Button
          style={{
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: tk.tabText,
            borderRadius: 3,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => e.target.style.background = tk.canvasBg}
          onMouseOut={(e) => e.target.style.background = "transparent"}
        >
          <FiArrowLeft size={12} /> Back
        </Button>
        <Button
          style={{
            padding: "6px",
            background: "transparent",
            border: "none",
            color: tk.tabText,
            cursor: "pointer",
          }}
        >
          <FiSettings size={14} />
        </Button>
        <Button
          style={{
            padding: "6px",
            background: "transparent",
            border: "none",
            color: tk.tabText,
            cursor: "pointer",
          }}
        >
          <FiLogOut size={14} />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${tk.sidebarBorder}`,
      }}>
        <Button
          onClick={() => setActiveTab("elements")}
          style={{
            flex: 1,
            padding: "10px 8px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            border: "none",
            background: activeTab === "elements" ? tk.tabActive : "transparent",
            color: activeTab === "elements" ? tk.tabActiveText : tk.tabText,
            borderBottom: activeTab === "elements" ? `2px solid ${tk.tabActiveBorder}` : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Elements
        </Button>
        <Button
          onClick={() => setActiveTab("global")}
          style={{
            flex: 1,
            padding: "10px 8px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            border: "none",
            background: activeTab === "global" ? tk.tabActive : "transparent",
            color: activeTab === "global" ? tk.tabActiveText : tk.tabText,
            borderBottom: activeTab === "global" ? `2px solid ${tk.tabActiveBorder}` : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Global
        </Button>
      </div>

      {/* Search Input */}
      <div style={{ 
        padding: "12px 8px", 
        borderBottom: `1px solid ${tk.sidebarBorder}`,
        display: activeTab === "elements" ? "block" : "none"
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <FiSearch size={14} style={{ position: "absolute", left: 8, color: tk.tabText, pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search Widget..."
            value={search}
            onChange={handleSearch}
            style={{
              width: "100%",
              padding: "8px 8px 8px 32px",
              fontSize: 12,
              borderRadius: 4,
              border: `1px solid ${tk.sidebarBorder}`,
              background: tk.canvasBg,
              color: tk.headerText,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {/* Favorites Section */}
      <div style={{ 
        borderBottom: `1px solid ${tk.sidebarBorder}`,
        display: activeTab === "elements" ? "block" : "none"
      }}>
        <SidebarLabel color={tk.sectionLabel} borderColor={tk.sidebarBorder}>
          <FiStar size={12} style={{ display: "inline", marginRight: 6 }} />
          Favorites
        </SidebarLabel>
        <div style={{ 
          padding: "16px 8px", 
          fontSize: 12, 
          color: tk.tabText, 
          textAlign: "center",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {favorites.length === 0 ? "No favorites yet" : "Favorites loaded"}
        </div>
      </div>

      {/* Blocks Container - Always in DOM with better styling */}
      <div 
        id="gjs-blocks" 
        style={{ 
          flex: 1, 
          overflowY: "auto",
          padding: "12px 8px",
          display: activeTab === "elements" ? "block" : "none"
        }}
      >
        {/* GrapesJS will inject blocks here */}
      </div>

      {/* Global Content */}
      <div style={{ 
        padding: "20px 12px", 
        color: tk.tabText, 
        fontSize: 12, 
        textAlign: "center",
        display: activeTab === "global" ? "block" : "none",
        flex: 1,
        overflowY: "auto"
      }}>
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600 }}>Page Settings</h3>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Configure page title, featured image & layout</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600 }}>Navigator</h3>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Quick overview of all page elements</p>
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600 }}>History</h3>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Redo/Undo any action</p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        borderTop: `1px solid ${tk.sidebarBorder}`,
        padding: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        gap: "4px",
        background: tk.sidebar,
        flexShrink: 0,
      }}>
        <Button
          title="Settings"
          style={{
            padding: "8px",
            background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: tk.tabText,
            cursor: "pointer",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = tk.canvasBg}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          <FiSettings size={14} />
        </Button>

        <Button
          title="Undo"
          onClick={handleUndo}
          disabled={!undoAvailable}
          style={{
            padding: "8px",
            background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: undoAvailable ? tk.tabText : "#999",
            cursor: undoAvailable ? "pointer" : "not-allowed",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
            opacity: undoAvailable ? 1 : 0.5,
          }}
          onMouseOver={(e) => undoAvailable && (e.currentTarget.style.background = tk.canvasBg)}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <FiRotateCcw size={14} />
        </Button>

        <Button
          title="Redo"
          onClick={handleRedo}
          disabled={!redoAvailable}
          style={{
            padding: "8px",
            background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: redoAvailable ? tk.tabText : "#999",
            cursor: redoAvailable ? "pointer" : "not-allowed",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
            opacity: redoAvailable ? 1 : 0.5,
          }}
          onMouseOver={(e) => redoAvailable && (e.currentTarget.style.background = tk.canvasBg)}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <FiRotateCw size={14} />
        </Button>

        <Button
          title="Preview"
          onClick={() => {}}
          style={{
            padding: "8px",
            background: "transparent",
            border: `1px solid ${tk.sidebarBorder}`,
            color: tk.tabText,
            cursor: "pointer",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = tk.canvasBg}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          <FiEye size={14} />
        </Button>

        <div style={{ position: "relative" }}>
          <Button
            title={`Responsive (${currentDevice})`}
            onClick={() => setShowDeviceMenu((prev) => !prev)}
            style={{
              padding: "8px",
              background: showDeviceMenu ? tk.tabActive : "transparent",
              border: `1px solid ${tk.sidebarBorder}`,
              color: showDeviceMenu ? tk.tabActiveText : tk.tabText,
              cursor: "pointer",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              position: "relative",
            }}
            onMouseOver={(e) => {
              if (!showDeviceMenu) e.currentTarget.style.background = tk.canvasBg;
            }}
            onMouseOut={(e) => {
              if (!showDeviceMenu) e.currentTarget.style.background = "transparent";
            }}
          >
            {normalizeDevice(currentDevice) === "desktop" && <FiMonitor size={14} />}
            {normalizeDevice(currentDevice) === "tablet" && <FiTablet size={14} />}
            {normalizeDevice(currentDevice) === "mobile" && <FiSmartphone size={14} />}
          </Button>

          {showDeviceMenu && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              background: tk.sidebar,
              border: `1px solid ${tk.sidebarBorder}`,
              borderRadius: 4,
              marginBottom: "4px",
              zIndex: 1000,
              minWidth: "120px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              {[{ key: "desktop", label: "Desktop", icon: <FiMonitor size={14} /> }, { key: "tablet", label: "Tablet", icon: <FiTablet size={14} /> }, { key: "mobile", label: "Mobile", icon: <FiSmartphone size={14} /> }].map((device) => (
                <Button
                  key={device.key}
                  onClick={() => handleDeviceSelect(device.key)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    background: normalizeDevice(currentDevice) === device.key ? tk.tabActive : "transparent",
                    color: normalizeDevice(currentDevice) === device.key ? tk.tabActiveText : tk.tabText,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseOver={(e) => {
                    if (normalizeDevice(currentDevice) !== device.key) e.currentTarget.style.background = tk.canvasBg;
                  }}
                  onMouseOut={(e) => {
                    if (normalizeDevice(currentDevice) !== device.key) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {device.icon}
                  <span>{device.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={async () => {
            if (publishLoading) return;
            setPublishLoading(true);
            try {
              if (!currentPageId) {
                notifyError("Aucune page sÃ©lectionnÃ©e â€” impossible de publier.");
                return;
              }
              await saveCurrentPageNow();
              await updatePageStatus(currentPageId, true);
              notifySuccess("Page publiÃ©e avec succÃ¨s !");
            } catch (err) {
              console.error("Publish failed:", err);
              notifyError("Ã‰chec de la publication : " + (err?.message || err));
            } finally {
              setPublishLoading(false);
            }
          }}
          style={{
            padding: "8px 12px",
            background: publishLoading ? "#7d7d7d" : "#e91e63",
            border: "none",
            color: "#fff",
            cursor: publishLoading ? "not-allowed" : "pointer",
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            transition: "all 0.15s",
            marginLeft: "auto",
            opacity: publishLoading ? 0.7 : 1,
          }}
          onMouseOver={(e) => {
            if (!publishLoading) e.currentTarget.style.background = "#c2185b";
          }}
          onMouseOut={(e) => {
            if (!publishLoading) e.currentTarget.style.background = "#e91e63";
          }}
        >
          <FiPlay size={12} /> {publishLoading ? "PUBLISHING..." : "PUBLISH"}
        </Button>
      </div>
    </div>
  );
};

export default LeftSidebar;
