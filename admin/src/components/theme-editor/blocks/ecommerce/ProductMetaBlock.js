import ProductServices from "@/services/ProductServices";

export const ProductMetaBlock = {
  id: "product-meta-block",
  label: "= Product Meta",
  category: "E-Commerce",
  content: {
    type: "product-meta-component",
  },
  attributes: { class: "fa fa-info-circle" },
};

export const ProductMetaComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-meta-component"),
  model: {
    defaults: {
      type: "product-meta-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-meta-component", "data-placeholder-content": "true" },
      styles: `
        .product-meta-component {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
        }
        .product-meta-item {
          display: flex;
          gap: 8px;
        }
        .product-meta-label {
          font-weight: 600;
          color: #374151;
          min-width: 80px;
        }
        .product-meta-value {
          color: #6b7280;
        }
        .product-meta-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .product-meta-tag {
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          color: #374151;
        }
      `,
      traits: [
        {
          name: "productId",
          label: "Product ID",
          type: "text",
          changeProp: 1,
          category: "content",
        },
        {
          name: "showSku",
          label: "Afficher SKU",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
        },
        {
          name: "showCategory",
          label: "Afficher catégorie",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
        },
        {
          name: "showTags",
          label: "Afficher les tags",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "product-meta-item", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "span", attributes: { class: "product-meta-label", selectable: false, hoverable: false, editable: false }, content: "SKU:" },
          { tagName: "span", attributes: { class: "product-meta-value", selectable: false, hoverable: false, editable: false }, content: "ABC-123" },
        ]},
        { tagName: "div", attributes: { class: "product-meta-item", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "span", attributes: { class: "product-meta-label", selectable: false, hoverable: false, editable: false }, content: "Catégorie:" },
          { tagName: "span", attributes: { class: "product-meta-value", selectable: false, hoverable: false, editable: false }, content: "Catégorie" },
        ]},
        { tagName: "div", attributes: { class: "product-meta-tags", selectable: false, hoverable: false, editable: false } },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:showSku change:showCategory change:showTags", this.updateMeta);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updateMeta();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateMeta();
          }
        })
        .catch((err) => console.error("Failed to load product meta:", err));
    },

    updateMeta() {
      const product = this.get("productData");
      const showSku = this.get("showSku");
      const showCategory = this.get("showCategory");
      const showTags = this.get("showTags");
      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;

      const items = el.querySelectorAll(".product-meta-item");
      if (items[0]) {
        const label = items[0].querySelector(".product-meta-label");
        const value = items[0].querySelector(".product-meta-value");
        if (label) label.textContent = "SKU:";
        if (value) {
          value.textContent = product.sku || "N/A";
          value.style.display = showSku ? "" : "none";
        }
        items[0].style.display = showSku ? "flex" : "none";
      }
      if (items[1]) {
        const label = items[1].querySelector(".product-meta-label");
        const value = items[1].querySelector(".product-meta-value");
        if (label) label.textContent = "Catégorie:";
        if (value) {
          value.textContent = product.productCategory?.name || "N/A";
          value.style.display = showCategory ? "" : "none";
        }
        items[1].style.display = showCategory ? "flex" : "none";
      }

      const tagsContainer = el.querySelector(".product-meta-tags");
      if (tagsContainer) {
        tagsContainer.style.display = showTags ? "flex" : "none";
        if (showTags && product.productTags && product.productTags.length > 0) {
          tagsContainer.innerHTML = product.productTags
            .map((tag) => `<span class="product-meta-tag">${tag.tagId?.name || tag.name || "Tag"}</span>`)
            .join("");
        } else if (showTags) {
          tagsContainer.innerHTML = "";
        }
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
      const items = this.el.querySelectorAll(".product-meta-item");
      if (items[0]) {
        const value = items[0].querySelector(".product-meta-value");
        if (value) value.textContent = product.sku || "N/A";
      }
      if (items[1]) {
        const value = items[1].querySelector(".product-meta-value");
        if (value) value.textContent = product.productCategory?.name || "N/A";
      }
      const tagsContainer = this.el.querySelector(".product-meta-tags");
      if (tagsContainer && product.productTags && product.productTags.length > 0) {
        tagsContainer.innerHTML = product.productTags
          .map((tag) => `<span class="product-meta-tag">${tag.tagId?.name || tag.name || "Tag"}</span>`)
          .join("");
      }
    },
  },
};
