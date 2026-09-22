import ProductServices from "@/services/ProductServices";
import { Button } from "@sofia/ui";

export const ProductContentBlock = {
  id: "product-content-block",
  label: "ðŸ“„ Product Content",

  category: "E-Commerce",
  content: {
    type: "product-content-component",
  },
  attributes: { class: "fa fa-file-text" },
};

export const ProductContentComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-content-component"),
  model: {
    defaults: {
      type: "product-content-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-content-component", "data-placeholder-content": "true" },
      styles: `
        .product-content-component {
          width: 100%;
          font-size: 16px;
          line-height: 1.7;
          color: #374151;
        }
        .product-content-component p { margin-bottom: 16px; }
        .product-content-component img { max-width: 100%; height: auto; border-radius: 8px; }
        .product-content-component.hide-images img { display: none; }
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
          name: "showImages",
          label: "Afficher images",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "maxLength",
          label: "Longueur max (caractÃ¨res, 0 = illimitÃ©)",
          type: "number",
          default: 0,
          min: 0,
          max: 10000,
          step: 100,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "product-content-component", selectable: false, hoverable: false, editable: false }, content: "Product description will appear here." },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:showImages change:maxLength", this.renderContent);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.renderContent();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product && product.description) {
            this.set("productData", product);
            this.renderContent();
          }
        })
        .catch((err) => console.error("Failed to load product content:", err));
    },

    renderContent() {
      const product = this.get("productData");
      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;
      const container = el.querySelector(".product-content-component");
      if (!container) return;

      const showImages = this.get("showImages");
      const maxLen = this.get("maxLength") || 0;
      let desc = product.description || "";
      const needsTruncation = maxLen > 0 && desc.length > maxLen;

      container.classList.toggle("hide-images", !showImages);

      if (needsTruncation) {
        const truncated = desc.slice(0, maxLen) + "...";
        container.innerHTML = `
          <div class="product-content-text collapsed">${truncated}</div>
          <Button class="product-short-description-toggle" type="button">Lire la suite</Button>
        `;
        const toggleBtn = container.querySelector(".product-short-description-toggle");
        if (toggleBtn) {
          toggleBtn.addEventListener("click", () => {
            const textEl = container.querySelector(".product-content-text");
            if (!textEl) return;
            const isCollapsed = textEl.classList.contains("collapsed");
            textEl.classList.toggle("collapsed");
            textEl.innerHTML = isCollapsed ? desc : truncated;
            toggleBtn.textContent = isCollapsed ? "Voir moins" : "Lire la suite";
          });
        }
      } else {
        container.innerHTML = desc;
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
      const container = this.el.querySelector(".product-content-component");
      if (container && product.description) {
        const showImages = model.get("showImages");
        container.classList.toggle("hide-images", !showImages);
        container.innerHTML = product.description;
      }
    },
  },
};
