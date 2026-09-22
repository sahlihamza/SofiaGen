/**
 * Heading Block - Editable heading with real HTML level switching
 */

export const HeadingBlock = {
  id: "heading-block",
  label: "=$ Heading",
  category: "Base",
  content: {
    type: "heading-component",
  },
  attributes: { class: "fa fa-heading" },
};

export const HeadingComponent = {
  isComponent: (el) => el.classList && el.classList.contains("heading-component"),
  model: {
    defaults: {
      type: "heading-component",
      tagName: "h2",
      draggable: true,
      droppable: false,
      attributes: { class: "heading-component" },
      styles: `
        .heading-component {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 36px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--ts-color-text-primary, #111827);
          margin: 0 0 24px 0;
        }
      `,
      content: "Titre de votre section",
      traits: [
        {
          name: "level",
          label: "Niveau",
          type: "select",
          default: "h2",
          options: [
            { id: "h1", label: "H1" },
            { id: "h2", label: "H2" },
            { id: "h3", label: "H3" },
            { id: "h4", label: "H4" },
            { id: "h5", label: "H5" },
            { id: "h6", label: "H6" },
          ],
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "alignment",
          label: "Alignement",
          type: "select",
          default: "left",
          options: [
            { id: "left", label: "Gauche" },
            { id: "center", label: "Centré" },
            { id: "right", label: "Droite" },
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
      this.on("change:level", this.updateLevel);
      this.on("change:alignment", this.updateAlignment);
    },

    updateLevel() {
      const level = this.get("level") || "h2";
      this.set("tagName", level);
      if (this.view?.render) {
        this.view.render();
      }
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
