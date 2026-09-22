/**
 * Tabs Block  container with N tabs. Each tab has a label and a droppable
 * content area (free widgets, not just text). Tab definitions are edited with
 * the reusable "listField" trait. Navigation is handled by a small inline
 * script that toggles panels by index.
 *
 * Structure is built as MODEL components (so server-side getHtml() renders it),
 * not injected DOM  keeping the canvas and storefront output identical.
 */

import { colorTraits, borderTraits, spacingTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle, applyTypographyStyle } from "../../traits/utils/applyCommonStyles";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

export const TabsBlock = {
  id: "tabs-block",
  label: "= Tabs",
  category: "Content",
  content: {
    type: "tabs-component",
  },
  attributes: { class: "fa fa-folder" },
};

const defaultTabs = () => [
  {
    label: "Description",
    content: "Découvrez les détails essentiels de ce produit, sa matière, et ses avantages pour votre quotidien.",
    id: `tab-${Date.now()}`,
  },
  {
    label: "Caractéristiques",
    content: "Taille : M, Composition : coton 100%, Entretien : lavage en machine  30éC.",
    id: `tab-${Date.now() + 1}`,
  },
  {
    label: "Avis clients",
    content: "Plus de 120 clients satisfaits recommandent ce produit pour sa qualité et son confort.",
    id: `tab-${Date.now() + 2}`,
  },
];

export const TabsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("tabs-component"),
  model: {
    defaults: {
      type: "tabs-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "tabs-component", "data-placeholder-content": "true" },
      styles: `
        .tabs-component { width: 100%; }
        .tabs-nav {
          display: flex;
          flex-wrap: wrap;
          gap: var(--tab-gap, 4px);
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 16px;
        }
        .tab-btn {
          padding: var(--tab-padding, 10px) 18px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: var(--tab-font-size, 14px);
          font-weight: var(--tab-font-weight, 600);
          color: var(--tab-inactive-color, #6b7280);
          border-bottom: 2px solid transparent;
        }
        .tab-btn.active { color: var(--tab-active-color, #667eea); border-bottom-color: var(--tab-active-color, #667eea); }
        .tab-panel { display: none; padding: var(--tab-panel-pad, 8px) 0; min-height: 60px; }
        .tab-panel.active { display: block; }
      `,
      traits: [
        {
          name: "tabs",
          label: "Onglets",
          type: "item-list",
          changeProp: 1,
          default: defaultTabs(),
          itemSchema: [
            { key: "label", label: "Libellé", type: "text" },
            { key: "content", label: "Contenu", type: "textarea" },
          ],
          category: "content",
        },
        ...colorTraits({ prefix: "tab", fields: ["active", "inactive"], defaults: { active: "#667eea", inactive: "#6b7280" } }),
        ...spacingTraits({ prefix: "tab", defaults: { padding: 10, gap: 4 } }),
        ...typographyTraits({ prefix: "tab", defaults: { size: 14, weight: "600", transform: "none" } }),
        {
          name: "panelPadding",
          label: "Padding panel (px)",
          type: "number",
          default: 8,
          min: 0,
          max: 40,
          changeProp: 1,
          category: "style",
        },
      ],
      components: [],
    },

    buildIfFresh() {
      if (this.components().length === 0) this.syncTabs();
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:tabs", this.syncTabs);
      this.on("updated", this.bindPreview);
      this.on("change:tabActiveColor change:tabInactiveColor change:tabPadding change:tabFontSize change:tabFontWeight change:tabTextTransform change:panelPadding change:tabGap change:tabSpacing", this.updateTabStyles);
      attachPlaceholderContentListener(this, ["change:tabs"]);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());

      try {
        const itemToComponentDef = (t, i) => ({
          tagName: "div",
          attributes: { class: "tabs-item", "data-tab-id": t.id || `tab-${Date.now() + i}` },
          selectable: false,
          hoverable: false,
          components: [
            {
              tagName: "button",
              attributes: { type: "button", class: "tab-btn" + (i === 0 ? " active" : ""), "data-tab-target": String(i), "data-tabs-root": rootId, role: "tab", tabindex: "0" },
              content: t.label || `Onglet ${i + 1}`,
              selectable: false,
              hoverable: false,
              editable: false,
            },
            {
              tagName: "div",
              attributes: { class: "tab-panel" + (i === 0 ? " active" : ""), "data-tab-panel": String(i), "data-tabs-root": rootId, "data-gjs-droppable": "true", "data-gjs-type": "tab-panel", role: "tabpanel" },
              droppable: true,
              selectable: true,
              components: [
                {
                  tagName: "p",
                  attributes: { class: "accordion-body-text" },
                  content: t.content || "",
                  selectable: false,
                  hoverable: false,
                  editable: false,
                },
              ],
            },
          ],
        });

        bindItemListSync && bindItemListSync(this, "tabs", ".tabs-wrapper", itemToComponentDef);
      } catch (e) {}

      if (typeof document !== "undefined") {
        this._tabClickHandler = (e) => {
          const btn = e.target.closest(".tab-btn");
          if (!btn) return;
          const rootEl = btn.closest(".tabs-component");
          if (!rootEl) return;
          const idx = btn.getAttribute("data-tab-target");
          const rootId = btn.getAttribute("data-tabs-root");
          rootEl.querySelectorAll(`.tab-btn[data-tabs-root="${rootId}"]`).forEach((b) => b.classList.toggle("active", b === btn));
          rootEl.querySelectorAll(`.tab-panel[data-tabs-root="${rootId}"]`).forEach((p) => p.classList.toggle("active", p.getAttribute("data-tab-panel") === idx));
        };
        document.addEventListener("click", this._tabClickHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._tabClickHandler) {
        document.removeEventListener("click", this._tabClickHandler);
        this._tabClickHandler = null;
      }
    },

    updateTabStyles() {
      const el = this.view?.el;
      if (!el) return;
      const activeColor = this.get("tabActiveColor") || "#667eea";
      const inactiveColor = this.get("tabInactiveColor") || "#6b7280";
      let tabPad = this.get("tabPadding") || 10;
      const panelPad = this.get("panelPadding") || 8;
      // spacing: prefer composite `tabSpacing` then fall back to primitives
      try {
        const composite = this.get("tabSpacing");
        if (composite) {
          tabPad = composite.padding ?? composite.top ?? composite.vertical ?? tabPad;
          const gap = composite.gap ?? composite.spacing;
          if (gap !== undefined) el.style.setProperty("--tab-gap", `${gap}px`);
        } else {
          const defaultGap = this.get("tabGap") || 4;
          el.style.setProperty("--tab-gap", `${defaultGap}px`);
        }
      } catch (e) {
        const defaultGap = this.get("tabGap") || 4;
        el.style.setProperty("--tab-gap", `${defaultGap}px`);
      }

      el.style.setProperty("--tab-active-color", activeColor);
      el.style.setProperty("--tab-inactive-color", inactiveColor);
      el.style.setProperty("--tab-padding", `${tabPad}px`);
      el.style.setProperty("--tab-panel-pad", `${panelPad}px`);

      // Typography composite will be read by applyTypographyStyle if present
      applyTypographyStyle(el, this, { prefix: "tab", selector: ".tab-btn" });

      // Allow composite tab background overrides (color) if provided
      try {
        const tabBg = this.get("tabBg");
        if (tabBg && tabBg.color) {
          el.querySelectorAll('.tab-btn').forEach((b) => b.style.background = tabBg.color);
        }
      } catch (e) {}

      el.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.style.padding = `${panelPad}px 0`;
      });
    },

    parseTabs() {
      let tabs = [];
      try {
        tabs = JSON.parse(this.get("tabs") || "[]");
      } catch (e) {
        tabs = [];
      }
      return tabs.length ? tabs : defaultTabs();
    },

    syncTabs() {
      const tabs = this.parseTabs();
      const rootId = this.ccid || this.getId();
      // Remove any previously generated children
      this.components().reset();

      const nav = this.append({
        tagName: "div",
        attributes: { class: "tabs-nav", "data-tabs-root": rootId },
        droppable: false,
        selectable: false,
        hoverable: false,
      })[0];

      // wrapper where item-list will append tab button + panel pairs
      this.append({ tagName: "div", attributes: { class: "tabs-wrapper", "data-tabs-root": rootId }, selectable: false, hoverable: false, components: [] })[0];

      // nav buttons are still generated for accessibility; the binder will
      // also append its own buttons/panels into the wrapper for canvas/storefront
      tabs.forEach((t, i) => {
        nav.append({
          tagName: "button",
          attributes: {
            type: "button",
            class: "tab-btn" + (i === 0 ? " active" : ""),
            "data-tab-target": String(i),
            "data-tabs-root": rootId,
          },
          content: t.label || `Onglet ${i + 1}`,
          selectable: false,
          hoverable: false,
          editable: false,
        });
      });

      this.bindPreview();
    },

    bindPreview() {
      const el = this.view?.el;
      if (!el) return;
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:tabActiveColor change:tabInactiveColor change:tabPadding change:tabFontSize change:tabFontWeight change:tabTextTransform change:panelPadding change:tabGap change:tabSpacing", () => {
        this.model.updateTabStyles();
      });
    },
    onRender() {
      this.model.updateTabStyles();
    },
  },
};
