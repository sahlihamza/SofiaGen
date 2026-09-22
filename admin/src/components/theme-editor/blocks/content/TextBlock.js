/**
 * Text Block - Editable paragraph block
 */

export const TextBlock = {
  id: "text-block",
  label: "= Text",
  category: "Base",
  content: {
    type: "text-component",
  },
  attributes: { class: "fa fa-file-text" },
};

export const TextComponent = {
  isComponent: (el) => el.classList && el.classList.contains("text-component"),
  model: {
    defaults: {
      type: "text-component",
      tagName: "p",
      draggable: true,
      droppable: false,
      attributes: { class: "text-component" },
      styles: `
        .text-component {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          line-height: var(--ts-line-height, 1.75);
          color: var(--ts-color-text-secondary, #4b5563);
          margin: 0 0 20px 0;
        }
      `,
      content: "Rédigez votre paragraphe ici...",
      traits: [
        {
          name: "alignment",
          label: "Alignement",
          type: "select",
          default: "left",
          options: [
            { id: "left", label: "Gauche" },
            { id: "center", label: "Centré" },
            { id: "right", label: "Droite" },
            { id: "justify", label: "Justifié" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:alignment", this.updateAlignment);
    },

    updateAlignment() {
      const alignment = this.get("alignment") || "left";
      const el = this.view?.el;
      if (el) {
        el.style.textAlign = alignment;
      }
    },
  },
};
