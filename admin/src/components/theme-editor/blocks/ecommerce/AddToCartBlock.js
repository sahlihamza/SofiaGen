import CartServices from "../../../../services/CartServices.js";
import ProductServices from "@/services/ProductServices";

export const AddToCartBlock = {
  id: "add-to-cart-block",
  label: "= Ajouter au panier",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "add-to-cart-component",
  },
  attributes: {
    class: "fa fa-shopping-cart",
  },
};

export const AddToCartComponent = {
  isComponent: (el) => el.classList && el.classList.contains("add-to-cart-component"),
  model: {
    defaults: {
      type: "add-to-cart-component",
      tagName: "div",
      attributes: { class: "add-to-cart-component" },
      styles: `
        .add-to-cart-component {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 20px 0;
          width: 100%;
          max-width: 400px;
          flex-wrap: wrap;
        }
        .add-to-cart-component.out-of-stock {
          opacity: 0.6;
          pointer-events: none;
        }
        .qty-input {
          width: 70px;
          height: 48px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          text-align: center;
          font-size: 16px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s;
        }
        .qty-input:focus {
          border-color: #10b981;
        }
        .qty-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }
        .add-to-cart-btn {
          flex: 1;
          height: 48px;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
          position: relative;
          overflow: hidden;
        }
        .add-to-cart-btn:hover:not(:disabled) {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 6px 8px -1px rgba(16, 185, 129, 0.3);
        }
        .add-to-cart-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .add-to-cart-btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }
        .add-to-cart-btn.loading {
          pointer-events: none;
        }
        .add-to-cart-btn.success {
          background-color: #10b981;
        }
        .btn-spinner {
          display: none;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: atc-spin 0.6s linear infinite;
        }
        .add-to-cart-btn.loading .btn-spinner { display: inline-block; }
        .add-to-cart-btn.loading .btn-text { display: none; }
        @keyframes atc-spin {
          to { transform: rotate(360deg); }
        }
        .variant-select {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          min-width: 140px;
        }
        .variant-select:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }
        .stock-warning {
          font-size: 13px;
          color: #f59e0b;
          margin-top: 4px;
        }
        .out-of-stock-label {
          font-size: 14px;
          color: #ef4444;
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
          name: "storeId",
          label: "Store ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "variantId",
          label: "Variant ID (optionnel)",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "buttonLabel",
          label: "Texte du bouton",
          type: "text",
          default: "Ajouter au panier",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showSuccessFeedback",
          label: "Afficher feedback succès",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "disabledWhenOutOfStock",
          label: "Désactiver si rupture stock",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        {
          tagName: "select",
          attributes: { class: "variant-select", selectable: false, hoverable: false, editable: false },
          components: [
            { tagName: "option", attributes: { value: "", selected: true }, content: "Sélectionner une variante", selectable: false, hoverable: false, editable: false }
          ]
        },
        {
          tagName: "input",
          type: "number",
          attributes: { class: "qty-input", min: "1", value: "1", type: "number", selectable: false, hoverable: false, editable: false }
        },
        {
          tagName: "button",
          attributes: { class: "add-to-cart-btn", type: "button", selectable: false, hoverable: false, editable: false },
          content: `
            <span class="btn-spinner"></span>
            <span class="btn-text">Ajouter au panier</span>
          `
        }
      ]
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:storeId change:variantId change:buttonLabel change:disabledWhenOutOfStock", this.updateUI);
      this.loadProduct();
    },

    onRemove() {
      this._productPromise = null;
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updateUI();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateUI();
          }
        })
        .catch((err) => {
          console.error("Failed to load product for AddToCart:", err);
          this.set("productData", null);
          this.updateUI();
        });
    },

    updateUI() {
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;
      const product = this.get("productData");
      const disabledWhenOOS = this.get("disabledWhenOutOfStock");
      const showFeedback = this.get("showSuccessFeedback");
      const buttonLabel = this.get("buttonLabel") || "Ajouter au panier";

      const btnText = el.querySelector(".btn-text");
      if (btnText) btnText.textContent = buttonLabel;

      const wrapper = el.closest(".add-to-cart-component") || el;
      if (product) {
        wrapper.classList.remove("out-of-stock");
        const qtyInput = el.querySelector(".qty-input");
        if (qtyInput) {
          qtyInput.disabled = false;
          const maxStock = product.stockQuantity || Infinity;
          qtyInput.max = String(maxStock);
        }
        const btn = el.querySelector(".add-to-cart-btn");
        if (btn) {
          const inStock = product.stockStatus === "instock" || product.stockStatus === "onbackorder";
          btn.disabled = disabledWhenOOS && !inStock;
          if (disabledWhenOOS && !inStock) {
            wrapper.classList.add("out-of-stock");
            if (btnText) btnText.textContent = "Rupture de stock";
          }
        }
        const variantSelect = el.querySelector(".variant-select");
        if (variantSelect && product.productVariants && product.productVariants.length > 0) {
          variantSelect.innerHTML = product.productVariants.map((v) =>
            `<option value="${v._id || v.id}">${v.name || v.sku || "Variante"}</option>`
          ).join("");
          variantSelect.style.display = "";
        } else if (variantSelect) {
          variantSelect.style.display = "none";
        }
      } else {
        const btn = el.querySelector(".add-to-cart-btn");
        if (btn) btn.disabled = true;
      }
    },
  },

  view: {
    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);

      if (typeof document !== "undefined") {
        this._clickHandler = (event) => {
          const btn = event.target.closest(".add-to-cart-btn");
          if (!btn || btn.disabled) return;
          const wrapper = btn.closest(".add-to-cart-component");
          if (!wrapper) return;
          event.preventDefault();

          const input = wrapper.querySelector(".qty-input");
          let quantity = Number(input?.value || 1);
          if (isNaN(quantity) || quantity < 1) quantity = 1;
          if (input) input.value = String(quantity);

          const productId = wrapper.getAttribute("data-product-id") || this.model?.get("productId");
          const variantId = wrapper.getAttribute("data-variant-id") || this.model?.get("variantId");
          const price = Number(wrapper.getAttribute("data-price") || this.model?.get("price") || 0);
          const storeId = wrapper.getAttribute("data-store-id") || this.model?.get("storeId");
          const variantSelect = wrapper.querySelector(".variant-select");
          const selectedVariant = variantSelect?.value || variantId;

          if (!productId) {
            console.warn("Add to Cart block is missing a productId.");
            return;
          }

          const product = this.model.get("productData");
          if (product) {
            const maxStock = product.stockQuantity || Infinity;
            if (quantity > maxStock) return;
          }
          const btnText = btn.querySelector(".btn-text");
          const originalLabel = btnText?.textContent || "";

          CartServices.addItem({
            productId,
            variantId: selectedVariant,
            quantity,
            price,
            storeId,
          })
            .then(() => {
              if (this.model.get("showSuccessFeedback")) {
                if (btnText) btnText.textContent = " Ajouté !";
                btn.classList.remove("loading");
                btn.classList.add("success");
                setTimeout(() => {
                  if (btnText) btnText.textContent = originalLabel;
                  btn.classList.remove("success");
                }, 2000);
              } else {
                btn.classList.remove("loading");
              }
              if (input) input.value = "1";
            })
            .catch((error) => {
              console.error("Add to cart failed", error);
              btn.classList.remove("loading");
              if (btnText) btnText.textContent = "Erreur";
              setTimeout(() => {
                if (btnText) btnText.textContent = originalLabel;
              }, 2000);
            });
        };
        document.addEventListener("click", this._clickHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._clickHandler) {
        document.removeEventListener("click", this._clickHandler);
        this._clickHandler = null;
      }
    },
  },
};
