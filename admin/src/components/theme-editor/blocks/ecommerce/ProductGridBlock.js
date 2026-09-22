/**
 * ProductGridBlock  widget "Product Grid" pour le builder visuel.
 *
 * Refactor : ce block suivait l'ancienne architecture (HTML statique +
 * JS impératif dans le canvas + résolution backend via productGridScript).
 * Il est désormais aligné sur le pattern widget unifié : il produit un
 * placeholder <div data-widget="all-products" data-config='{...}'
 * data-store-id="..."></div> réutilisé par AllProductsWidget côté storefront.
 *
 * Le runtime React vit dans store/src/components/product-grid/AllProductsWidget.jsx.
 * Ce block ne fait que configurer + sérialiser + un aperçu canvas léger.
 */

import ProductServices from "@/services/ProductServices";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";

const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

/* ----------------------------------------------------------------------- */
/* Définition du block (palette du builder)                                */
/* ----------------------------------------------------------------------- */
export const ProductGridBlock = {
  id: "product-grid-block",
  label: "= Product Grid",
  category: "Sections",
  content: { type: "product-grid-component" },
  attributes: { class: "fa fa-th" },
};

/* ----------------------------------------------------------------------- */
/* Définition du composant GrapesJS                                        */
/* ----------------------------------------------------------------------- */
export const ProductGridBlockComponent = {
  isComponent: (el) =>
    el && el.classList && el.classList.contains("product-grid-component"),

  model: {
    defaults: {
      type: "product-grid-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-grid-component" },
      styles: `
        .product-grid-component {
          padding: var(--ts-section-spacing, 60px) 20px;
          background-color: var(--ts-color-surface, #f9f9f9);
        }
        .product-grid-component .pg-canvas-head { text-align: center; margin-bottom: 30px; }
        .product-grid-component .pg-canvas-head h2 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 32px; margin-bottom: 10px; font-weight: bold;
          color: var(--ts-color-text-primary, #333);
        }
        .product-grid-component .pg-canvas-head p {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px; color: var(--ts-color-text-secondary, #666);
        }
        .product-grid-component .pg-canvas-grid {
          display: grid;
          grid-template-columns: repeat(var(--pg-cols, 4), minmax(0, 1fr));
          gap: 20px; max-width: var(--ts-container-width, 1200px);
          margin: 0 auto;
        }
        .product-grid-component .pg-canvas-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
          overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .product-grid-component .pg-canvas-img {
          width: 100%; height: 180px; object-fit: cover; background: #f3f4f6;
        }
        .product-grid-component .pg-canvas-body { padding: 12px; }
        .product-grid-component .pg-canvas-title {
          font-size: 14px; font-weight: 600; color: #333; margin-bottom: 6px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .product-grid-component .pg-canvas-price {
          font-size: 16px; font-weight: bold; color: var(--ts-color-primary, #667eea);
        }
        .product-grid-component .pg-canvas-loading {
          text-align: center; padding: 40px; color: #6b7280;
          grid-column: 1 / -1;
        }
      `,
      content: `
        <div class="pg-canvas-head">
          <h2>Nos Produits</h2>
          <p>Découvrez notre sélection exclusive</p>
        </div>
        <div class="pg-canvas-grid" id="product-grid-items">
          <div class="pg-canvas-loading">Chargement des produits...</div>
        </div>
      `,
      products: [],
      pageSize: 8,
      columnCount: 4,
      storeId: "",
      sortBy: "newest",
      layout: "grid",
      showSaleBadge: true,
      showAddToCart: true,

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
          name: "pageSize",
          label: "Produits par page",
          type: "number",
          default: 8,
          min: 2,
          max: 24,
          step: 2,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "columnCount",
          label: "Colonnes (desktop)",
          type: "number",
          default: 4,
          min: 2,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "sortBy",
          label: "Trier par",
          type: "select",
          default: "newest",
          options: [
            { id: "newest", label: "Plus récent" },
            { id: "price-asc", label: "Prix : croissant" },
            { id: "price-desc", label: "Prix : décroissant" },
            { id: "popular", label: "Plus populaire" },
            { id: "rating", label: "Mieux notés" },
          ],
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "layout",
          label: "Mise en page",
          type: "select",
          default: "grid",
          options: [
            { id: "grid", label: "Grille" },
            { id: "list", label: "Liste" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showSaleBadge",
          label: "Afficher badge promo",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showAddToCart",
          label: "Afficher bouton panier",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
    },

    /* ----------------------------- Lifecycle ---------------------------- */
    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);

      this.on(
        "change:storeId change:pageSize change:columnCount change:sortBy change:layout change:showSaleBadge change:showAddToCart",
        this.syncConfigAndPreview
      );

      this.once("added", () => {
        this.syncConfigAndPreview();
        this.loadPreview();
      });
    },

    getEl() {
      return this.view?.el;
    },

    /* ---------------------- Sérialisation data-config ------------------ */
    buildConfig() {
      return {
        widgetId: "all-products",
        configVersion: 1,
        title: "",
        subtitle: "",
        storeId: this.get("storeId") || "",
        columns: {
          desktop: this.get("columnCount") || 4,
          tablet: Math.max(1, Math.floor((this.get("columnCount") || 4) / 2)),
          mobile: 1,
        },
        perPage: this.get("pageSize") || 8,
        displayType: this.get("layout") || "grid",
        defaultSort: this.get("sortBy") || "newest",
        source: "",
        categories: [],
        showFilters: false,
        filtersPosition: "sidebar",
        showPagination: false,
        infiniteScroll: true,
        cardGap: 20,
        showWishlist: false,
        showQuickView: this.get("showSaleBadge") !== false,
        showRating: true,
        imgHeight: 180,
        cssId: "",
        cssClass: "",
        visibilityConditions: "always",
      };
    },

    syncConfigAndPreview() {
      const el = this.getEl();
      if (!el) return;
      const cfg = this.buildConfig();
      syncWidgetPlaceholder(this, cfg);

      el.style.setProperty("--pg-cols", cfg.columns.desktop);
      this.loadPreview();
    },

    /* ------------------------- Aperçu canvas (admin) ------------------- */
    loadPreview() {
      const el = this.getEl();
      if (!el || typeof window === "undefined") return;
      const container = el.querySelector("#product-grid-items");
      if (!container) return;

      const limit = Math.min(this.get("pageSize") || 8, 8);
      const storeId = this.get("storeId");
      const sortBy = this.get("sortBy") || "newest";
      ProductServices.getAllProducts({ page: 1, limit, storeId, sortBy })
        .then((res) => {
          const result = res?.data || res;
          const products = result?.products || result?.data || [];
          this.set("products", products);
          this.renderPreview(products);
        })
        .catch(() => {
          container.innerHTML = `<div class="pg-canvas-loading">Erreur de chargement des produits.</div>`;
        });
    },

    renderPreview(products = []) {
      const el = this.getEl();
      if (!el) return;
      const container = el.querySelector("#product-grid-items");
      if (!container) return;
      if (!products.length) {
        container.innerHTML = `<div class="pg-canvas-loading">Aucun produit. Configurez un storeId.</div>`;
        return;
      }
      container.innerHTML = products
        .map(
          (p) => `
        <div class="pg-canvas-card" selectable="false" hoverable="false" editable="false">
          <img class="pg-canvas-img" src="${p.thumbnail || p.productImage || p.image?.[0] || placeholderImage}" alt="${p.productName || p.name || "Produit"}" />
          <div class="pg-canvas-body">
            <div class="pg-canvas-title">${p.productName || p.name || "Produit"}</div>
            <div class="pg-canvas-price">${Number(p.salePrice ?? p.regularPrice ?? p.price ?? 0).toFixed(2)} </div>
          </div>
        </div>`
        )
        .join("");
    },
  },

  /* ------------------------------ View -------------------------------- */
  view: {
    init() {
      this.listenTo(
        this.model,
        "change:storeId change:pageSize change:columnCount change:sortBy change:layout change:showSaleBadge change:showAddToCart",
        this.model.syncConfigAndPreview
      );
      this.listenTo(this.model, "change:products", () =>
        this.model.renderPreview(this.model.get("products"))
      );
    },
    onRender() {
      this.model.syncConfigAndPreview();
    },
  },
};
