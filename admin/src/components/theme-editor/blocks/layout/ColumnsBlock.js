/**
 * Columns Block - preset ratios for common multi-column layouts
 */

import { spacingTraits, borderTraits } from "../../traits/utils/commonStyleTraits";
import { applyBorderStyle } from "../../traits/utils/applyCommonStyles";

export const ColumnsBlock = {
  id: "columns-block",
  label: "> Columns",
  category: "Base",
  content: {
    type: "columns-component",
  },
  attributes: { class: "fa fa-columns" },
};

export const ColumnsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("columns-component"),
  model: {
    defaults: {
      type: "columns-component",
      tagName: "div",
      draggable: true,
      droppable: true,
      attributes: { class: "columns-component" },
      styles: `
        .columns-component {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--columns-gap, 24px);
          width: 100%;
        }
      `,
      traits: [
        {
          name: "layout",
          label: "Disposition",
          type: "select",
          default: "50-50",
          options: [
            { id: "50-50", label: "50 / 50" },
            { id: "33-33-33", label: "33 / 33 / 33" },
            { id: "25-75", label: "25 / 75" },
            { id: "75-25", label: "75 / 25" },
            { id: "70-30", label: "70 / 30" },
          ],
          changeProp: 1,
          category: "style",
          section: "Disposition",
        },
        ...spacingTraits({ prefix: "columns", defaults: { gap: 24 } }),
        ...borderTraits({ prefix: "column", defaults: { width: 1, color: "#e5e7eb", radius: 8 } }),
        {
          name: "staggerDelay",
          label: "Délai en cascade (ms)",
          type: "number",
          default: 0,
          min: 0,
          max: 1000,
          changeProp: 1,
          category: "advanced",
          section: "Animation",
        },
      ],
      components: [
        {
          tagName: "div",
          attributes: { class: "column-cell" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [{ tagName: "p", content: "Colonne 1", selectable: false, hoverable: false, editable: false }],
        },
        {
          tagName: "div",
          attributes: { class: "column-cell" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [{ tagName: "p", content: "Colonne 2", selectable: false, hoverable: false, editable: false }],
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:layout", this.updateLayout);
      this.on("change:columnsGap change:columnsSpacing", this.updateGap);
      this.on("change:columnBorder change:columnBorderColor change:columnBorderWidth change:columnBorderStyle change:columnBorderRadius", this.updateBorder);
      this.on("change:staggerDelay", this.updateStaggerDelay);
      this.updateBorder();
    },

    onRemove() {
      this.off("change:layout change:columnsGap change:columnsSpacing change:columnBorder change:columnBorderColor change:columnBorderWidth change:columnBorderStyle change:columnBorderRadius change:staggerDelay");
    },

    updateLayout() {
      const layout = this.get("layout") || "50-50";
      const el = this.view?.el;
      if (!el) return;

      const templates = {
        "50-50": "repeat(2, minmax(0, 1fr))",
        "33-33-33": "repeat(3, minmax(0, 1fr))",
        "25-75": "25% 75%",
        "75-25": "75% 25%",
        "70-30": "70% 30%",
      };
      el.style.gridTemplateColumns = templates[layout] || templates["50-50"];
    },

    updateGap() {
      let gap = this.get("columnsGap") || 24;
      try {
        const composite = this.get("columnsSpacing");
        if (composite) {
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      const el = this.view?.el;
      if (el) {
        el.style.gap = `${gap}px`;
      }
    },

    updateBorder() {
      const el = this.view?.el;
      if (!el) return;
      try {
        applyBorderStyle(el, this, { prefix: "column", selector: ".column-cell" });
      } catch (e) {}
    },

    updateStaggerDelay() {
      const delay = this.get("staggerDelay") || 0;
      const attrs = this.getAttributes();
      if (delay > 0) {
        attrs["data-stagger-delay"] = String(delay);
      } else {
        delete attrs["data-stagger-delay"];
      }
      this.setAttributes(attrs);
    },
  },
};

