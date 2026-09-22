import { colorTraits, spacingTraits, borderTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle } from "../../traits/utils/applyCommonStyles";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const RelatedProductsBlock = {
  id: "related-products-block",
  label: "= Produits similaires",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "related-products-component",
  },
  attributes: { class: "fa fa-link" },
};

export const RelatedProductsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("related-products-component"),
  model: {
    defaults: {
      type: "related-products-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "related-products-component" },
      styles: `
        .related-products-component {
          padding: var(--ts-section-spacing, 60px) 20px;
          background-color: var(--ts-color-surface, #f9f9f9);
        }
        .related-products-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .related-products-header h2 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 28px;
          font-weight: 700;
          color: var(--ts-color-text-primary, #111827);
          margin: 0 0 8px 0;
        }
        .related-products-header p {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          color: var(--ts-color-text-secondary, #6b7280);
          margin: 0 0 8px 0;
        }
        .related-products-view-all {
          color: #10b981;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
        }
        .related-products-view-all:hover {
          text-decoration: underline;
        }
        .related-products-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          max-width: var(--ts-container-width, 1200px);
          margin: 0 auto;
        }
        .related-product-card {
          background: var(--ts-card-bg, #ffffff);
          border: var(--ts-card-border, 1px solid #e5e7eb);
          border-radius: var(--ts-card-radius, 12px);
          overflow: hidden;
          box-shadow: var(--ts-card-shadow, 0 2px 8px rgba(0,0,0,0.08));
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .related-product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .related-product-image {
          width: 100%;
          height: 180px;
          object-fit: cover;
          background: #f3f4f6;
        }
        .related-product-info {
          padding: 16px;
        }
        .related-product-name {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--ts-color-text-primary, #111827);
          margin: 0 0 8px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .related-product-price {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          font-weight: 700;
          color: var(--ts-color-primary, #667eea);
          margin: 0;
        }
        .related-product-loading {
          text-align: center;
          padding: 40px;
          color: var(--ts-color-text-secondary, #6b7280);
          font-family: var(--ts-font-body, 'Inter', sans-serif);
        }
        .related-product-empty {
          text-align: center;
          padding: 40px;
          color: #9ca3af;
          font-family: var(--ts-font-body, 'Inter', sans-serif);
        }
      `,
      content: `
        <div class="related-products-header">
          <h2>Vous aimerez aussi</h2>
          <p>Découvrez d'autres produits similaires</p>
        </div>
        <div class="related-products-container" id="related-products-items">
          <div class="related-product-loading">Chargement des produits...</div>
        </div>
      `,
      products: [],
      traits: [
        {
          name: "limit",
          label: "Nombre de produits",
          type: "number",
          default: 4,
          min: 1,
          max: 8,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
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
          name: "heading",
          label: "Titre",
          type: "text",
          default: "Vous aimerez aussi",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "subheading",
          label: "Sous-titre",
          type: "text",
          default: "Découvrez d'autres produits similaires",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "viewAllUrl",
          label: "URL 'Voir tout'",
          type: "text",
          default: "/products",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        ...spacingTraits({ prefix: "relatedProducts", defaults: { padding: 60, gap: 20 } }),
        ...colorTraits({ prefix: "relatedProductCard", fields: ["background", "text"], defaults: { background: "#ffffff", text: "#111827" } }),
        ...borderTraits({ prefix: "relatedProductCard", defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 12 } }),
      ],
      components: [
        { tagName: "div", attributes: { class: "related-products-header", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "h2", attributes: { selectable: false, hoverable: false, editable: false }, content: "Vous aimerez aussi" },
          { tagName: "p", attributes: { selectable: false, hoverable: false, editable: false }, content: "Découvrez d'autres produits similaires" },
        ]},
        { tagName: "div", attributes: { class: "related-products-container", id: "related-products-items", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "div", attributes: { class: "related-product-loading", selectable: false, hoverable: false, editable: false }, content: "Chargement des produits..." },
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:relatedProductCardBackgroundColor change:relatedProductCardTextColor change:relatedProductCardBorderRadius change:relatedProductsPadding change:relatedProductsGap", this.updateStyles);
      this.once("added", () => {
        if (typeof window !== "undefined") {
          this.loadRelatedProducts();
        }
      });
    },

    getEl() {
      return this.view?.el;
    },

    updateStyles() {
      const el = this.getEl();
      if (!el) return;
      let padding = this.get("relatedProductsPadding") || 60;
      let gap = this.get("relatedProductsGap") || 20;
      try {
        const composite = this.get("relatedProductsSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--ts-section-spacing", `${padding}px`);
      el.style.setProperty("--related-products-gap", `${gap}px`);
      applyColorStyle(el, this, { prefix: "relatedProductCard", selector: ".related-product-card", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "relatedProductCard", selector: ".related-product-card" });
    },

    loadRelatedProducts() {
      if (typeof window === "undefined") return;
      const container = document.getElementById("related-products-items");
      if (!container) return;

      const productId = document.querySelector("[data-current-product-id]")?.getAttribute("data-current-product-id");
      if (!productId) {
        container.innerHTML = `<div class="related-product-loading">Produits similaires indisponibles</div>`;
        return;
      }

      const storeId = container.closest("[data-store-id]")?.getAttribute("data-store-id") || this.get("storeId");
      const limit = this.get("limit") || 4;
      const sortBy = this.get("sortBy") || "popular";

      fetch(`/api/products/related?productId=${productId}&limit=${limit}&sortBy=${sortBy}${storeId ? `&storeId=${storeId}` : ""}`)
        .then((res) => res.json())
        .then((response) => {
          const products = response?.data || [];
          this.renderRelatedProducts(container, products);
        })
        .catch(() => {
          container.innerHTML = `<div class="related-product-loading">Erreur lors du chargement</div>`;
        });
    },

    renderRelatedProducts(container, products) {
      const heading = this.get("heading") || "Vous aimerez aussi";
      const subheading = this.get("subheading") || "Découvrez d'autres produits similaires";
      const viewAllUrl = this.get("viewAllUrl") || "/products";

      const header = container.closest(".related-products-component")?.querySelector(".related-products-header");
      if (header) {
        const titleEl = header.querySelector("h2");
        const subEl = header.querySelector("p");
        if (titleEl) titleEl.textContent = heading;
        if (subEl) {
          subEl.innerHTML = `${subheading} <a href="${viewAllUrl}" class="related-products-view-all" target="_blank">Voir tout </a>`;
        }
      }

      if (!products.length) {
        container.innerHTML = `<div class="related-product-empty">Aucun produit similaire trouvé</div>`;
        return;
      }
      container.innerHTML = products
        .map(
          (product) => `
          <div class="related-product-card">
            <img class="related-product-image" src="${product.thumbnail || product.productImage || placeholderImage}" alt="${product.productName || "Produit"}" selectable="false" hoverable="false" editable="false" />
            <div class="related-product-info">
              <div class="related-product-name">${product.productName || "Produit"}</div>
              <div class="related-product-price">${(product.regularPrice || 0).toFixed(2)} </div>
            </div>
          </div>
        `
        )
        .join("");
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:relatedProductCardBackgroundColor change:relatedProductCardTextColor change:relatedProductCardBorderRadius change:relatedProductsPadding change:relatedProductsGap", this.updateStyles);
      this.once("added", () => {
        if (typeof window !== "undefined") {
          this.loadRelatedProducts();
        }
      });
    },

    updateStyles() {
      const el = this.el;
      let padding = this.model.get("relatedProductsPadding") || 60;
      let gap = this.model.get("relatedProductsGap") || 20;
      try {
        const composite = this.model.get("relatedProductsSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--ts-section-spacing", `${padding}px`);
      el.style.setProperty("--related-products-gap", `${gap}px`);
    },

    loadRelatedProducts() {
      if (typeof window === "undefined") return;
      const container = this.el.querySelector("#related-products-items");
      if (!container) return;

      const productId = document.querySelector("[data-current-product-id]")?.getAttribute("data-current-product-id");
      if (!productId) {
        container.innerHTML = `<div class="related-product-loading">Produits similaires indisponibles</div>`;
        return;
      }

      const storeId = this.el.closest("[data-store-id]")?.getAttribute("data-store-id") || this.model.get("storeId");
      const limit = this.model.get("limit") || 4;
      const sortBy = this.model.get("sortBy") || "popular";

      fetch(`/api/products/related?productId=${productId}&limit=${limit}&sortBy=${sortBy}${storeId ? `&storeId=${storeId}` : ""}`)
        .then((res) => res.json())
        .then((response) => {
          const products = response?.data || [];
          this.renderRelatedProducts(container, products);
        })
        .catch(() => {
          container.innerHTML = `<div class="related-product-loading">Erreur lors du chargement</div>`;
        });
    },

    renderRelatedProducts(container, products) {
      const heading = this.model.get("heading") || "Vous aimerez aussi";
      const subheading = this.model.get("subheading") || "Découvrez d'autres produits similaires";
      const viewAllUrl = this.model.get("viewAllUrl") || "/products";

      const header = container.closest(".related-products-component")?.querySelector(".related-products-header");
      if (header) {
        const titleEl = header.querySelector("h2");
        const subEl = header.querySelector("p");
        if (titleEl) titleEl.textContent = heading;
        if (subEl) {
          subEl.innerHTML = `${subheading} <a href="${viewAllUrl}" class="related-products-view-all" target="_blank">Voir tout </a>`;
        }
      }

      if (!products.length) {
        container.innerHTML = `<div class="related-product-empty">Aucun produit similaire trouvé</div>`;
        return;
      }
      container.innerHTML = products
        .map(
          (product) => `
          <div class="related-product-card">
            <img class="related-product-image" src="${product.thumbnail || product.productImage || placeholderImage}" alt="${product.productName || "Produit"}" selectable="false" hoverable="false" editable="false" />
            <div class="related-product-info">
              <div class="related-product-name">${product.productName || "Produit"}</div>
              <div class="related-product-price">${(product.regularPrice || 0).toFixed(2)} </div>
            </div>
          </div>
        `
        )
        .join("");
    },
  },
};
