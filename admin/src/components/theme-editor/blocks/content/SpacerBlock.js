/**
 * Spacer Block - invisible spacer for vertical spacing
 */

export const SpacerBlock = {
  id: "spacer-block",
  label: " Spacer",
  category: "Base",
  content: {
    type: "spacer-component",
  },
  attributes: { class: "fa fa-arrows-v" },
};

export const SpacerComponent = {
  isComponent: (el) => el.classList && el.classList.contains("spacer-component"),
  model: {
    defaults: {
      type: "spacer-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "spacer-component" },
      styles: `
        .spacer-component {
          width: 100%;
          height: 40px;
        }
      `,
      traits: [
        {
          name: "height",
          label: "Hauteur (px)",
          type: "number",
          default: 40,
          min: 0,
          max: 500,
          changeProp: 1,
          category: "style",
          section: "Espacement",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:height", this.updateHeight);
    },

    updateHeight() {
      const height = this.get("height") || 40;
      const el = this.view?.el;
      if (el) {
        el.style.height = `${height}px`;
      }
    },
  },
};
