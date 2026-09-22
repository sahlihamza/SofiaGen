import React, { useEffect, useState } from "react";
import { FiPlus, FiFolder } from "react-icons/fi";
import { useEditor } from "../hooks/editor/EditorProvider";
import ContextMenu from "../ContextMenu";
import { Button } from "@sofia/ui";

const Canvas = () => {
  const { editorRef, editor, tk, isPageEmpty, setShowAddPageModal } = useEditor();
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    target: null,
  });

  useEffect(() => {
    if (!editor) return;

    const normalizeTargetElement = (target) => {
      if (!target) return null;
      if (target.nodeType === Node.TEXT_NODE) {
        return target.parentElement;
      }
      return target;
    };

    const handleContextMenu = (e) => {
      if (!editor) return;
      e.preventDefault();

      const targetElement = normalizeTargetElement(e.target);
      const clickedComponent = typeof editor.getModelFromEl === "function"
        ? editor.getModelFromEl(targetElement)
        : null;
      const selected = clickedComponent || editor.getSelected();
      if (!selected) {
        setContextMenu({ visible: false, position: { x: 0, y: 0 }, target: null });
        return;
      }

      try {
        editor.select(selected);
      } catch (err) {
        console.debug("ThemeEditor: select failed", err);
      }

      let x = e.clientX;
      let y = e.clientY;
      try {
        const frameElFromEvent = e.view?.frameElement;
        const iframeEl = frameElFromEvent || editor?.Canvas?.getFrameEl?.();
        if (iframeEl && typeof iframeEl.getBoundingClientRect === "function") {
          const rect = iframeEl.getBoundingClientRect();
          x = x + rect.left;
          y = y + rect.top;
        }
      } catch (err) {
        console.debug("ThemeEditor: frame coordinate calculation failed", err);
      }

      setContextMenu({
        visible: true,
        position: { x, y },
        target: selected,
      });

      console.debug("ThemeEditor: contextmenu", { x, y, selected });
    };

    const attachHandlers = () => {
      const canvasEl = editorRef.current;
      const frameEl = editor?.Canvas?.getFrameEl?.();
      const frameDoc = frameEl?.contentDocument || frameEl?.contentWindow?.document;

      if (frameDoc && !frameDoc.__tsThemeEditorContextMenuAttached) {
        frameDoc.__tsThemeEditorContextMenuAttached = true;
        frameDoc.addEventListener("contextmenu", handleContextMenu, true);
      }
      if (frameEl && typeof frameEl.addEventListener === "function" && !frameEl.__tsThemeEditorContextMenuAttached) {
        frameEl.__tsThemeEditorContextMenuAttached = true;
        frameEl.addEventListener("contextmenu", handleContextMenu, true);
      }
      if (canvasEl && !canvasEl.__tsThemeEditorContextMenuAttached) {
        canvasEl.__tsThemeEditorContextMenuAttached = true;
        canvasEl.addEventListener("contextmenu", handleContextMenu, true);
      }

      return { frameDoc, frameEl, canvasEl };
    };

    const handlers = attachHandlers();
    const frameEl = editor?.Canvas?.getFrameEl?.();
    if (frameEl && typeof frameEl.addEventListener === "function") {
      frameEl.addEventListener("load", attachHandlers, true);
    }
    if (typeof editor.on === "function") {
      editor.on("canvas:frame:load", attachHandlers);
    }

    return () => {
      if (handlers.frameDoc) handlers.frameDoc.removeEventListener("contextmenu", handleContextMenu, true);
      if (handlers.frameEl && typeof handlers.frameEl.removeEventListener === "function") {
        handlers.frameEl.removeEventListener("contextmenu", handleContextMenu, true);
        handlers.frameEl.removeEventListener("load", attachHandlers, true);
      }
      handlers.canvasEl?.removeEventListener("contextmenu", handleContextMenu, true);
      if (typeof editor.off === "function") {
        editor.off("canvas:frame:load", attachHandlers);
      }
    };
  }, [editor, editorRef]);

  const closeContextMenu = () => {
    setContextMenu({ visible: false, position: { x: 0, y: 0 }, target: null });
  };

  return (
    <div
      ref={editorRef}
      style={{ 
        flex: 1, 
        position: "relative", 
        overflow: "hidden", 
        background: tk.canvasBg, 
        transition: "background 0.25s" 
      }}
    >
      {isPageEmpty && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          zIndex: 5,
          pointerEvents: "none",
        }}>
          <div style={{
            width: "100%",
            maxWidth: 520,
            background: tk.sidebar,
            border: `1px solid ${tk.sidebarBorder}`,
            borderRadius: 18,
            padding: "30px 28px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            pointerEvents: "auto",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14, color: tk.sectionLabel }}>
              La zone dâ€™ajout dâ€™une section ou dâ€™un modÃ¨le
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: tk.headerText, marginBottom: 24 }}>
              La conception dâ€™une page Ã  partir de zÃ©ro dÃ©marre au centre de lâ€™Ã©cran. Deux possibilitÃ©s sâ€™offrent Ã  vous :

            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <Button
                type="button"
                onClick={() => setShowAddPageModal(true)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  minHeight: 110,
                  borderRadius: 16,
                  background: tk.canvasBg,
                  border: `1px solid ${tk.sidebarBorder}`,
                  color: tk.headerText,
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                onFocus={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onBlur={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 18,
                }}>
                  <FiPlus />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Ajouter une nouvelle section</div>
              </Button>
              <Button
                type="button"
                onClick={() => setShowAddPageModal(true)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  minHeight: 110,
                  borderRadius: 16,
                  background: tk.canvasBg,
                  border: `1px solid ${tk.sidebarBorder}`,
                  color: tk.headerText,
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                onFocus={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onBlur={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 18,
                }}>
                  <FiFolder />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>InsÃ©rer un modÃ¨le de page</div>
              </Button>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: tk.tabText }}>
              Cliquez sur lâ€™icÃ´ne Â« + Â» pour ajouter une nouvelle section, ou sur lâ€™icÃ´ne reprÃ©sentant un dossier pour insÃ©rer un modÃ¨le prÃªt Ã  lâ€™emploi.

            </div>
          </div>
        </div>
      )}
      <ContextMenu
        isVisible={contextMenu.visible}
        position={contextMenu.position}
        target={contextMenu.target}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default Canvas;
