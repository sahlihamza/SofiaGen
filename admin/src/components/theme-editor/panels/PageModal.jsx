import React, { useState } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import { Button } from "@sofia/ui";

const PageModal = () => {
  const { tk, showAddPageModal, setShowAddPageModal, addPage } = useEditor();
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  if (!showAddPageModal) return null;

  const handleNameChange = (e) => {
    const name = e.target.value;
    setNewPageName(name);
    // Auto-generate slug from name if user hasn't customised it yet
    setNewPageSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""));
  };

  const handleClose = () => {
    setShowAddPageModal(false);
    setNewPageName("");
    setNewPageSlug("");
    setError("");
  };

  const handleCreate = async () => {
    const name = newPageName.trim();
    const slug = newPageSlug.trim() || name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    if (!name) return;
    setIsCreating(true);
    setError("");
    try {
      await addPage({ name, slug });
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create page");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}>
      <div style={{
        background: tk.sidebar,
        padding: 24,
        borderRadius: 8,
        width: 380,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        border: `1px solid ${tk.sidebarBorder}`
      }}>
        <h3 style={{ margin: "0 0 15px 0", color: tk.headerText, fontSize: 16 }}>Add New Page</h3>

        {/* Page Name */}
        <label style={{ fontSize: 11, color: tk.tabText, fontWeight: 600, display: "block", marginBottom: 4 }}>Page Name</label>
        <input
          autoFocus
          type="text"
          placeholder="e.g. Product Details"
          value={newPageName}
          onChange={handleNameChange}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 4,
            border: `1px solid ${tk.sidebarBorder}`,
            background: tk.canvasBg,
            color: tk.headerText,
            marginBottom: 12,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* URL Slug */}
        <label style={{ fontSize: 11, color: tk.tabText, fontWeight: 600, display: "block", marginBottom: 4 }}>URL Slug</label>
        <input
          type="text"
          placeholder="e.g. product-details"
          value={newPageSlug}
          onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 4,
            border: `1px solid ${tk.sidebarBorder}`,
            background: tk.canvasBg,
            color: tk.headerText,
            marginBottom: 16,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        />

        {/* Error */}
        {error && (
          <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 4 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button
            onClick={handleClose}
            disabled={isCreating}
            style={{
              padding: "6px 12px",
              background: "transparent",
              color: tk.tabText,
              border: "none",
              cursor: isCreating ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              opacity: isCreating ? 0.5 : 1,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !newPageName.trim()}
            style={{
              padding: "6px 16px",
              background: isCreating ? "#6ee7b7" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: (isCreating || !newPageName.trim()) ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "background 0.2s",
            }}
          >
            {isCreating ? "Creatingâ€¦" : "Create Page"}
          </Button>

        </div>
      </div>
    </div>
  );
};

export default PageModal;
