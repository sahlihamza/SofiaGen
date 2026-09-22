import React, { useState, useEffect, useCallback } from "react";

import { Button } from "@sofia/ui";


const EditorTopbar = ({ editorInstance, onOpenHistory }) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryState = useCallback(() => {
    if (!editorInstance) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }
    try {
      const um = editorInstance.UndoManager;
      setCanUndo(Boolean(um && typeof um.hasUndo === "function" && um.hasUndo()));
      setCanRedo(Boolean(um && typeof um.hasRedo === "function" && um.hasRedo()));
    } catch (err) {
      console.debug("updateHistoryState error", err);
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [editorInstance]);

  useEffect(() => {
    if (!editorInstance) return;

    // Listen to relevant editor events to refresh buttons state
    const evtNames = "component:add component:remove component:update style:update";
    editorInstance.on(evtNames, updateHistoryState);
    editorInstance.on("run:undo run:redo", updateHistoryState);
    updateHistoryState();

    // Register scoped keymaps on the editor (won't interfere with inputs outside canvas)
    try {
      if (editorInstance.Keymaps && typeof editorInstance.Keymaps.add === "function") {
        editorInstance.Keymaps.add("core:undo", "ctrl+z", () => { editorInstance.UndoManager && editorInstance.UndoManager.undo(); updateHistoryState(); });
        editorInstance.Keymaps.add("core:undo", "meta+z", () => { editorInstance.UndoManager && editorInstance.UndoManager.undo(); updateHistoryState(); });
        editorInstance.Keymaps.add("core:redo", "ctrl+shift+z", () => { editorInstance.UndoManager && editorInstance.UndoManager.redo(); updateHistoryState(); });
        editorInstance.Keymaps.add("core:redo", "ctrl+y", () => { editorInstance.UndoManager && editorInstance.UndoManager.redo(); updateHistoryState(); });
      }
    } catch (e) {
      console.debug("Failed to register keymaps for undo/redo", e);
    }

    return () => {
      editorInstance.off(evtNames, updateHistoryState);
      editorInstance.off("run:undo run:redo", updateHistoryState);
    };
  }, [editorInstance, updateHistoryState]);

  const handleUndo = useCallback(() => {
    if (!editorInstance) return;
    try {
      const um = editorInstance.UndoManager;
      if (um && typeof um.undo === "function" && typeof um.hasUndo === "function" && um.hasUndo()) {
        um.undo();
        updateHistoryState();
      }
    } catch (e) {
      console.error("Undo failed", e);
    }
  }, [editorInstance, updateHistoryState]);

  const handleRedo = useCallback(() => {
    if (!editorInstance) return;
    try {
      const um = editorInstance.UndoManager;
      if (um && typeof um.redo === "function" && typeof um.hasRedo === "function" && um.hasRedo()) {
        um.redo();
        updateHistoryState();
      }
    } catch (e) {
      console.error("Redo failed", e);
    }
  }, [editorInstance, updateHistoryState]);

  const handleSave = () => {
    if (editorInstance) {
      const html = editorInstance.getHtml();
      const css = editorInstance.getCss();
      console.log("Saving template...", { html, css });
      // Send to backend
    }
  };

  const handlePreview = () => {
    if (editorInstance) {
      const html = editorInstance.getHtml();
      const previewWindow = window.open();
      if (previewWindow) {
        try {
          const blob = new Blob([html], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          previewWindow.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (e) {
          // Last-resort fallback to open a blank window
          console.debug("preview fallback", e);
        }
      }
    }
  };

  const handleClear = () => {
    if (editorInstance) {
      editorInstance.setComponents([]);
      editorInstance.setStyle("");
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-gray-100 border-b border-gray-300">
      <h2 className="text-xl font-semibold">Theme Editor</h2>
      <div className="flex gap-2 items-center">
        <Button onClick={handleUndo} disabled={!canUndo} layout="outline" title="Annuler (Ctrl+Z)">â†</Button>
        <Button onClick={handleRedo} disabled={!canRedo} layout="outline" title="RÃ©tablir (Ctrl+Shift+Z)">â†’</Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button onClick={() => onOpenHistory && onOpenHistory()} layout="outline" title="Historique des versions">Historique</Button>
        <Button onClick={handlePreview} layout="outline">Preview</Button>
        <Button onClick={handleClear} layout="outline">Clear</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
};

export default EditorTopbar;
