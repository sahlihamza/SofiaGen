/**
 * Footer Block
 */

import { colorTraits, spacingTraits, borderTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";

export const FooterBlock = {
  id: "footer-block",
  label: " Pied de page",
  category: "Structure",
  content: {
    type: "footer-component",
  },
  attributes: { class: "fa fa-long-arrow-down" },
};

export const FooterComponent = {
  isComponent: (el) => el.classList && el.classList.contains("site-footer"),
  model: {
    defaults: {
      type: "footer-component",
      tagName: "footer",
      attributes: { class: "site-footer", "data-global-section": "footer" },
      styles: `
        .site-footer {
          background-color: #111827;
          color: #f3f4f6;
          padding: 60px 40px 20px 40px;
          font-family: system-ui, sans-serif;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 2fr;
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 40px;
          border-bottom: 1px solid #374151;
        }
        .footer-logo {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 15px;
          display: block;
        }
        .footer-desc {
          color: #9ca3af;
          font-size: 14px;
          line-height: 1.6;
          max-width: 300px;
        }
        .footer-title {
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .footer-link {
          color: #9ca3af;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: #10b981;
        }
        .newsletter-input {
          width: 100%;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #374151;
          background: #1f2937;
          color: white;
          margin-bottom: 10px;
          outline: none;
        }
        .newsletter-btn {
          width: 100%;
          padding: 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        }
        .newsletter-btn:hover {
          background: #059669;
        }
        .footer-bottom {
          text-align: center;
          padding-top: 20px;
          color: #6b7280;
          font-size: 13px;
        }
      `,
      components: [
        {
          tagName: "div",
          attributes: { class: "footer-grid" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            {
              tagName: "div",
              selectable: false,
              hoverable: false,
              editable: false,
              components: [
                { tagName: "div", attributes: { class: "footer-logo" }, content: "BOUTIQUE.", selectable: false, hoverable: false, editable: false },
                { tagName: "p", attributes: { class: "footer-desc" }, content: "Votre destination premium pour des produits de haute qualité. Nous nous engageons  offrir la meilleure expérience  nos clients.", selectable: false, hoverable: false, editable: false }
              ]
            },
            {
              tagName: "div",
              selectable: false,
              hoverable: false,
              editable: false,
              components: [
                { tagName: "h4", attributes: { class: "footer-title" }, content: "Boutique", selectable: false, hoverable: false, editable: false },
                {
                  tagName: "div",
                  attributes: { class: "footer-links" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Tous les produits", selectable: false, hoverable: false, editable: false },
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Nouveautés", selectable: false, hoverable: false, editable: false },
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Promotions", selectable: false, hoverable: false, editable: false },
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Bonnes affaires", selectable: false, hoverable: false, editable: false },
                  ]
                }
              ]
            },
            {
              tagName: "div",
              selectable: false,
              hoverable: false,
              editable: false,
              components: [
                { tagName: "h4", attributes: { class: "footer-title" }, content: "Support", selectable: false, hoverable: false, editable: false },
                {
                  tagName: "div",
                  attributes: { class: "footer-links" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "FAQ", selectable: false, hoverable: false, editable: false },
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Livraison", selectable: false, hoverable: false, editable: false },
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Retours", selectable: false, hoverable: false, editable: false },
                    { tagName: "a", attributes: { href: "#", class: "footer-link" }, content: "Contact", selectable: false, hoverable: false, editable: false },
                  ]
                }
              ]
            },
            {
              tagName: "div",
              selectable: false,
              hoverable: false,
              editable: false,
              components: [
                { tagName: "h4", attributes: { class: "footer-title" }, content: "Infolettre", selectable: false, hoverable: false, editable: false },
                { tagName: "p", attributes: { class: "footer-desc" }, content: "Inscrivez-vous pour recevoir des mises  jour, des offres exclusives et plus encore.", selectable: false, hoverable: false, editable: false, style: { marginBottom: "15px" } },
                { tagName: "input", attributes: { class: "newsletter-input", type: "email", placeholder: "Entrez votre adresse email" }, selectable: false, hoverable: false, editable: false },
                { tagName: "button", attributes: { class: "newsletter-btn" }, content: "S'ABONNER", selectable: false, hoverable: false, editable: false }
              ]
            }
          ]
        },
        {
          tagName: "div",
          attributes: { class: "footer-bottom" },
          selectable: false,
          hoverable: false,
          editable: false,
          content: " 2024 Votre Boutique. Tous droits rûrervés."
        }
      ],
      traits: [
        ...colorTraits({ prefix: "footer", fields: ["background"], defaults: { background: "#111827" } }),
        ...spacingTraits({ prefix: "footer", defaults: { padding: 60 } }),
        ...borderTraits({ prefix: "footer", defaults: { width: 0, color: "#374151", radius: 0 } }),
        ...typographyTraits({ prefix: "footer", defaults: { size: 14, weight: "400" } }),
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:footerBackgroundColor", this.updateBackground);
      this.on("change:footerPadding change:footerSpacing", this.updatePadding);
    },

    onRemove() {
      this.off("change:footerBackgroundColor change:footerPadding change:footerSpacing");
    },

    updateBackground() {
      const el = this.view?.el;
      if (!el) return;
      const bg = this.get("footerBackgroundColor");
      if (bg) el.style.backgroundColor = bg;
    },

    updatePadding() {
      let value = this.get("footerPadding") || 60;
      try {
        const composite = this.get("footerSpacing");
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
  }
};
