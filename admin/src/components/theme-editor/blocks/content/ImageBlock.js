/**
 * Image Block - standalone image with image trait
 */

import { ImageTrait } from "../../traits";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const ImageBlock = {
  id: "image-block",
  label: "= Image",
  category: "Base",
  content: {
    type: "image-component",
  },
  attributes: { class: "fa fa-image" },
};

export const ImageComponent = {
  isComponent: (el) => el.classList && el.classList.contains("image-component"),
  model: {
    defaults: {
      type: "image-component",
      tagName: "img",
      draggable: true,
      droppable: false,
      attributes: {
        class: "image-component",
        src: placeholderImage,
        alt: "Image",
        loading: "lazy",
        decoding: "async",
      },
      styles: `
        .image-component {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
          border-radius: var(--ts-card-radius, 8px);
        }
      `,
      traits: [
        ImageTrait("src", "Image URL"),
        {
          name: "alt",
          label: "Alt text",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:src", this.updateSrc);
      this.on("change:alt", this.updateAlt);
    },

    updateSrc() {
      const src = this.get("src");
      const el = this.view?.el;
      if (el && src) {
        el.setAttribute("src", src);
      }
    },

    updateAlt() {
      const alt = this.get("alt");
      const el = this.view?.el;
      if (el) {
        el.setAttribute("alt", alt || "Image");
      }
    },
  },
};
