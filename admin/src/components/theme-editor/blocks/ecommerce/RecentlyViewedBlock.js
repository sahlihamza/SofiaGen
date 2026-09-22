import { colorTraits, spacingTraits, borderTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle } from "../../traits/utils/applyCommonStyles";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const RecentlyViewedBlock = {
  id: "recently-viewed-block",
  label: "=A Récemment consultés",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "recently-viewed-component",
  },
  attributes: { class: "fa fa-history" },
};

export const RecentlyViewedComponent = {
  isComponent: (el) => el.classList && el.classList.contains("recently-viewed-component"),
  model: {
    defaults: {
      type: "recently-viewed-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "recently-viewed-component" },
      styles: `
        .recently-viewed-component {
          padding: var(--ts-section-spacing, 60px) 20px;
          background-color: var(--ts-color-surface, #f9f9f9);
        }
        .recently-viewed-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .recently-viewed-header h2 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 28px;
          font-weight: 700;
          color: var(--ts-color-text-primary, #111827);
          margin: 0 0 8px 0;
        }
        .recently-viewed-header p {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          color: var(--ts-color-text-secondary, #6b7280);
          margin: 0 0 12px 0;
        }
        .recently-viewed-clear-btn {
          display: inline-block;
          padding: 6px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 13px;
          color: #6b7280;
          cursor: pointer;
          text-decoration: none;
        }
        .recently-viewed-clear-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .recently-viewed-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          max-width: var(--ts-container-width, 1200px);
          margin: 0 auto;
        }
        .recently-viewed-card {
          background: var(--ts-card-bg, #ffffff);
          border: var(--ts-card-border, 1px solid #e5e7eb);
          border-radius: var(--ts-card-radius, 12px);
          overflow: hidden;
          box-shadow: var(--ts-card-shadow, 0 2px 8px rgba(0,0,0,0.08));
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .recently-viewed-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .recently-viewed-image {
          width: 100%;
          height: 180px;
          object-fit: cover;
          background: #f3f4f6;
        }
        .recently-viewed-info {
          padding: 16px;
        }
        .recently-viewed-name {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--ts-color-text-primary, #111827);
          margin: 0 0 8px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .recently-viewed-price {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          font-weight: 700;
          color: var(--ts-color-primary, #667eea);
          margin: 0 0 4px 0;
        }
        .recently-viewed-rating {
          font-size: 13px;
          color: #f59e0b;
        }
        .recently-viewed-empty {
          text-align: center;
          padding: 40px;
          color: var(--ts-color-text-secondary, #6b7280);
          font-family: var(--ts-font-body, 'Inter', sans-serif);
        }
      `,
      content: `
        <div class="recently-viewed-header">
          <h2>Produits récemment consultés</h2>
          <p>Retrouvez les articles que vous avez déjà vus</p>
        </div>
        <div class="recently-viewed-container" id="recently-viewed-items">
          <div class="recently-viewed-empty">Aucun produit récemment consulté</div>
        </div>
      `,
      traits: [
        {
          name: "storeId",
          label: "ID de la boutique",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showPrice",
          label: "Afficher prix",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showRating",
          label: "Afficher note",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        ...spacingTraits({ prefix: "recentlyViewed", defaults: { padding: 60, gap: 20 } }),
        ...colorTraits({ prefix: "recentlyViewedCard", fields: ["background", "text"], defaults: { background: "#ffffff", text: "#111827" } }),
        ...borderTraits({ prefix: "recentlyViewedCard", defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 12 } }),
      ],
      components: [
        { tagName: "div", attributes: { class: "recently-viewed-header", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "h2", attributes: { selectable: false, hoverable: false, editable: false }, content: "Produits récemment consultés" },
          { tagName: "p", attributes: { selectable: false, hoverable: false, editable: false }, content: "Retrouvez les articles que vous avez déjà vus" },
        ]},
        { tagName: "div", attributes: { class: "recently-viewed-container", id: "recently-viewed-items", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "div", attributes: { class: "recently-viewed-empty", selectable: false, hoverable: false, editable: false }, content: "Aucun produit récemment consulté" },
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:recentlyViewedCardBackgroundColor change:recentlyViewedCardTextColor change:recentlyViewedCardBorderRadius change:recentlyViewedPadding change:recentlyViewedGap", this.updateStyles);
      this.once("added", () => {
        if (typeof window !== "undefined") {
          this.loadRecentlyViewed();
        }
      });
    },

    getEl() {
      return this.view?.el;
    },

    updateStyles() {
      const el = this.getEl();
      if (!el) return;
      let padding = this.get("recentlyViewedPadding") || 60;
      let gap = this.get("recentlyViewedGap") || 20;
      try {
        const composite = this.get("recentlyViewedSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--ts-section-spacing", `${padding}px`);
      el.style.setProperty("--recently-viewed-gap", `${gap}px`);
      applyColorStyle(el, this, { prefix: "recentlyViewedCard", selector: ".recently-viewed-card", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "recentlyViewedCard", selector: ".recently-viewed-card" });
    },

    loadRecentlyViewed() {
      if (typeof window === "undefined") return;
      const container = document.getElementById("recently-viewed-items");
      if (!container) return;

      const stored = JSON.parse(window.localStorage.getItem("recently_viewed_products") || "[]");
      if (!stored.length) {
        container.innerHTML = `<div class="recently-viewed-empty">Aucun produit récemment consulté</div>`;
        return;
      }

      const storeId = container.closest("[data-store-id]")?.getAttribute("data-store-id") || this.get("storeId");
      if (!storeId) {
        container.innerHTML = `<div class="recently-viewed-empty">Aucun produit récemment consulté</div>`;
        return;
      }

      fetch(`/api/products/by-ids?ids=${stored.join(",")}&storeId=${storeId}`)
        .then((res) => res.json())
        .then((response) => {
          const products = response?.data || [];
          if (!products.length) {
            container.innerHTML = `<div class="recently-viewed-empty">Aucun produit récemment consulté</div>`;
            return;
          }
          this.renderProductCards(container, products);
        })
        .catch(() => {
          container.innerHTML = `<div class="recently-viewed-empty">Erreur lors du chargement</div>`;
        });
    },

    renderProductCards(container, products) {
      const showPrice = this.get("showPrice");
      const showRating = this.get("showRating");
      container.innerHTML = products
        .map(
          (product) => `
          <div class="recently-viewed-card">
            <img class="recently-viewed-image" src="${product.thumbnail || product.productImage || placeholderImage}" alt="${product.productName || "Produit"}" selectable="false" hoverable="false" editable="false" />
            <div class="recently-viewed-info">
              <div class="recently-viewed-name">${product.productName || "Produit"}</div>
              ${showPrice ? `<div class="recently-viewed-price">${(product.regularPrice || 0).toFixed(2)} </div>` : ""}
              ${showRating && product.averageRating ? `<div class="recently-viewed-rating">${"".repeat(Math.round(product.averageRating))}${"".repeat(5 - Math.round(product.averageRating))} (${product.reviewCount || 0})</div>` : ""}
            </div>
          </div>
        `
        )
        .join("");
    },

    clearHistory() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem("recently_viewed_products");
      const container = document.getElementById("recently-viewed-items");
      if (container) {
        container.innerHTML = `<div class="recently-viewed-empty">Aucun produit récemment consulté</div>`;
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:recentlyViewedCardBackgroundColor change:recentlyViewedCardTextColor change:recentlyViewedCardBorderRadius change:recentlyViewedPadding change:recentlyViewedGap", this.updateStyles);
    },

    updateStyles() {
      const el = this.el;
      let padding = this.model.get("recentlyViewedPadding") || 60;
      let gap = this.model.get("recentlyViewedGap") || 20;
      try {
        const composite = this.model.get("recentlyViewedSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--ts-section-spacing", `${padding}px`);
      el.style.setProperty("--recently-viewed-gap", `${gap}px`);
    },
  },
};
