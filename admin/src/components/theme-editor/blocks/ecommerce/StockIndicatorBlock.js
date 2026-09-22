import ProductServices from "@/services/ProductServices";

export const StockIndicatorBlock = {
  id: "stock-indicator-block",
  label: "= Stock Indicator",
  category: "E-Commerce",
  content: {
    type: "stock-indicator-component",
  },
  attributes: { class: "fa fa-cubes" },
};

export const StockIndicatorComponent = {
  isComponent: (el) => el.classList && el.classList.contains("stock-indicator-component"),
  model: {
    defaults: {
      type: "stock-indicator-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "stock-indicator-component", "data-placeholder-content": "true" },
      styles: `
        .stock-indicator-component {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          width: 100%;
          box-sizing: border-box;
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 14px;
          font-weight: 600;
        }
        .stock-indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .stock-indicator-text {
          line-height: 1.3;
        }
        .stock-indicator-count {
          font-size: 12px;
          opacity: 0.85;
          margin-left: 4px;
        }
      `,
      content: `<span class="stock-indicator-dot" selectable="false" hoverable="false" editable="false"></span><span class="stock-indicator-text" selectable="false" hoverable="false" editable="false">En stock</span>`,
      traits: [
        {
          name: "productId",
          label: "Product ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Produit",
        },
        {
          name: "showRemainingStock",
          label: "Afficher stock restant",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Stock",
        },
        {
          name: "lowStockThreshold",
          label: "Seuil stock faible (unités)",
          type: "number",
          default: 10,
          min: 0,
          changeProp: 1,
          category: "content",
          section: "Stock faible",
        },
        {
          name: "lowStockMessage",
          label: "Message stock faible",
          type: "text",
          default: "Plus que {count} en stock !",
          changeProp: 1,
          category: "content",
          section: "Stock faible",
        },
        {
          name: "inStockMessage",
          label: "Message en stock",
          type: "text",
          default: "En stock",
          changeProp: 1,
          category: "content",
          section: "En stock",
        },
        {
          name: "outOfStockMessage",
          label: "Message rupture",
          type: "text",
          default: "Rupture de stock",
          changeProp: 1,
          category: "content",
          section: "Rupture",
        },
        {
          name: "lowStockColor",
          label: "Couleur stock faible",
          type: "color",
          default: "#dc2626",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "inStockColor",
          label: "Couleur en stock",
          type: "color",
          default: "#16a34a",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "outOfStockColor",
          label: "Couleur rupture",
          type: "color",
          default: "#6b7280",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "stock-indicator-dot" }, selectable: false, hoverable: false, editable: false },
        { tagName: "span", attributes: { class: "stock-indicator-text" }, selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`stock-indicator-${rootId}`);

      this.addAttributes({
        "data-stock-indicator": "true",
        "data-dynamic-source": "product.stock",
        "data-stock-neutral": "",
        "data-stock-threshold": String(this.get("lowStockThreshold") || 10),
        "data-stock-low-message": this.get("lowStockMessage") || "Plus que {count} en stock !",
        "data-stock-in-message": this.get("inStockMessage") || "En stock",
        "data-stock-out-message": this.get("outOfStockMessage") || "Rupture de stock",
        "data-stock-low-color": this.get("lowStockColor") || "#dc2626",
        "data-stock-in-color": this.get("inStockColor") || "#16a34a",
        "data-stock-out-color": this.get("outOfStockColor") || "#6b7280",
      });

      this.on("change:productId", this.loadProduct);
      this.on("change:showRemainingStock change:lowStockThreshold change:lowStockMessage change:inStockMessage change:outOfStockMessage change:lowStockColor change:inStockColor change:outOfStockColor", this.updateStockDisplay);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updateStockDisplay();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateStockDisplay();
            const attrs = this.getAttributes() || {};
            if (attrs["data-placeholder-content"]) {
              const next = { ...attrs };
              delete next["data-placeholder-content"];
              this.setAttributes(next);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load product stock:", err);
          this.set("productData", null);
          this.updateStockDisplay();
        });
    },

    updateStockDisplay() {
      const el = this.view?.el;
      if (!el) return;

      const product = this.get("productData");
      const threshold = this.get("lowStockThreshold") || 10;
      const lowStockMsg = this.get("lowStockMessage") || "Plus que {count} en stock !";
      const inStockMsg = this.get("inStockMessage") || "En stock";
      const outOfStockMsg = this.get("outOfStockMessage") || "Rupture de stock";
      const lowStockColor = this.get("lowStockColor") || "#dc2626";
      const inStockColor = this.get("inStockColor") || "#16a34a";
      const outOfStockColor = this.get("outOfStockColor") || "#6b7280";
      const showRemaining = this.get("showRemainingStock");

      let message = inStockMsg;
      let color = inStockColor;
      let countText = "";

      if (!product) {
        message = "";
        color = "#9ca3af";
      } else if (product.stockStatus === "outofstock" || (product.stockQuantity != null && product.stockQuantity <= 0)) {
        message = outOfStockMsg;
        color = outOfStockColor;
      } else if (product.stockQuantity != null && product.stockQuantity <= threshold) {
        message = lowStockMsg.replace("{count}", String(product.stockQuantity));
        color = lowStockColor;
        if (showRemaining) countText = `(${product.stockQuantity} restant${product.stockQuantity > 1 ? "s" : ""})`;
      } else if (showRemaining && product.stockQuantity != null) {
        countText = `(${product.stockQuantity} en stock)`;
      }

      const textEl = el.querySelector(".stock-indicator-text");
      const dotEl = el.querySelector(".stock-indicator-dot");
      const countEl = el.querySelector(".stock-indicator-count");

      if (textEl) textEl.textContent = message;
      if (dotEl) dotEl.style.backgroundColor = color;
      if (textEl) textEl.style.color = color;
      if (countEl) {
        countEl.textContent = countText;
        countEl.style.display = countText ? "" : "none";
      }
    },
  },

  view: {
    onRender() {
      this.listenTo(this.model, "change:productId change:showRemainingStock change:lowStockThreshold change:lowStockMessage change:inStockMessage change:outOfStockMessage change:lowStockColor change:inStockColor change:outOfStockColor", this.updateStockDisplay);
      this.listenTo(this.model, "change:productData", this.updateStockDisplay);
      this.model.loadProduct();
      this.updateStockDisplay();
    },

    updateStockDisplay() {
      const model = this.model;
      const el = this.el;
      if (!el) return;

      const product = model.get("productData");
      const threshold = model.get("lowStockThreshold") || 10;
      const lowStockMsg = model.get("lowStockMessage") || "Plus que {count} en stock !";
      const inStockMsg = model.get("inStockMessage") || "En stock";
      const outOfStockMsg = model.get("outOfStockMessage") || "Rupture de stock";
      const lowStockColor = model.get("lowStockColor") || "#dc2626";
      const inStockColor = model.get("inStockColor") || "#16a34a";
      const outOfStockColor = model.get("outOfStockColor") || "#6b7280";
      const showRemaining = model.get("showRemainingStock");

      let message = inStockMsg;
      let color = inStockColor;
      let countText = "";

      if (!product) {
        message = "";
        color = "#9ca3af";
      } else if (product.stockStatus === "outofstock" || (product.stockQuantity != null && product.stockQuantity <= 0)) {
        message = outOfStockMsg;
        color = outOfStockColor;
      } else if (product.stockQuantity != null && product.stockQuantity <= threshold) {
        message = lowStockMsg.replace("{count}", String(product.stockQuantity));
        color = lowStockColor;
        if (showRemaining) countText = `(${product.stockQuantity} restant${product.stockQuantity > 1 ? "s" : ""})`;
      } else if (showRemaining && product.stockQuantity != null) {
        countText = `(${product.stockQuantity} en stock)`;
      }

      const textEl = el.querySelector(".stock-indicator-text");
      const dotEl = el.querySelector(".stock-indicator-dot");
      const countEl = el.querySelector(".stock-indicator-count");

      if (textEl) textEl.textContent = message;
      if (dotEl) dotEl.style.backgroundColor = color;
      if (textEl) textEl.style.color = color;
      if (countEl) {
        countEl.textContent = countText;
        countEl.style.display = countText ? "" : "none";
      }
    },
  },
};
