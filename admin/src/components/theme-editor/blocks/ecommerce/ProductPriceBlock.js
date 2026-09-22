import ProductServices from "@/services/ProductServices";

export const ProductPriceBlock = {
  id: "product-price-block",
  label: "= Prix du produit",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "product-price-component",
  },
  attributes: { class: "fa fa-tag" },
};

export const ProductPriceComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-price-component"),
  model: {
    defaults: {
      type: "product-price-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-price-component", "data-placeholder-content": "true" },
      styles: `
        .product-price-component {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .product-price-regular {
          font-size: 24px;
          font-weight: 700;
          color: var(--ts-color-text-primary, #111827);
        }
        .product-price-sale {
          font-size: 24px;
          font-weight: 700;
          color: var(--ts-color-primary, #ef4444);
        }
        .product-price-original {
          font-size: 16px;
          color: var(--ts-color-text-secondary, #9ca3af);
          text-decoration: line-through;
        }
        .product-price-badge {
          background: var(--ts-color-primary, #ef4444);
          color: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
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
          name: "currencyPosition",
          label: "Position devise",
          type: "select",
          default: "left",
          options: [
            { value: "left", label: "Gauche (€100)" },
            { value: "right", label: "Droite (100)" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showBadge",
          label: "Afficher badge promo",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "product-price-sale", selectable: false, hoverable: false, editable: false }, content: "" },
        { tagName: "span", attributes: { class: "product-price-original", selectable: false, hoverable: false, editable: false }, content: "" },
        { tagName: "span", attributes: { class: "product-price-badge", selectable: false, hoverable: false, editable: false }, content: "" },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:currencyPosition change:showBadge", this.updatePrice);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updatePrice();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updatePrice();
          }
        })
        .catch((err) => {
          console.error("Failed to load product price:", err);
          this.set("productData", null);
          this.updatePrice();
        });
    },

    formatPrice(amount, position) {
      if (amount == null || isNaN(amount)) return "";
      const formatted = Number(amount).toFixed(2);
      return position === "right" ? `${formatted}` : `${formatted}`;
    },

    updatePrice() {
      const product = this.get("productData");
      const position = this.get("currencyPosition") || "left";
      const showBadge = this.get("showBadge");

      const format = (amt) => {
        if (amt == null || isNaN(amt)) return "";
        const f = Number(amt).toFixed(2);
        return position === "right" ? `${f}` : `${f}`;
      };

      const applyPriceUpdate = (el) => {
        const saleEl = el.querySelector(".product-price-sale");
        const regularEl = el.querySelector(".product-price-original");
        const badgeEl = el.querySelector(".product-price-badge");

        if (!product) {
          if (saleEl) saleEl.textContent = "";
          if (regularEl) { regularEl.textContent = ""; regularEl.style.display = ""; }
          if (badgeEl) { badgeEl.textContent = ""; badgeEl.style.display = "none"; }
          return;
        }

        const regular = product.regularPrice;
        const sale = product.salePrice;
        const hasSale = sale != null && sale < (regular || product.price || 0);
        const effectiveRegular = regular || product.price || 0;

        if (saleEl) saleEl.textContent = format(hasSale ? sale : effectiveRegular);
        if (regularEl) {
          regularEl.textContent = hasSale ? format(effectiveRegular) : "";
          regularEl.style.display = hasSale ? "" : "none";
        }
        if (badgeEl) {
          if (hasSale && showBadge && effectiveRegular > 0) {
            const discount = Math.round(((effectiveRegular - sale) / effectiveRegular) * 100);
            badgeEl.textContent = `-${discount}%`;
            badgeEl.style.display = "";
          } else {
            badgeEl.style.display = "none";
          }
        }
      };

      if (this.view) {
        const el = this.view.el;
        if (el) applyPriceUpdate(el);
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
      const position = model.get("currencyPosition") || "left";
      const showBadge = model.get("showBadge");
      const format = (amt) => {
        if (amt == null || isNaN(amt)) return "";
        const f = Number(amt).toFixed(2);
        return position === "right" ? `${f}` : `${f}`;
      };

      const regular = product.regularPrice;
      const sale = product.salePrice;
      const hasSale = sale != null && sale < (regular || product.price || 0);
      const effectiveRegular = regular || product.price || 0;

      const saleEl = this.el.querySelector(".product-price-sale");
      const regularEl = this.el.querySelector(".product-price-original");
      const badgeEl = this.el.querySelector(".product-price-badge");

      if (saleEl) saleEl.textContent = format(hasSale ? sale : effectiveRegular);
      if (regularEl) {
        regularEl.textContent = hasSale ? format(effectiveRegular) : "";
        regularEl.style.display = hasSale ? "" : "none";
      }
      if (badgeEl && hasSale && showBadge && effectiveRegular > 0) {
        const discount = Math.round(((effectiveRegular - sale) / effectiveRegular) * 100);
        badgeEl.textContent = `-${discount}%`;
        badgeEl.style.display = "";
      } else if (badgeEl) {
        badgeEl.style.display = "none";
      }
    },
  },
};
