export const MenuAnchorBlock = {
  id: "menu-anchor-block",
  label: " Menu Anchor",
  category: "Navigation",
  content: {
    type: "menu-anchor-component",
  },
  attributes: { class: "fa fa-anchor" },
};

export const MenuAnchorComponent = {
  isComponent: (el) => el.classList && el.classList.contains("menu-anchor-component"),
  model: {
    defaults: {
      type: "menu-anchor-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "menu-anchor-component", id: "section-1" },
      styles: `
        .menu-anchor-component {
          visibility: hidden;
          height: 0;
          pointer-events: none;
        }
      `,
      traits: [
        {
          name: "anchorId",
          label: "ID de l'ancre",
          type: "text",
          default: "section-1",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:anchorId change:anchorLabel", this.updateAnchorId);
    },

    updateAnchorId() {
      const id = this.get("anchorId") || "section-1";
      this.setAttributes({ id });
      const el = this.view?.el;
      if (el) el.id = id;
    },
  },
};
