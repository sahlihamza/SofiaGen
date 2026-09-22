/**
 * Stack Block - vertical stack layout with alignment and spacing
 */

import { spacingTraits } from "../../traits/utils/commonStyleTraits";

export const StackBlock = {
  id: "stack-block",
  label: "= Stack",
  category: "Base",
  content: {
    type: "stack-component",
  },
  attributes: { class: "fa fa-bars" },
};

export const StackComponent = {
  isComponent: (el) => el.classList && el.classList.contains("stack-component"),
  model: {
    defaults: {
      type: "stack-component",
      tagName: "div",
      draggable: true,
      droppable: true,
      attributes: { class: "stack-component" },
      styles: `
        .stack-component {
          display: flex;
          flex-direction: column;
          gap: var(--stack-gap, 20px);
          width: 100%;
        }
      `,
      traits: [
        {
          name: "alignment",
          label: "Alignement",
          type: "select",
          default: "start",
          options: [
            { id: "start", label: "Début" },
            { id: "center", label: "Centré" },
            { id: "end", label: "Fin" },
            { id: "stretch", label: "Etirer" },
          ],
          changeProp: 1,
          category: "style",
          section: "Alignement",
        },
        ...spacingTraits({ prefix: "stack", defaults: { gap: 20 } }),
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
        { tagName: "div", attributes: { class: "stack-item" }, selectable: false, hoverable: false, editable: false, components: [{ tagName: "p", content: "Élément 1" }] },
        { tagName: "div", attributes: { class: "stack-item" }, selectable: false, hoverable: false, editable: false, components: [{ tagName: "p", content: "Élément 2" }] },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:alignment", this.updateAlignment);
      this.on("change:stackGap change:stackSpacing", this.updateGap);
      this.on("change:staggerDelay", this.updateStaggerDelay);
    },

    onRemove() {
      this.off("change:alignment change:stackGap change:stackSpacing change:staggerDelay");
    },

    updateAlignment() {
      const alignment = this.get("alignment") || "start";
      const el = this.view?.el;
      if (el) {
        el.style.alignItems = alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : alignment;
      }
    },

    updateGap() {
      let gap = this.get("stackGap") || 20;
      try {
        const composite = this.get("stackSpacing");
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

