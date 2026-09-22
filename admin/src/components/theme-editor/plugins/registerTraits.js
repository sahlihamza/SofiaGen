import React from "react";
import { createRoot } from "react-dom/client";
import ListFieldEditor from "../traits/components/ListFieldEditor";
import MediaPickerTraitField from "../traits/components/MediaPickerTraitField";
import { ImageTrait, HeightTrait, OpacityTrait, CssClassTrait, CustomIdTrait, ZIndexTrait, ResponsiveVisibilityTrait, IconPickerTrait } from "../traits";
import IconPickerTraitField from "../traits/icon/IconPickerTraitField";
import { registerListFieldTrait } from "../traits/ListFieldTrait.js";
import { registerItemListTrait } from "../traits/ItemListTrait.js";

export default function registerTraits(editor) {
  registerListFieldTrait(editor);
  registerItemListTrait(editor);

  editor.TraitManager.addType("list", {
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
        items = [];
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

  editor.TraitManager.addType("responsiveVisibility", {
    createInput({ trait }) {
      const el = document.createElement("div");
      el.innerHTML = `
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
          <input type="checkbox" data-device="desktop" /> Masquer Desktop
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
          <input type="checkbox" data-device="tablet" /> Masquer Tablet
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
          <input type="checkbox" data-device="mobile" /> Masquer Mobile
        </label>
      `;
      return el;
    },
    onEvent({ elInput, component, trait }) {
      elInput.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const current = component.get(trait.get("name")) || {};
          const updated = { ...current, [cb.dataset.device]: cb.checked };
          component.set(trait.get("name"), updated);
          ["desktop", "tablet", "mobile"].forEach((d) => component.removeClass(`hidden-${d}`));
          Object.entries(updated).forEach(([d, hidden]) => {
            if (hidden) component.addClass(`hidden-${d}`);
          });
        });
      });
    },
    onUpdate({ elInput, component, trait }) {
      const value = component.get(trait.get("name")) || {};
      elInput.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = !!value[cb.dataset.device];
      });
    },
  });

  editor.TraitManager.addType("media-picker", {
    createInput({ trait }) {
      const el = document.createElement("div");
      return el;
    },
    onEvent() {},
    onUpdate({ elInput, component, trait }) {
      const name = trait.get("name");
      const currentUrl = component.get(name) || "";

      if (!elInput.__mediaPickerRoot) {
        elInput.__mediaPickerRoot = createRoot(elInput);

        const observer = new MutationObserver(() => {
          if (!elInput.isConnected) {
            elInput.__mediaPickerRoot.unmount();
            elInput.__mediaPickerRoot = null;
            observer.disconnect();
          }
        });
        observer.observe(elInput.parentNode || document.body, { childList: true, subtree: true });
      }

      elInput.__mediaPickerRoot.render(
        React.createElement(MediaPickerTraitField, {
          value: currentUrl,
          onChange: (url) => component.set(name, url),
        })
      );
    },
  });

  editor.TraitManager.addType("icon-picker", {
    createInput({ trait }) {
      const el = document.createElement("div");
      return el;
    },
    onEvent() {},
    onUpdate({ elInput, component, trait }) {
      const name = trait.get("name");
      const currentValue = component.get(name) || "";

      if (!elInput.__iconPickerRoot) {
        elInput.__iconPickerRoot = createRoot(elInput);

        const observer = new MutationObserver(() => {
          if (!elInput.isConnected) {
            elInput.__iconPickerRoot.unmount();
            elInput.__iconPickerRoot = null;
            observer.disconnect();
          }
        });
        observer.observe(elInput.parentNode || document.body, { childList: true, subtree: true });
      }

      elInput.__iconPickerRoot.render(
        React.createElement(IconPickerTraitField, {
          value: currentValue,
          onChange: (icon) => component.set(name, icon),
          storeId: window.__STORE_ID__,
        })
      );
    },
  });

  editor.EditorTraits = {
    ImageTrait,
    HeightTrait,
    OpacityTrait,
    CssClassTrait,
    CustomIdTrait,
    ZIndexTrait,
    ResponsiveVisibilityTrait,
    IconPickerTrait,
  };
}
