/**
 * Button Block - CTA button with link type trait
 */

export const ButtonBlock = {
  id: "button-block",
  label: "= Button",
  category: "Base",
  content: {
    type: "button-component",
  },
  attributes: { class: "fa fa-link" },
};

export const ButtonComponent = {
  isComponent: (el) => el.classList && el.classList.contains("button-component"),
  model: {
    defaults: {
      type: "button-component",
      tagName: "button",
      draggable: true,
      droppable: false,
      attributes: { class: "button-component" },
      styles: `
        .button-component {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--ts-btn-padding, 12px 28px);
          border-radius: var(--ts-btn-radius, 8px);
          background-color: var(--ts-btn-primary-bg, #667eea);
          color: var(--ts-btn-primary-text, #ffffff);
          border: none;
          font-family: var(--ts-font-button, 'Inter', sans-serif);
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
        }
      `,
      content: "Appel  l'action",
      traits: [
        {
          name: "buttonStyle",
          label: "Style",
          type: "select",
          default: "primary",
          options: [
            { id: "primary", label: "Primaire" },
            { id: "secondary", label: "Secondaire" },
            { id: "outline", label: "Outline" },
            { id: "text", label: "Texte" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "linkType",
          label: "Type de lien",
          type: "select",
          default: "url",
          options: [
            { id: "url", label: "URL" },
            { id: "page", label: "Page" },
            { id: "category", label: "Catégorie" },
            { id: "product", label: "Produit" },
          ],
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "linkValue",
          label: "Lien",
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
      this.on("change:buttonStyle", this.updateStyle);
      this.on("change:linkType", this.updateLink);
      this.on("change:linkValue", this.updateLink);
    },

    updateStyle() {
      const style = this.get("buttonStyle");
      const el = this.view?.el;
      if (!el) return;

      const styles = {
        primary: {
          backgroundColor: "var(--ts-btn-primary-bg, #667eea)",
          color: "var(--ts-btn-primary-text, #ffffff)",
          border: "none",
        },
        secondary: {
          backgroundColor: "var(--ts-btn-secondary-bg, #f3f4f6)",
          color: "var(--ts-btn-secondary-text, #111827)",
          border: "none",
        },
        outline: {
          backgroundColor: "transparent",
          color: "var(--ts-btn-primary-bg, #667eea)",
          border: "1px solid var(--ts-btn-primary-bg, #667eea)",
        },
        text: {
          backgroundColor: "transparent",
          color: "var(--ts-btn-primary-bg, #667eea)",
          border: "none",
        },
      };

      const selected = styles[style] || styles.primary;
      Object.assign(el.style, selected);
    },

    updateLink() {
      const type = this.get("linkType") || "url";
      const value = this.get("linkValue") || "";
      const el = this.view?.el;
      if (!el) return;

      if (el.tagName.toLowerCase() === "button") {
        el.setAttribute("data-link-type", type);
        el.setAttribute("data-link-value", value);
      }
    },
  },
};
