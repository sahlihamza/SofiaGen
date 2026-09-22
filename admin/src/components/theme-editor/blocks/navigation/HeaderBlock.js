/**
 * Header / Navbar Block
 */

import { colorTraits, spacingTraits, borderTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";

export const HeaderBlock = {
  id: "header-block",
  label: " En-tête",
  category: "Structure",
  content: {
    type: "header-component",
  },
  attributes: { class: "fa fa-header" },
};

export const HeaderComponent = {
  isComponent: (el) => el.classList && el.classList.contains("site-header"),
  model: {
    defaults: {
      type: "header-component",
      tagName: "header",
      attributes: { class: "site-header", "data-global-section": "header" },
      styles: `
        .site-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          background-color: #ffffff;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 100;
        }
        .header-logo {
          font-size: 24px;
          font-weight: 800;
          color: #111;
          text-decoration: none;
          letter-spacing: -0.5px;
        }
        .header-nav {
          display: flex;
          gap: 30px;
        }
        .nav-link {
          color: #444;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #10b981;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .action-icon {
          color: #111;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `,
      components: [
        {
          tagName: "a",
          attributes: { href: "#", class: "header-logo" },
          content: "BOUTIQUE.",
          selectable: false,
          hoverable: false,
          editable: false,
        },
        {
          tagName: "nav",
          attributes: { class: "header-nav" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            { tagName: "a", attributes: { href: "#", class: "nav-link" }, content: "Accueil", selectable: false, hoverable: false, editable: false },
            { tagName: "a", attributes: { href: "#", class: "nav-link" }, content: "Boutique", selectable: false, hoverable: false, editable: false },
            { tagName: "a", attributes: { href: "#", class: "nav-link" }, content: "Catégories", selectable: false, hoverable: false, editable: false },
            { tagName: "a", attributes: { href: "#", class: "nav-link" }, content: "Contact", selectable: false, hoverable: false, editable: false },
          ]
        },
        {
          tagName: "div",
          attributes: { class: "header-actions" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            {
              tagName: "div",
              attributes: { class: "action-icon" },
              content: `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`,
              selectable: false,
              hoverable: false,
              editable: false,
            },
            {
              tagName: "div",
              attributes: { class: "action-icon" },
              content: `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>`,
              selectable: false,
              hoverable: false,
              editable: false,
            }
          ]
        }
      ],
      traits: [
        ...colorTraits({ prefix: "header", fields: ["background"], defaults: { background: "#ffffff" } }),
        ...spacingTraits({ prefix: "header", defaults: { padding: 20 } }),
        ...borderTraits({ prefix: "header", defaults: { width: 0, color: "#e5e7eb", radius: 0 } }),
        ...typographyTraits({ prefix: "header", defaults: { size: 15, weight: "500" } }),
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:headerBackgroundColor", this.updateBackground);
      this.on("change:headerPadding change:headerSpacing", this.updatePadding);
    },

    onRemove() {
      this.off("change:headerBackgroundColor change:headerPadding change:headerSpacing");
    },

    updateBackground() {
      const el = this.view?.el;
      if (!el) return;
      const bg = this.get("headerBackgroundColor");
      if (bg) el.style.backgroundColor = bg;
    },

    updatePadding() {
      let value = this.get("headerPadding") || 20;
      try {
        const composite = this.get("headerSpacing");
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
