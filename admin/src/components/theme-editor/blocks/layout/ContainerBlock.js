/**
 * Container Block - layout wrapper with max width and vertical padding
 */

import { spacingTraits } from "../../traits/utils/commonStyleTraits";

export const ContainerBlock = {
  id: "container-block",
  label: " Container",
  category: "Base",
  content: {
    type: "container-component",
  },
  attributes: { class: "fa fa-square-o" },
};

export const ContainerComponent = {
  isComponent: (el) => el.classList && el.classList.contains("container-component"),
  model: {
    defaults: {
      type: "container-component",
      tagName: "div",
      draggable: true,
      droppable: true,
      attributes: { class: "container-component" },
      styles: `
        .container-component {
          width: 100%;
          max-width: var(--container-max-width, 1200px);
          margin: 0 auto;
          padding: var(--container-padding, 40px) 20px;
          box-sizing: border-box;
        }
      `,
      traits: [
        {
          name: "maxWidth",
          label: "Largeur max",
          type: "select",
          default: "1200",
          options: [
            { id: "100%", label: "Pleine largeur" },
            { id: "1200", label: "Contenu 1200px" },
            { id: "960", label: "Contenu 960px" },
          ],
          changeProp: 1,
          category: "style",
          section: "Dimensions",
        },
        ...spacingTraits({ prefix: "container", defaults: { padding: 40 } }),
      ],
      components: [
        {
          tagName: "div",
          attributes: { class: "container-inner" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            {
              tagName: "p",
              content: "Déposez du contenu ici",
              selectable: false,
              hoverable: false,
              editable: false,
            },
          ],
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:maxWidth", this.updateMaxWidth);
      this.on("change:containerPadding change:containerSpacing", this.updatePadding);
    },

    onRemove() {
      this.off("change:maxWidth change:containerPadding change:containerSpacing");
    },

    updateMaxWidth() {
      const value = this.get("maxWidth");
      const el = this.view?.el;
      if (el) {
        el.style.maxWidth = value === "100%" ? "100%" : `${value}px`;
      }
    },

    updatePadding() {
      let value = this.get("containerPadding") || 40;
      try {
        const composite = this.get("containerSpacing");
        if (composite && composite.padding !== undefined) {
          value = composite.padding ?? value;
        }
      } catch (e) {}
      const el = this.view?.el;
      if (el) {
        el.style.paddingTop = `${value}px`;
        el.style.paddingBottom = `${value}px`;
      }
    },
  },
};

