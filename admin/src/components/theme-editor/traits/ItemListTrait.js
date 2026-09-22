import React from "react";
import { createRoot } from "react-dom/client";
import ListFieldEditor from "./components/ListFieldEditor";

export const ItemListTrait = (name, label, itemSchema, opts = {}) => ({
  name,
  label,
  type: "item-list",
  changeProp: 1,
  itemSchema,
  default: opts.default || [],
  addLabel: opts.addLabel || "+ Ajouter",
  emptyLabel: opts.emptyLabel || "Aucun Élément",
});

export function registerItemListTrait(editor) {
  editor.TraitManager.addType("item-list", {
    createInput({ trait }) {
      const el = document.createElement("div");
      return el;
    },
    onEvent() {},
    onUpdate({ elInput, component, trait }) {
      const name = trait.get("name");
      const schema = trait.get("itemSchema") || [];
      let items = component.get(name);
      if (items === undefined || items === null) {
        items = trait.get("default") || [];
      }
      try {
        if (typeof items === "string") items = JSON.parse(items);
      } catch (e) {
        // ignore
      }

      const onChange = (next) => {
        component.set(name, next);
      };

      if (!elInput.__itemRoot) {
        elInput.__itemRoot = createRoot(elInput);

        const observer = new MutationObserver(() => {
          if (!elInput.isConnected) {
            elInput.__itemRoot.unmount();
            elInput.__itemRoot = null;
            observer.disconnect();
          }
        });
        observer.observe(elInput.parentNode || document.body, { childList: true, subtree: true });
      }

      elInput.__itemRoot.render(
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
