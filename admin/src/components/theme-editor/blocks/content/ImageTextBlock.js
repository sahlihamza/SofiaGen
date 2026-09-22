/**
 * Image & Text Block - Image with text content side by side
 * GrapesJS custom block for flexible layout
 */

import { ImageTrait } from "../../traits";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const ImageTextBlock = {
  id: "image-text-block",
  label: "= Image & Text",
  category: "Sections",
  content: {
    type: "image-text-component",
  },
  attributes: {
    class: "fa fa-columns",
  },
};

/**
 * Image & Text Component
 */
export const ImageTextBlockComponent = {
  isComponent: (el) => {
    return el.classList && el.classList.contains("image-text-component");
  },

  model: {
    defaults: {
      type: "image-text-component",
      draggable: true,
      droppable: false,
      attributes: {
        class: "image-text-component",
      },
      styles: `
        .image-text-component {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
          padding: var(--ts-section-spacing, 60px) 20px;
          max-width: var(--ts-container-width, 1200px);
          margin: 0 auto;
        }

        .image-text-container {
          display: contents;
        }

        .image-text-image {
          width: 100%;
          border-radius: var(--ts-card-radius, 8px);
          box-shadow: var(--ts-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
        }

        .image-text-content h2 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 32px;
          margin-bottom: 20px;
          font-weight: bold;
          color: var(--ts-color-text-primary, #333);
        }

        .image-text-content p {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          line-height: var(--ts-line-height, 1.6);
          color: var(--ts-color-text-secondary, #666);
          margin-bottom: 20px;
        }

        .image-text-button {
          display: inline-block;
          padding: var(--ts-btn-padding, 12px 30px);
          background-color: var(--ts-btn-primary-bg, #667eea);
          color: var(--ts-btn-primary-text, #ffffff);
          text-decoration: none;
          border: none;
          border-radius: var(--ts-btn-radius, 8px);
          font-family: var(--ts-font-button, 'Inter', sans-serif);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity var(--ts-anim-speed, 0.3s) var(--ts-anim-easing, ease);
        }

        .image-text-button:hover {
          opacity: 0.85;
        }

        @media (max-width: 768px) {
          .image-text-component {
            grid-template-columns: 1fr;
            padding: 40px 20px;
          }
        }
      `,
      components: [
        { tagName: "div", attributes: { class: "image-text-container" }, selectable: false, hoverable: false, editable: false, components: [
          { tagName: "img", attributes: { class: "image-text-image", src: placeholderImage, alt: "Image de présentation" }, selectable: false, hoverable: false, editable: false },
          { tagName: "div", attributes: { class: "image-text-content" }, selectable: false, hoverable: false, editable: false, components: [
            { tagName: "h2", content: "Notre fonctionnalité", selectable: false, hoverable: false, editable: false },
            { tagName: "p", content: "Ceci est une fonctionnalité puissante qui vous aide  mettre en valeur les avantages de votre produit. Modifiez ce texte et remplacez l'image par votre propre contenu.", selectable: false, hoverable: false, editable: false },
            { tagName: "button", attributes: { class: "image-text-button" }, content: "En savoir plus", selectable: false, hoverable: false, editable: false },
          ]}
        ]}
      ],
      traits: [
        {
          name: "layoutOrder",
          label: "Layout Order",
          type: "select",
          default: "image-text",
          options: [
            { id: "image-text", label: "Image Left" },
            { id: "text-image", label: "Text Left" },
          ],
          changeProp: 1,
          section: "Contenu",
        },
        ImageTrait("imageUrl", "Image"),
        {
          name: "contentGap",
          label: "Gap (px)",
          type: "number",
          default: 40,
          changeProp: 1,
          section: "Style",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:layoutOrder", this.updateLayout);
      this.on("change:imageUrl", this.updateImage);
      this.on("change:contentGap", this.updateGap);
    },

    updateLayout() {
      const order = this.get("layoutOrder");
      if (order === "text-image") {
        this.view.el.style.direction = "rtl";
      } else {
        this.view.el.style.direction = "ltr";
      }
    },

    updateImage() {
      const url = this.get("imageUrl");
      if (url) {
        const img = this.components().find(".image-text-image")[0];
        if (img) {
          img.setAttributes({ src: url });
        }
      }
    },

    updateGap() {
      const gap = this.get("contentGap");
      this.view.el.style.gap = `${gap}px`;
    },
  },

  view: {
    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.listenTo(this.model, "change:layoutOrder", this.updateLayout);
      this.listenTo(this.model, "change:imageUrl", this.updateImage);
      this.listenTo(this.model, "change:contentGap", this.updateGap);
    },

    updateLayout() {
      const order = this.model.get("layoutOrder");
      this.el.style.direction = order === "text-image" ? "rtl" : "ltr";
    },

    updateImage() {
      const url = this.model.get("imageUrl");
      if (url) {
        const img = this.el.querySelector(".image-text-image");
        if (img) {
          img.src = url;
        }
      }
    },

    updateGap() {
      const gap = this.model.get("contentGap");
      this.el.style.gap = `${gap}px`;
    },
  },
};

