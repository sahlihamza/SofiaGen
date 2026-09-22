import React, { useEffect, useState } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import ListFieldEditor from "../traits/components/ListFieldEditor";
import { Button } from "@sofia/ui";

export default function AccordionEditorPanel({ rootComponent }) {
  const { editor } = useEditor();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!rootComponent) return;
    const raw = rootComponent.get("items");
    let parsed = raw;
    try {
      if (typeof raw === "string") parsed = JSON.parse(raw);
    } catch (e) {
      parsed = raw || [];
    }
    setItems(Array.isArray(parsed) ? parsed : []);
  }, [rootComponent]);

  const commit = (next) => {
    setItems(next);
    if (rootComponent && typeof rootComponent.set === "function") {
      rootComponent.set("items", next);
    }
  };

  const focusBody = (index) => {
    if (!rootComponent || !editor) return;
    const rootId = rootComponent.getId();
    // find corresponding body component in editor by attribute data-acc-root and index
    try {
      const canvasComps = rootComponent.components().find(c => c.getClasses && c.getClasses().includes('accordion-wrapper')) || null;
      if (!canvasComps) return;
      const itemsComps = canvasComps.components();
      const itemComp = itemsComps[index];
      if (itemComp) {
        // body is second child
        const body = itemComp.components().filter(c => c.get('attributes')?.['data-gjs-type'] === 'accordion-body')[0] || itemComp.components()[1];
        if (body) editor.select(body);
      }
    } catch (e) {}
  };

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: "0 0 8px 0" }}>Accordion Editor</h3>
      <div style={{ marginBottom: 12 }}>
        <ListFieldEditor
          items={items}
          itemSchema={[{ key: "title", label: "Titre", type: "text" }, { key: "content", label: "Contenu", type: "textarea" }]}
          onChange={(next) => commit(next)}
          addLabel="Ajouter un item"
          emptyLabel="Aucun item"
        />
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>
        <p style={{ margin: 0 }}>Actions rapides :</p>
        <ul style={{ paddingLeft: 18 }}>
          {items.map((it, idx) => (
            <li key={it.id || idx} style={{ marginBottom: 6 }}>
              <Button type="button" onClick={() => focusBody(idx)} style={{ marginRight: 8 }}>SÃ©lectionner contenu #{idx + 1}</Button>

            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
