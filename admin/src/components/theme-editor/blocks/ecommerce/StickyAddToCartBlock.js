import { colorTraits, spacingTraits, shadowTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle } from "../../traits/utils/applyCommonStyles";
import { Button } from "@sofia/ui";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const StickyAddToCartBlock = {
  id: "sticky-add-to-cart-block",
  label: "ðŸ“± Sticky Add to Cart",

  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "sticky-add-to-cart-component",
  },
  attributes: { class: "fa fa-shopping-cart" },
};

export const StickyAddToCartComponent = {
  isComponent: (el) => el.classList && el.classList.contains("sticky-add-to-cart"),
  model: {
    defaults: {
      type: "sticky-add-to-cart-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "sticky-add-to-cart" },
      styles: `
        .sticky-add-to-cart {
          position: fixed;
          bottom: -100px;
          left: 0;
          right: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 20px;
          background: var(--sticky-bar-background, #ffffff);
          color: var(--sticky-bar-text, #111827);
          box-shadow: var(--sticky-bar-shadow, 0 -4px 12px rgba(0,0,0,0.1));
          transition: bottom 0.3s ease;
        }
        .sticky-add-to-cart.visible {
          bottom: 0;
        }
        .sticky-bar-image {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          background: #f3f4f6;
        }
        .sticky-bar-info {
          flex: 1;
          min-width: 0;
        }
        .sticky-bar-name {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticky-bar-price {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          font-weight: 700;
          color: var(--ts-color-primary, #667eea);
        }
        .sticky-bar-button {
          padding: 10px 24px;
          background: var(--ts-btn-primary-bg, #667eea);
          color: var(--ts-btn-primary-text, #ffffff);
          border: none;
          border-radius: var(--ts-btn-radius, 6px);
          font-family: var(--ts-font-button, 'Inter', sans-serif);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
      `,
      content: `
        <img class="sticky-bar-image" data-dynamic-source="product.current" data-dynamic-field="thumbnail" src="${placeholderImage}" alt="Produit" selectable="false" hoverable="false" editable="false" />
        <div class="sticky-bar-info">
          <div class="sticky-bar-name" data-dynamic-source="product.current" data-dynamic-field="productName">Nom du produit</div>
          <div class="sticky-bar-price" data-dynamic-source="product.current" data-dynamic-field="regularPrice">Prix indisponible</div>
        </div>
        <Button class="sticky-bar-button" selectable="false" hoverable="false" editable="false">Ajouter au panier</Button>
      `,
      traits: [
        {
          name: "showOnScrollPx",
          label: "ApparaÃ®t aprÃ¨s (px de scroll)",

          type: "number",
          default: 300,
          min: 0,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showProductImage",
          label: "Afficher l'image produit",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showPrice",
          label: "Afficher le prix",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        ...colorTraits({ prefix: "stickyBar", fields: ["background", "text"], defaults: { background: "#ffffff", text: "#111827" } }),
        ...shadowTraits({ prefix: "stickyBar", defaults: { color: "rgba(0,0,0,0.1)", blur: 12, spread: 0, x: 0, y: -4 } }),
      ],
      components: [
        { tagName: "img", attributes: { class: "sticky-bar-image", src: placeholderImage, alt: "Produit", selectable: false, hoverable: false, editable: false } },
        { tagName: "div", attributes: { class: "sticky-bar-info", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "div", attributes: { class: "sticky-bar-name", selectable: false, hoverable: false, editable: false }, content: "Nom du produit" },
          { tagName: "div", attributes: { class: "sticky-bar-price", selectable: false, hoverable: false, editable: false }, content: "Prix indisponible" },
        ]},
        { tagName: "button", attributes: { class: "sticky-bar-button", selectable: false, hoverable: false, editable: false }, content: "Ajouter au panier" },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this._scrollHandler = null;
      this.on("change:stickyBarBackgroundColor change:stickyBarTextColor change:stickyBarShadowColor change:stickyBarShadowBlur change:stickyBarShadowX change:stickyBarShadowY", this.updateStyles);
      if (typeof window !== "undefined") {
        this._scrollHandler = () => this.handleScroll();
        window.addEventListener("scroll", this._scrollHandler, { passive: true });
        this.handleScroll();
      }
    },

    onRemove() {
      if (typeof window !== "undefined" && this._scrollHandler) {
        window.removeEventListener("scroll", this._scrollHandler);
        this._scrollHandler = null;
      }
    },

    handleScroll() {
      const threshold = this.get("showOnScrollPx") || 300;
      const el = this.view?.el;
      if (!el) return;
      const scrolled = typeof window !== "undefined" ? window.scrollY : 0;
      el.classList.toggle("visible", scrolled > threshold);
    },

    getEl() {
      return this.view?.el;
    },

    updateStyles() {
      const el = this.getEl();
      if (!el) return;
      applyColorStyle(el, this, { prefix: "stickyBar", selector: ".sticky-add-to-cart", fields: ["background", "text"] });
      const bg = this.get("stickyBarBackgroundColor") || "#ffffff";
      const text = this.get("stickyBarTextColor") || "#111827";
      el.style.setProperty("--sticky-bar-background", bg);
      el.style.setProperty("--sticky-bar-text", text);
      const shadowColor = this.get("stickyBarShadowColor") || "rgba(0,0,0,0.1)";
      const shadowBlur = this.get("stickyBarShadowBlur") || 12;
      const shadowX = this.get("stickyBarShadowX") || 0;
      const shadowY = this.get("stickyBarShadowY") || -4;
      el.style.setProperty("--sticky-bar-shadow", `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`);
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:stickyBarBackgroundColor change:stickyBarTextColor change:stickyBarShadowColor change:stickyBarShadowBlur change:stickyBarShadowX change:stickyBarShadowY", this.updateStyles);
    },

    updateStyles() {
      const el = this.el;
      if (!el) return;
      const bg = this.model.get("stickyBarBackgroundColor") || "#ffffff";
      const text = this.model.get("stickyBarTextColor") || "#111827";
      el.style.setProperty("--sticky-bar-background", bg);
      el.style.setProperty("--sticky-bar-text", text);
      const shadowColor = this.model.get("stickyBarShadowColor") || "rgba(0,0,0,0.1)";
      const shadowBlur = this.model.get("stickyBarShadowBlur") || 12;
      const shadowX = this.model.get("stickyBarShadowX") || 0;
      const shadowY = this.model.get("stickyBarShadowY") || -4;
      el.style.setProperty("--sticky-bar-shadow", `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`);
    },
  },
};
