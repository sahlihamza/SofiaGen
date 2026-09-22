import ProductServices from "@/services/ProductServices";

export const ProductTitleBlock = {
  id: "product-title-block",
  label: "< Titre du produit",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "product-title-component",
  },
  attributes: { class: "fa fa-heading" },
};

export const ProductTitleComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-title-component"),
  model: {
    defaults: {
      type: "product-title-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-title-component", "data-placeholder-content": "true" },
      styles: `
        .product-title-component {
          width: 100%;
        }
        .product-title-component h1 { font-family: var(--ts-font-heading, 'Inter', sans-serif); font-size: 32px; font-weight: 700; color: var(--ts-color-text-primary, #111827); margin: 0; }
        .product-title-component h2 { font-family: var(--ts-font-heading, 'Inter', sans-serif); font-size: 28px; font-weight: 700; color: var(--ts-color-text-primary, #111827); margin: 0; }
        .product-title-component h3 { font-family: var(--ts-font-heading, 'Inter', sans-serif); font-size: 24px; font-weight: 600; color: var(--ts-color-text-primary, #111827); margin: 0; }
        .product-title-sku {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 400;
          margin-left: 8px;
        }
        .product-title-category {
          font-size: 14px;
          color: #667eea;
          font-weight: 500;
          margin-top: 4px;
        }
        .product-title-link {
          text-decoration: none;
          color: inherit;
        }
        .product-title-link:hover {
          text-decoration: underline;
        }
      `,
      traits: [
        {
          name: "productId",
          label: "Product ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "htmlTag",
          label: "Balise HTML",
          type: "select",
          default: "h1",
          options: [
            { value: "h1", label: "H1" },
            { value: "h2", label: "H2" },
            { value: "h3", label: "H3" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showSku",
          label: "Afficher SKU",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showCategory",
          label: "Afficher catégorie",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "linkToProduct",
          label: "Lien vers page produit",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "h1", content: "", selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:htmlTag change:showSku change:showCategory change:linkToProduct", this.renderTitle);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.renderTitle();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.renderTitle();
          }
        })
        .catch((err) => console.error("Failed to load product for title:", err));
    },

    renderTitle() {
      const product = this.get("productData");
      const tag = this.get("htmlTag") || "h1";
      const showSku = this.get("showSku");
      const showCategory = this.get("showCategory");
      const linkToProduct = this.get("linkToProduct");

      if (!product || !this.view) {
        const el = this.view?.el;
        if (el) {
          const titleEl = el.querySelector(`.product-title-component ${tag}`) || el.querySelector(".product-title-component h1") || el.querySelector(".product-title-component h2") || el.querySelector(".product-title-component h3");
          if (titleEl) titleEl.textContent = "";
        }
        return;
      }
      const el = this.view.el;
      if (!el) return;

      const container = el.querySelector(".product-title-component");
      if (!container) return;

      const skuHtml = showSku && product.sku ? `<span class="product-title-sku">(SKU: ${product.sku})</span>` : "";
      const categoryHtml = showCategory && product.productCategory?.name ? `<div class="product-title-category">${product.productCategory.name}</div>` : "";
      const titleText = product.productName || "";
      const productUrl = `/products/${product._id || product.id || product.slug || ""}`;

      const titleTag = tag.toUpperCase();
      const titleContent = linkToProduct
        ? `<a href="${productUrl}" class="product-title-link">${titleText}${skuHtml}</a>`
        : `${titleText}${skuHtml}`;

      container.innerHTML = `<${titleTag}>${titleContent}</${titleTag}>${categoryHtml}`;

      const attrs = this.getAttributes() || {};
      if (attrs["data-placeholder-content"]) {
        const next = { ...attrs };
        delete next["data-placeholder-content"];
        this.setAttributes(next);
      }
    },
  },

  view: {
    onRender() {
      const model = this.model;
      const product = model.get("productData");
      const tag = model.get("htmlTag") || "h1";
      const el = this.el;
      if (!el) return;
      const titleEl = el.querySelector(`.product-title-component ${tag}`) || el.querySelector(".product-title-component h1") || el.querySelector(".product-title-component h2") || el.querySelector(".product-title-component h3");
      if (titleEl && product) {
        titleEl.textContent = product.productName || "";
      }
    },
  },
};
