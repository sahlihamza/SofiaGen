import React from "react";
import { createRoot } from "react-dom/client";
import ListFieldEditor from "./components/ListFieldEditor";

/**
 * GrapesJS custom trait type "listField".
 *
 * Renders the reusable <ListFieldEditor/> React component inside the trait
 * panel. The edited array is stored on the component as a JSON-serialised
 * string under `trait.get("name")` (kept as a prop so it persists in
 * projectData). The structure of each item is described by `itemSchema`.
 *
 * Usage in a component's `traits`:
 *   {
 *     name: "items",
 *     label: "Éléments",
 *     type: "listField",
 *     changeProp: 1,
 *     itemSchema: [
 *       { key: "label", label: "Libellé", type: "text" },
 *       { key: "url", label: "Lien", type: "url" },
 *     ],
 *     default: "[]",
 *   }
 */
export const ListFieldTrait = (name, label, itemSchema, opts = {}) => ({
  name,
  label,
  type: "listField",
  changeProp: 1,
  itemSchema,
  default: opts.default || "[]",
  addLabel: opts.addLabel,
  emptyLabel: opts.emptyLabel,
});

export function registerListFieldTrait(editor) {
  editor.TraitManager.addType("listField", {
    createInput({ trait }) {
      const el = document.createElement("div");
      return el;
    },
    onEvent() {
      // No-op: updates are pushed from React via component.set
    },
    onUpdate({ elInput, component, trait }) {
      const name = trait.get("name");
      const schema = trait.get("itemSchema") || [];
      let items = [];
      try {
        const raw = component.get(name);
        items = raw ? JSON.parse(raw) : [];
      } catch (e) {
        items = [];
      }

      const onChange = (next) => {
        component.set(name, JSON.stringify(next));
      };

      if (!elInput.__listRoot) {
        elInput.__listRoot = createRoot(elInput);

        const observer = new MutationObserver(() => {
          if (!elInput.isConnected) {
            elInput.__listRoot.unmount();
            elInput.__listRoot = null;
            observer.disconnect();
          }
        });
        observer.observe(elInput.parentNode || document.body, { childList: true, subtree: true });
      }

      elInput.__listRoot.render(
        React.createElement(ListFieldEditor, {
          items,
          itemSchema: schema,
          onChange,
          addLabel: trait.get("addLabel"),
          emptyLabel: trait.get("emptyLabel"),
        })
      );
    },
  });
}
