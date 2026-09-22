import ProductServices from "@/services/ProductServices";
import { Button } from "@sofia/ui";

export const ProductShortDescriptionBlock = {
  id: "product-short-description-block",
  label: "ðŸ“ Product Short Description",

  category: "E-Commerce",
  content: {
    type: "product-short-description-component",
  },
  attributes: { class: "fa fa-align-left" },
};

export const ProductShortDescriptionComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-short-description-component"),
  model: {
    defaults: {
      type: "product-short-description-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-short-description-component", "data-placeholder-content": "true" },
      styles: `
        .product-short-description-component {
          width: 100%;
          font-size: 15px;
          line-height: 1.6;
          color: #6b7280;
        }
        .product-short-description-text {
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .product-short-description-text.collapsed {
          max-height: 60px;
        }
        .product-short-description-toggle {
          display: inline-block;
          margin-top: 8px;
          color: #667eea;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-family: var(--ts-font-body, 'Inter', sans-serif);
        }
        .product-short-description-toggle:hover {
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
          name: "maxLength",
          label: "Longueur max (caractÃ¨res, 0 = illimitÃ©)",
          type: "number",
          default: 0,
          min: 0,
          max: 5000,
          step: 50,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "product-short-description", selectable: false, hoverable: false, editable: false }, content: "Short description will appear here." },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:maxLength", this.renderShortDescription);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.renderShortDescription();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product && product.shortDescription) {
            this.set("productData", product);
            this.renderShortDescription();
          }
        })
        .catch((err) => console.error("Failed to load product short description:", err));
    },

    renderShortDescription() {
      const product = this.get("productData");
      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;
      const container = el.querySelector(".product-short-description-component");
      if (!container) return;

      const maxLen = this.get("maxLength") || 0;
      let desc = product.shortDescription || "";
      const needsTruncation = maxLen > 0 && desc.length > maxLen;
      const truncated = needsTruncation ? desc.slice(0, maxLen) + "..." : desc;

      container.innerHTML = `
        <div class="product-short-description-text ${needsTruncation ? "collapsed" : ""}">${truncated}</div>
        ${needsTruncation ? `<Button class="product-short-description-toggle" type="button">Lire la suite</Button>` : ""}
      `;

      const toggleBtn = container.querySelector(".product-short-description-toggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          const textEl = container.querySelector(".product-short-description-text");
          if (!textEl) return;
          const isCollapsed = textEl.classList.contains("collapsed");
          textEl.classList.toggle("collapsed");
          textEl.innerHTML = isCollapsed ? desc : truncated;
          toggleBtn.textContent = isCollapsed ? "Voir moins" : "Lire la suite";
        });
      }

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
      const container = this.el.querySelector(".product-short-description-component");
      if (container && product.shortDescription) {
        container.textContent = product.shortDescription;
      }
    },
  },
};
