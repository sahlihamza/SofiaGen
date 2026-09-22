import React, { useState, useEffect, useMemo } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import PageSeoPanel from "../PageSeoPanel";
import Inspector from "./Inspector";
import AccordionEditorPanel from "../AccordionEditorPanel";
import { Button } from "@sofia/ui";

const BASE_TABS = [
  { id: "layers", label: "Layers" },
  { id: "styles", label: "Styles" },
  { id: "traits", label: "Traits" },
];

const RightSidebar = () => {
  const { tk, isEditingPopup, selectedComponent, editor, setSelectedComponent } = useEditor();
  const [active, setActive] = useState("layers");

  useEffect(() => {
    if (isEditingPopup && active === "seo") {
      setActive("layers");
    }
  }, [isEditingPopup, active]);

  const hasTraitsTab = useMemo(() => !!selectedComponent, [selectedComponent]);
  const isAccordion = useMemo(() => !!(selectedComponent && typeof selectedComponent.get === 'function' && selectedComponent.get('type') === 'accordion-component'), [selectedComponent]);

  useEffect(() => {
    if (active === "traits" && editor) {
      try {
        const actuallySelected = editor.getSelected && editor.getSelected();
        if (actuallySelected && actuallySelected !== selectedComponent) {
          if (typeof setSelectedComponent === "function") {
            setSelectedComponent(actuallySelected);
          } else {
            // setSelectedComponent is not a function â€” skip resync

          }
        }
        if (!actuallySelected && selectedComponent) {
          if (typeof setSelectedComponent === "function") {
            setSelectedComponent(null);
          } else {
            // setSelectedComponent is not a function â€” skip clearing

          }
        }
      } catch (e) {
        // swallow resync error
      }
    }
    // Intentionally exclude selectedComponent from deps to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, editor]);

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      background: tk.sidebar,
      borderLeft: `1px solid ${tk.sidebarBorder}`,
      overflow: "hidden",
      transition: "background 0.25s",
    }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          {BASE_TABS.concat(isEditingPopup ? [] : [{ id: "seo", label: "SEO" }]).concat(isAccordion ? [{ id: "accordion", label: "Accordion" }] : []).map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                border: "none",
                cursor: "pointer",
                background: active === tab.id ? tk.tabActive : "transparent",
                color: active === tab.id ? tk.tabActiveText : tk.tabText,
                borderBottom: active === tab.id ? `2px solid ${tk.tabActiveBorder}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab content â€“ always mounted so GrapesJS can attach */}

        <div id="gjs-layers" style={{ flex: 1, overflowY: "auto", display: active === "layers" ? "block" : "none" }} />
        <div id="gjs-styles" style={{ flex: 1, overflowY: "auto", display: active === "styles" ? "block" : "none" }} />
        <div id="gjs-traits" style={{ display: "none" }} />
        <div style={{ flex: 1, overflowY: "auto", display: active === "traits" ? "block" : "none" }}>
          <Inspector selectedComponent={selectedComponent} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: active === "accordion" ? "block" : "none" }}>
          <AccordionEditorPanel rootComponent={selectedComponent} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: active === "seo" ? "block" : "none" }}>
          <PageSeoPanel />
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
