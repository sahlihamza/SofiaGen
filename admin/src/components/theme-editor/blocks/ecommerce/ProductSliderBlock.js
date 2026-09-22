/**
 * ProductSliderBlock  widget "Product Slider" pour le builder visuel.
 *
 * Refactor : ce block suivait l'ancienne architecture (HTML statique +
 * JS impératif dans le canvas : handlers fléches, autoplay interval,
 * scroll sync, dots). Il est désormais aligné sur le pattern widget unifié :
 * il produit un placeholder <div data-widget="product-slider"
 * data-config='{...}' data-store-id="..."></div> qui sera, côté storefront,
 * monté en React par WidgetHost (ProductSliderWidget).
 *
 * Le runtime React vit dans
 * store/src/components/product-slider-widget/ProductSliderWidget.jsx.
 * Ce block ne fait que configurer + sérialiser + un aperçu canvas léger.
 */

import ProductServices from "@/services/ProductServices";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='200' viewBox='0 0 250 200'%3E%3Crect fill='%23f3f4f6' width='250' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='12' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EProduct%3C/text%3E%3C/svg%3E";

/* ----------------------------------------------------------------------- */
/* Définition du block (palette du builder)                                */
/* ----------------------------------------------------------------------- */
export const ProductSliderBlock = {
  id: "product-slider-block",
  label: "< Product Slider",
  category: "Sections",
  content: { type: "product-slider-component" },
  attributes: { class: "fa fa-arrows-h" },
};

/* ----------------------------------------------------------------------- */
/* Définition du composant GrapesJS                                        */
/* ----------------------------------------------------------------------- */
export const ProductSliderComponent = {
  isComponent: (el) =>
    el && el.classList && el.classList.contains("product-slider-section"),

  model: {
    defaults: {
      type: "product-slider-component",
      tagName: "section",
      draggable: true,
      droppable: false,
      attributes: { class: "product-slider-section" },
      styles: `
        .product-slider-section {
          padding: 60px 20px;
          background-color: #fff;
        }
        .product-slider-section .ps-canvas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .product-slider-section .ps-canvas-title {
          font-size: 28px; font-weight: bold; color: #333; margin: 0;
        }
        .product-slider-section .ps-canvas-view-all {
          color: #10b981; text-decoration: none; font-weight: 600;
        }
        .product-slider-section .ps-canvas-track {
          display: flex;
          gap: 20px;
          overflow: hidden;
          max-width: 1200px;
          margin: 0 auto;
          grid-template-columns: repeat(var(--ps-canvas-cols, 4), minmax(0, 1fr));
        }
        .product-slider-section .ps-canvas-grid {
          display: grid;
          grid-template-columns: repeat(var(--ps-canvas-cols, 4), minmax(0, 1fr));
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .product-slider-section .ps-canvas-card {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          background: #fff;
        }
        .product-slider-section .ps-canvas-img {
          width: 100%;
          height: 180px;
          object-fit: cover;
          margin-bottom: 12px;
          background: #f3f4f6;
          border-radius: 4px;
        }
        .product-slider-section .ps-canvas-name {
          font-size: 14px; font-weight: 600; color: #333;
          margin: 0 0 8px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .product-slider-section .ps-canvas-price {
          font-size: 16px; font-weight: bold; color: #10b981; margin: 0;
        }
        .product-slider-section .ps-canvas-loading {
          text-align: center; padding: 40px; color: #6b7280;
          grid-column: 1 / -1;
        }
      `,
      content: `
        <div class="ps-canvas-header">
          <h2 class="ps-canvas-title">Produits tendance</h2>
          <a href="#" class="ps-canvas-view-all">Voir tout </a>
        </div>
        <div class="ps-canvas-grid" id="product-slider-items">
          <div class="ps-canvas-loading">Chargement des produits...</div>
        </div>
      `,
      products: [],

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
          name: "sortBy",
          label: "Trier par",
          type: "select",
          default: "popular",
          options: [
            { value: "newest", label: "Plus récent" },
            { value: "price-asc", label: "Prix croissant" },
            { value: "price-desc", label: "Prix décroissant" },
            { value: "popular", label: "Plus populaire" },
            { value: "rating", label: "Mieux notés" },
          ],
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "slidesToShow",
          label: "Cartes visibles",
          type: "number",
          default: 4,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "autoplay",
          label: "Défilement automatique",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showArrows",
          label: "Afficher fléches navigation",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showDots",
          label: "Afficher points indicateurs",
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
        "change:storeId change:sortBy change:slidesToShow change:autoplay change:showArrows change:showDots",
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
        widgetId: "product-slider",
        configVersion: 1,
        title: "Produits tendance",
        subtitle: "",
        storeId: this.get("storeId") || "",
        viewAllText: "Voir tout",
        viewAllUrl: "/products",
        source: "",
        defaultSort: this.get("sortBy") || "popular",
        categories: [],
        limit: 12,
        slidesPerView: this.get("slidesToShow") || 4,
        slidesPerViewTablet: Math.max(1, Math.floor((this.get("slidesToShow") || 4) / 2)),
        slidesPerViewMobile: 1,
        spaceBetween: 20,
        autoplay: this.get("autoplay") === true,
        autoplayDelay: 4000,
        pauseOnHover: true,
        loop: true,
        speed: 400,
        showArrows: this.get("showArrows") !== false,
        showDots: this.get("showDots") !== false,
        lazyLoading: true,
        keyboardNav: true,
        grabCursor: true,
        showWishlist: true,
        showQuickView: true,
        showRating: true,
        showAddToCart: true,
        imgHeight: 180,
        cardGap: 20,
        arrowColor: "#111827",
        dotColor: "#d1d5db",
        dotActiveColor: "#667eea",
        cssId: "",
        cssClass: "",
        cacheMs: 60000,
      };
    },

    syncConfigAndPreview() {
      const el = this.getEl();
      if (!el) return;
      const cfg = this.buildConfig();
      syncWidgetPlaceholder(this, cfg);

      el.style.setProperty("--ps-canvas-cols", cfg.slidesPerView);
      this.loadPreview();
    },

    /* ------------------------- Aperçu canvas (admin) ------------------- */
    loadPreview() {
      const el = this.getEl();
      if (!el || typeof window === "undefined") return;
      const container = el.querySelector("#product-slider-items");
      if (!container) return;

      const storeId = this.get("storeId");
      const sortBy = this.get("sortBy") || "popular";
      const limit = Math.min((this.get("slidesToShow") || 4) * 2, 12);
      ProductServices.getAllProducts({ storeId, limit, sortBy })
        .then((res) => {
          const result = res?.data || res;
          const products = result?.products || result?.data || [];
          this.set("products", products);
          this.renderPreview(products);
        })
        .catch(() => {
          container.innerHTML = `<div class="ps-canvas-loading">Erreur de chargement des produits.</div>`;
        });
    },

    renderPreview(products = []) {
      const el = this.getEl();
      if (!el) return;
      const container = el.querySelector("#product-slider-items");
      if (!container) return;
      if (!products.length) {
        container.innerHTML = `<div class="ps-canvas-loading">Aucun produit. Configurez un storeId.</div>`;
        return;
      }
      container.innerHTML = products
        .map(
          (p) => `
        <div class="ps-canvas-card" selectable="false" hoverable="false" editable="false">
          <img class="ps-canvas-img" src="${p.thumbnail || p.productImage || p.image?.[0] || placeholderImage}" alt="${p.productName || p.name || "Produit"}" />
          <h4 class="ps-canvas-name">${p.productName || p.name || "Produit"}</h4>
          <p class="ps-canvas-price">${Number(p.salePrice ?? p.regularPrice ?? p.price ?? 0).toFixed(2)} </p>
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
        "change:storeId change:sortBy change:slidesToShow change:autoplay change:showArrows change:showDots",
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
