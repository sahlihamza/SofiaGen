import ProductServices from "@/services/ProductServices";

export const ProductBreadcrumbsBlock = {
  id: "product-breadcrumbs-block",
  label: "<^ Product Breadcrumbs",
  category: "E-Commerce",
  content: {
    type: "product-breadcrumbs-component",
  },
  attributes: { class: "fa fa-map-signs" },
};

export const ProductBreadcrumbsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-breadcrumbs-component"),
  model: {
    defaults: {
      type: "product-breadcrumbs-component",
      tagName: "nav",
      draggable: true,
      droppable: false,
      attributes: { class: "product-breadcrumbs-component", "data-placeholder-content": "true", "aria-label": "Breadcrumb", role: "navigation" },
      styles: `
        .product-breadcrumbs-component {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
          padding: 8px 0;
        }
        .product-breadcrumbs-component a {
          color: #6b7280;
          text-decoration: none;
        }
        .product-breadcrumbs-component a:hover {
          color: var(--ts-color-primary, #667eea);
        }
        .product-breadcrumb-separator {
          color: #9ca3af;
          user-select: none;
        }
        .product-breadcrumb-current {
          color: #374151;
          font-weight: 600;
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
          name: "showHome",
          label: "Afficher Accueil",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "separator",
          label: "Séparateur",
          type: "select",
          default: "/",
          options: [
            { value: "/", label: "/" },
            { value: ">", label: ">" },
            { value: "", label: "" },
            { value: "-", label: "-" },
            { value: "|", label: "|" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "a", attributes: { href: "/" }, content: "Accueil", selectable: false, hoverable: false, editable: false },
        { tagName: "span", attributes: { class: "product-breadcrumb-separator" }, content: "/", selectable: false, hoverable: false, editable: false },
        { tagName: "span", attributes: { class: "product-breadcrumb-current" }, content: "Produit", selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:showHome change:separator", this.updateBreadcrumbs);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updateBreadcrumbs();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateBreadcrumbs();
          }
        })
        .catch((err) => console.error("Failed to load product breadcrumbs:", err));
    },

    updateBreadcrumbs() {
      const product = this.get("productData");
      const showHome = this.get("showHome");
      const separator = this.get("separator") || "/";
      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;

      el.setAttribute("aria-label", "Breadcrumb");
      el.setAttribute("role", "navigation");

      const items = el.querySelectorAll(".product-breadcrumbs-component > *");
      items.forEach((item) => item.remove());

      let html = "";
      if (showHome) {
        html += `<a href="/">Accueil</a><span class="product-breadcrumb-separator">${separator}</span>`;
      }
      if (product.productCategory?.name) {
        html += `<span class="product-breadcrumb-current">${product.productCategory.name}</span><span class="product-breadcrumb-separator">${separator}</span>`;
      }
      html += `<span class="product-breadcrumb-current">${product.productName || "Produit"}</span>`;
      el.innerHTML = html;

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
      if (!product || !this.el) return;
      const showHome = model.get("showHome");
      const separator = model.get("separator") || "/";
      let html = "";
      if (showHome) {
        html += `<a href="/">Accueil</a><span class="product-breadcrumb-separator">${separator}</span>`;
      }
      if (product.productCategory?.name) {
        html += `<span class="product-breadcrumb-current">${product.productCategory.name}</span><span class="product-breadcrumb-separator">${separator}</span>`;
      }
      html += `<span class="product-breadcrumb-current">${product.productName || "Produit"}</span>`;
      this.el.innerHTML = html;
    },
  },
};
