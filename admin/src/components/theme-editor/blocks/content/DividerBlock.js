/**
 * Divider Block - horizontal separator
 */

import { colorTraits } from "../../traits/utils/commonStyleTraits";

export const DividerBlock = {
  id: "divider-block",
  label: " Divider",
  category: "Base",
  content: {
    type: "divider-component",
  },
  attributes: { class: "fa fa-minus" },
};

export const DividerComponent = {
  isComponent: (el) => el.classList && el.classList.contains("divider-component"),
  model: {
    defaults: {
      type: "divider-component",
      tagName: "hr",
      draggable: true,
      droppable: false,
      attributes: { class: "divider-component" },
      styles: `
        .divider-component {
          border: none;
          border-top: var(--divider-thickness, 1px) var(--divider-style, solid) var(--divider-border-color, var(--ts-color-border, #e5e7eb));
          width: 100%;
          margin: 24px 0;
        }
      `,
      traits: [
        {
          name: "style",
          label: "Style",
          type: "select",
          default: "solid",
          options: [
            { id: "solid", label: "Solide" },
            { id: "dashed", label: "Pointillé" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        ...colorTraits({ prefix: "divider", fields: ["border"], defaults: { border: "var(--ts-color-border, #e5e7eb)" }, section: "Couleurs" }),
        {
          name: "thickness",
          label: "épaisseur",
          type: "number",
          default: 1,
          min: 1,
          max: 10,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:style change:dividerBorderColor change:thickness", this.updateDivider);
    },

    updateDivider() {
      let style = this.get("style") || "solid";
      let color = this.get("dividerBorderColor") || "var(--ts-color-border, #e5e7eb)";
      let thickness = this.get("thickness") || 1;
      try {
        const composite = this.get("dividerBorder");
        if (composite) {
          color = composite.color ?? color;
          thickness = composite.width ?? thickness;
          style = composite.style ?? style;
        }
      } catch (e) {}
      const el = this.view?.el;
      if (el) {
        el.style.borderTopStyle = style;
        el.style.borderTopColor = color;
        el.style.borderTopWidth = `${thickness}px`;
      }
    },
  },
};
