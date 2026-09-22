import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import ThemeEditorServices from "../../../services/ThemeEditorServices";
import { Button } from "@sofia/ui";

/**
 * PreviewDrawer â€” renders the current page through the full server-side pipeline:
 *   GlobalSection header/footer + nav menu injection + page body + CSS.
 *
 * Falls back to a basic client-side render (editor.getHtml()) when:
 *   - The page hasn't been saved to the DB yet (no currentPageId)
 *   - The backend preview endpoint fails
 *
 * Mobile note: the "mobile" menu is JSON-only (served by
 * GET /api/stores/:storeId/menus?location=mobile) and is NOT injected here â€”
 * it is consumed by the storefront JS at runtime. This is intentional; do not
 * attempt to inject it as static HTML by symmetry with header/footer.
 */
const PreviewDrawer = ({ onClose }) => {
  const { editor, currentPageId, tk } = useEditor();
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("server"); // "server" | "client"

  const renderPreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Try server-side full-pipeline preview first
    if (currentPageId && mode === "server") {
      try {
        const data = await ThemeEditorServices.previewPage(currentPageId);
        const html = data?.html || data?.renderedHtml || "";
        const css = data?.css || data?.renderedCss || "";
        const fullDoc = `<!doctype html><html><head><meta charset="utf-8"/><style>
  body { margin: 0; padding: 0; min-height: 100vh; font-family: system-ui, sans-serif; }
  ${css}
</style></head><body>${html}</body></html>`;
        doc.open();
        doc.write(fullDoc);
        doc.close();
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn("Server preview failed, falling back to client render:", err.message);
        // fallthrough to client render
      }
    }

    // Client-side fallback: bare GrapesJS canvas HTML (no header/footer/menus)
    if (editor) {
      const html = editor.getHtml();
      let css = "";
      try { css = editor.getCss({ avoidProtected: true }); } catch { css = editor.getCss(); }
      const fullDoc = `<!doctype html><html><head><meta charset="utf-8"/><style>
  body { margin: 0; padding: 0; min-height: 100vh; background: ${tk.canvasBg}; font-family: system-ui, sans-serif; }
  ${css}
</style></head><body>${html}</body></html>`;
      doc.open();
      doc.write(fullDoc);
      doc.close();
    }
    setIsLoading(false);
  }, [currentPageId, editor, mode, tk.canvasBg]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  if (!editor) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10010,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: 1200,
          height: "90%",
          background: tk.sidebar,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: `1px solid ${tk.sidebarBorder}`,
            background: tk.header,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: tk.headerText }}>
              Live Preview
            </div>
            <div style={{ fontSize: 12, color: tk.tabText, marginTop: 2 }}>
              {mode === "server"
                ? "Full render â€” header, footer & navigation menus included."
                : "Client render â€” page body only (no header/footer)."}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Toggle between full server render and bare client render */}
            <Button
              onClick={() => setMode(m => m === "server" ? "client" : "server")}
              title={mode === "server" ? "Switch to client-only render" : "Switch to full server render"}
              style={{
                border: `1px solid ${tk.sidebarBorder}`,
                borderRadius: 6,
                padding: "5px 10px",
                background: tk.canvasBg,
                color: tk.headerText,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {mode === "server" ? "ðŸŒ Full" : "ðŸ“ Canvas only"}
            </Button>

            <Button
              onClick={renderPreview}
              style={{
                border: `1px solid ${tk.sidebarBorder}`,
                borderRadius: 6,
                padding: "6px 12px",
                background: tk.canvasBg,
                color: tk.headerText,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ðŸ”„ Refresh
            </Button>

            <Button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: tk.headerText,
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              Ã—
            </Button>

          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 20px", fontSize: 12 }}>
            âš ï¸ {error}
          </div>
        )}

        {/* Preview area */}
        <div style={{ flex: 1, position: "relative", background: "#fff" }}>
          {isLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "rgba(255,255,255,0.8)",
                zIndex: 1,
                color: "#111",
                fontWeight: 600,
                gap: 10,
                fontSize: 14,
              }}
            >
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>âŸ³</span>
              Rendering previewâ€¦
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="Theme editor preview"
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewDrawer;
