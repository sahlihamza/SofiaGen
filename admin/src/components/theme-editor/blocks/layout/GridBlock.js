/**
 * Grid Block - simple CSS grid container with column and gap controls
 */

import { spacingTraits } from "../../traits/utils/commonStyleTraits";

export const GridBlock = {
  id: "grid-block",
  label: "=3 Grid",
  category: "Base",
  content: {
    type: "grid-component",
  },
  attributes: { class: "fa fa-th-large" },
};

export const GridComponent = {
  isComponent: (el) => el.classList && el.classList.contains("grid-component"),
  model: {
    defaults: {
      type: "grid-component",
      tagName: "div",
      draggable: true,
      droppable: true,
      attributes: { class: "grid-component" },
      styles: `
        .grid-component {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--grid-gap, 24px);
          width: 100%;
        }
      `,
      traits: [
        {
          name: "columns",
          label: "Colonnes",
          type: "number",
          default: 3,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "style",
          section: "Grille",
        },
        ...spacingTraits({ prefix: "grid", defaults: { gap: 24 } }),
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
          attributes: { class: "grid-cell" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            { tagName: "p", content: "Cellule", selectable: false, hoverable: false, editable: false },
          ],
        },
        {
          tagName: "div",
          attributes: { class: "grid-cell" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            { tagName: "p", content: "Cellule", selectable: false, hoverable: false, editable: false },
          ],
        },
        {
          tagName: "div",
          attributes: { class: "grid-cell" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            { tagName: "p", content: "Cellule", selectable: false, hoverable: false, editable: false },
          ],
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:columns", this.updateColumns);
      this.on("change:gridGap change:gridSpacing", this.updateGap);
      this.on("change:staggerDelay", this.updateStaggerDelay);
    },

    onRemove() {
      this.off("change:columns change:gridGap change:gridSpacing change:staggerDelay");
    },

    updateColumns() {
      const columns = this.get("columns") || 3;
      const el = this.view?.el;
      if (el) {
        el.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      }
    },

    updateGap() {
      let gap = this.get("gridGap") || 24;
      try {
        const composite = this.get("gridSpacing");
        if (composite) {
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      const el = this.view?.el;
      if (el) {
        el.style.gap = `${gap}px`;
      }
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

