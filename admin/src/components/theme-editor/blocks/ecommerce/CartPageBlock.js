import CartServices from "@/services/CartServices";
import { Button } from "@sofia/ui";


const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect fill='%23f3f4f6' width='60' height='60'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='10' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImg%3C/text%3E%3C/svg%3E";

export const CartPageBlock = {
  id: "cart-page-block",
  label: "ðŸ›’ Cart Page",

  category: "E-Commerce",
  content: {
    type: "cart-page-component",
  },
  attributes: { class: "fa fa-shopping-cart" },
};

export const CartPageComponent = {
  isComponent: (el) => el.classList && el.classList.contains("cart-page-component"),
  model: {
    defaults: {
      type: "cart-page-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "cart-page-component", "data-placeholder-content": "true" },
      styles: `
        .cart-page-component {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: var(--ts-section-spacing, 40px) 20px;
        }
        .cart-empty {
          text-align: center;
          padding: 60px 20px;
        }
        .cart-empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .cart-empty-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }
        .cart-empty-text {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        .cart-continue-link {
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border-radius: 6px;
          font-weight: 600;
          text-decoration: none;
        }
        .cart-table {
          width: 100%;
          border-collapse: collapse;
        }
        .cart-table th,
        .cart-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .cart-table th {
          font-weight: 600;
          color: #374151;
          background: #f9fafb;
        }
        .cart-table td {
          color: #6b7280;
        }
        .cart-product-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cart-product-info img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 6px;
          background: #f3f4f6;
        }
        .cart-product-sku {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 2px;
        }
        .cart-product-variant {
          font-size: 12px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 4px;
        }
        .cart-qty-input {
          width: 60px;
          padding: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          text-align: center;
        }
        .cart-remove-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 13px;
        }
        .cart-coupon-section {
          display: flex;
          gap: 8px;
          margin: 20px 0;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          align-items: flex-end;
        }
        .cart-coupon-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }
        .cart-coupon-apply {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .cart-shipping-section {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .cart-shipping-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          color: #374151;
        }
        .cart-shipping-input {
          width: 200px;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }
        .cart-total-section {
          display: flex;
          justify-content: flex-end;
          padding: 20px 0;
        }
        .cart-total-box {
          text-align: right;
          min-width: 280px;
        }
        .cart-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .cart-total-row.discount {
          color: #10b981;
        }
        .cart-total-amount {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }
        .cart-checkout-btn {
          display: inline-block;
          margin-top: 12px;
          padding: 12px 32px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
        }
        .cart-loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        .cart-spinner {
          display: inline-block;
          width: 24px;
          height: 24px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: cart-spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes cart-spin {
          to { transform: rotate(360deg); }
        }
      `,
      traits: [
        {
          name: "storeId",
          label: "Store ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showCouponInput",
          label: "Afficher champ code promo",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showShippingEstimate",
          label: "Afficher estimation livraison",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showTaxLine",
          label: "Afficher ligne TVA",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "continueShoppingUrl",
          label: "URL retour boutique",
          type: "text",
          default: "/products",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "cart-loading", selectable: false, hoverable: false, editable: false }, content: "<div class='cart-spinner'></div><div>Chargement du panier...</div>" },
        { tagName: "table", attributes: { class: "cart-table", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "thead", selectable: false, hoverable: false, editable: false, components: [
            { tagName: "tr", selectable: false, hoverable: false, editable: false, components: [
              { tagName: "th", content: "Produit", selectable: false, hoverable: false, editable: false },
              { tagName: "th", content: "Prix", selectable: false, hoverable: false, editable: false },
              { tagName: "th", content: "QuantitÃ©", selectable: false, hoverable: false, editable: false },
              { tagName: "th", content: "Sous-total", selectable: false, hoverable: false, editable: false },
              { tagName: "th", content: "", selectable: false, hoverable: false, editable: false },
            ]},
          ]},
          { tagName: "tbody", content: "<tr><td colspan='5' style='text-align:center;color:#9ca3af;'>Votre panier est vide</td></tr>", selectable: false, hoverable: false, editable: false },
        ]},
        { tagName: "div", attributes: { class: "cart-coupon-section", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "input", attributes: { type: "text", placeholder: "Code promo", class: "cart-coupon-input", selectable: false, hoverable: false, editable: false } },
          { tagName: "button", attributes: { class: "cart-coupon-apply", type: "button", selectable: false, hoverable: false, editable: false }, content: "Appliquer" },
        ]},
        { tagName: "div", attributes: { class: "cart-shipping-section", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "div", attributes: { class: "cart-shipping-title", selectable: false, hoverable: false, editable: false }, content: "Estimation livraison" },
          { tagName: "input", attributes: { type: "text", placeholder: "Code postal", class: "cart-shipping-input", selectable: false, hoverable: false, editable: false } },
        ]},
        { tagName: "div", attributes: { class: "cart-total-section", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "div", attributes: { class: "cart-total-box", selectable: false, hoverable: false, editable: false }, components: [
            { tagName: "div", attributes: { class: "cart-total-row", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "Sous-total", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "cart-subtotal-amount", selectable: false, hoverable: false, editable: false }, content: "â‚¬0.00" },
            ]},
            { tagName: "div", attributes: { class: "cart-total-row", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "Livraison", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "cart-shipping-amount", selectable: false, hoverable: false, editable: false }, content: "CalculÃ© Ã  la prochaine Ã©tape" },
            ]},
            { tagName: "div", attributes: { class: "cart-total-row discount", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "Remise", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "cart-discount-amount", selectable: false, hoverable: false, editable: false }, content: "-â‚¬0.00" },
            ]},
            { tagName: "div", attributes: { class: "cart-total-row", style: "display:none;", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "TVA", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "cart-tax-amount", selectable: false, hoverable: false, editable: false }, content: "â‚¬0.00" },
            ]},
            { tagName: "div", attributes: { class: "cart-total-amount", selectable: false, hoverable: false, editable: false }, content: "â‚¬0.00" },
            { tagName: "a", attributes: { class: "cart-checkout-btn", href: "/checkout", selectable: false, hoverable: false, editable: false }, content: "Passer Ã  la caisse" },

          ]},
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this._debounceTimer = null;
      this.on("change:storeId", this.loadCart);
      this.loadCart();

      if (typeof document !== "undefined") {
        this._cartHandler = (e) => {
          const input = e.target.closest(".cart-qty-input");
          if (input) {
            const idx = parseInt(input.dataset.itemIdx, 10);
            const cart = this.get("cartData");
            const items = cart?.items || [];
            const newQty = Math.max(1, parseInt(input.value, 10) || 1);
            input.value = newQty;
            const item = items[idx];
            if (!item) return;
            const maxStock = item.stockQuantity || Infinity;
            if (newQty > maxStock) {
              input.value = String(item.quantity || 1);
              return;
            }
            const itemId = item._id || item.id;
            if (itemId) {
              clearTimeout(this._debounceTimer);
              this._debounceTimer = setTimeout(() => {
                CartServices.updateItem(itemId, { quantity: newQty }).then(() => this.loadCart());
              }, 400);
            }
            return;
          }
          const btn = e.target.closest(".cart-remove-btn");
          if (btn) {
            const idx = parseInt(btn.dataset.itemIdx, 10);
            const cart = this.get("cartData");
            const items = cart?.items || [];
            const item = items[idx];
            const itemId = item?._id || item?.id;
            if (itemId) {
              CartServices.deleteItem(itemId).then(() => this.loadCart());
            }
          }
          const couponBtn = e.target.closest(".cart-coupon-apply");
          if (couponBtn) {
            const input = couponBtn.closest(".cart-coupon-section")?.querySelector(".cart-coupon-input");
            const code = input?.value?.trim();
            if (code) {
              CartServices.applyCoupon(code).then(() => this.loadCart());
            }
          }
        };
        document.addEventListener("change", this._cartHandler);
        document.addEventListener("click", this._cartHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._cartHandler) {
        document.removeEventListener("change", this._cartHandler);
        document.removeEventListener("click", this._cartHandler);
        this._cartHandler = null;
      }
      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = null;
      }
    },

    loadCart() {
      const storeId = this.get("storeId");
      if (!storeId) return;
      const sessionId = CartServices.getSessionId();

      if (this.view) {
        const loadingEl = this.view.el.querySelector(".cart-loading");
        if (loadingEl) loadingEl.style.display = "block";
        const tableEl = this.view.el.querySelector(".cart-table");
        if (tableEl) tableEl.style.display = "none";
      }

      CartServices.getCart(sessionId)
        .then((response) => {
          const cart = response?.data || response;
          this.set("cartData", cart);
          this.renderCart();
        })
        .catch((err) => {
          console.error("Failed to load cart:", err);
          if (this.view) {
            const loadingEl = this.view.el.querySelector(".cart-loading");
            if (loadingEl) loadingEl.style.display = "none";
          }
        });
    },

    renderCart() {
      const cart = this.get("cartData");
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;
      const items = cart?.items || [];

      const loadingEl = el.querySelector(".cart-loading");
      if (loadingEl) loadingEl.style.display = "none";

      const tableEl = el.querySelector(".cart-table");
      if (tableEl) tableEl.style.display = "";

      const tbody = el.querySelector(".cart-table tbody");
      if (tbody) {
        if (items.length === 0) {
          const continueUrl = this.get("continueShoppingUrl") || "/products";
          tbody.innerHTML = `
            <tr>
              <td colspan="5">
                <div class="cart-empty">
                  <div class="cart-empty-icon">ðŸ›’</div>

                  <div class="cart-empty-title">Votre panier est vide</div>
                  <div class="cart-empty-text">Ajoutez des articles pour commencer vos achats.</div>
                  <a href="${continueUrl}" class="cart-continue-link">Continuer vos achats</a>
                </div>
              </td>
            </tr>`;
        } else {
          tbody.innerHTML = items
            .map(
              (item, idx) => `
              <tr>
                <td>
                  <div class="cart-product-info">
                    <img src="${item.thumbnail || placeholderImage}" alt="${item.name || "Product"}" />
                    <div>
                      <div>${item.name || "Product"}</div>
                      ${item.sku ? `<div class="cart-product-sku">SKU: ${item.sku}</div>` : ""}
                      ${item.variantInfo ? `<div class="cart-product-variant">${item.variantInfo}</div>` : ""}
                    </div>
                  </div>
                </td>
                <td>â‚¬${(item.price || 0).toFixed(2)}</td>
                <td><input class="cart-qty-input" type="number" value="${item.quantity || 1}" min="1" max="${item.stockQuantity || 999}" data-item-id="${item._id || item.id}" data-item-idx="${idx}" /></td>
                <td>â‚¬${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                <td><Button class="cart-remove-btn" data-item-id="${item._id || item.id}" data-item-idx="${idx}">Supprimer</Button></td>

              </tr>
            `
            )
            .join("");
        }
      }

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = cart?.discount || 0;
      const shipping = items.length > 0 ? (cart.shipping || 0) : 0;
      const tax = this.get("showTaxLine") ? (cart?.tax || subtotal * 0.2) : 0;
      const total = subtotal - discount + shipping + tax;

      const setText = (cls, text) => {
        const el2 = this.view.el.querySelector(cls);
        if (el2) el2.textContent = text;
      };
      setText(".cart-subtotal-amount", `â‚¬${subtotal.toFixed(2)}`);
      setText(".cart-discount-amount", discount > 0 ? `-â‚¬${discount.toFixed(2)}` : "-â‚¬0.00");
      const taxEl = this.view.el.querySelector(".cart-tax-amount");
      if (taxEl && this.get("showTaxLine")) {
        taxEl.closest(".cart-total-row")?.style && (taxEl.closest(".cart-total-row").style.display = "");
        setText(".cart-tax-amount", `â‚¬${tax.toFixed(2)}`);

      } else if (taxEl) {
        const row = taxEl.closest(".cart-total-row");
        if (row) row.style.display = "none";
      }
      const totalAmountEl = this.view.el.querySelector(".cart-total-amount");
      if (totalAmountEl) totalAmountEl.textContent = `â‚¬${total.toFixed(2)}`;


      const couponSection = this.view.el.querySelector(".cart-coupon-section");
      if (couponSection) couponSection.style.display = this.get("showCouponInput") ? "flex" : "none";

      const shippingSection = this.view.el.querySelector(".cart-shipping-section");
      if (shippingSection) shippingSection.style.display = this.get("showShippingEstimate") ? "block" : "none";

      const continueUrl = this.get("continueShoppingUrl") || "/products";
      const continueLink = this.view.el.querySelector(".cart-continue-link");
      if (continueLink) continueLink.setAttribute("href", continueUrl);

      const checkoutLink = this.view.el.querySelector(".cart-checkout-btn");
      if (checkoutLink) checkoutLink.setAttribute("href", "/checkout");

      const attrs = this.getAttributes() || {};
      if (attrs["data-placeholder-content"]) {
        const next = { ...attrs };
        delete next["data-placeholder-content"];
        this.setAttributes(next);
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:cartData", this.renderCart);
    },

    onRender() {
      this.renderCart();
    },

    renderCart() {
      const model = this.model;
      const cart = model.get("cartData");
      if (!this.el) return;
      const el = this.el;
      const items = cart?.items || [];

      const loadingEl = el.querySelector(".cart-loading");
      if (loadingEl) loadingEl.style.display = "none";

      const tableEl = el.querySelector(".cart-table");
      if (tableEl) tableEl.style.display = "";

      const tbody = el.querySelector(".cart-table tbody");
      if (tbody) {
        if (items.length === 0) {
          const continueUrl = model.get("continueShoppingUrl") || "/products";
          tbody.innerHTML = `
            <tr>
              <td colspan="5">
                <div class="cart-empty">
                  <div class="cart-empty-icon">ðŸ›’</div>

                  <div class="cart-empty-title">Votre panier est vide</div>
                  <div class="cart-empty-text">Ajoutez des articles pour commencer vos achats.</div>
                  <a href="${continueUrl}" class="cart-continue-link">Continuer vos achats</a>
                </div>
              </td>
            </tr>`;
        } else {
          tbody.innerHTML = items
            .map(
              (item, idx) => `
              <tr>
                <td>
                  <div class="cart-product-info">
                    <img src="${item.thumbnail || placeholderImage}" alt="${item.name || "Product"}" />
                    <div>
                      <div>${item.name || "Product"}</div>
                      ${item.sku ? `<div class="cart-product-sku">SKU: ${item.sku}</div>` : ""}
                      ${item.variantInfo ? `<div class="cart-product-variant">${item.variantInfo}</div>` : ""}
                    </div>
                  </div>
                </td>
                <td>â‚¬${(item.price || 0).toFixed(2)}</td>
                <td><input class="cart-qty-input" type="number" value="${item.quantity || 1}" min="1" max="${item.stockQuantity || 999}" data-item-id="${item._id || item.id}" data-item-idx="${idx}" /></td>
                <td>â‚¬${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                <td><Button class="cart-remove-btn" data-item-id="${item._id || item.id}" data-item-idx="${idx}">Supprimer</Button></td>

              </tr>
            `
            )
            .join("");
        }
      }

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = cart?.discount || 0;
      const shipping = items.length > 0 ? (cart.shipping || 0) : 0;
      const tax = model.get("showTaxLine") ? (cart?.tax || subtotal * 0.2) : 0;
      const total = subtotal - discount + shipping + tax;

      const setText = (cls, text) => {
        const el2 = el.querySelector(cls);
        if (el2) el2.textContent = text;
      };
      setText(".cart-subtotal-amount", `â‚¬${subtotal.toFixed(2)}`);
      setText(".cart-discount-amount", discount > 0 ? `-â‚¬${discount.toFixed(2)}` : "-â‚¬0.00");

      const taxEl = el.querySelector(".cart-tax-amount");
      if (taxEl && model.get("showTaxLine")) {
        const row = taxEl.closest(".cart-total-row");
        if (row) row.style.display = "";
        setText(".cart-tax-amount", `€${tax.toFixed(2)}`);

      } else if (taxEl) {
        const row = taxEl.closest(".cart-total-row");
        if (row) row.style.display = "none";
      }
      const totalAmountEl = el.querySelector(".cart-total-amount");
      if (totalAmountEl) totalAmountEl.textContent = `â‚¬${total.toFixed(2)}`;


      const couponSection = el.querySelector(".cart-coupon-section");
      if (couponSection) couponSection.style.display = model.get("showCouponInput") ? "flex" : "none";

      const shippingSection = el.querySelector(".cart-shipping-section");
      if (shippingSection) shippingSection.style.display = model.get("showShippingEstimate") ? "block" : "none";

      const continueUrl = model.get("continueShoppingUrl") || "/products";
      const continueLink = el.querySelector(".cart-continue-link");
      if (continueLink) continueLink.setAttribute("href", continueUrl);

      const checkoutLink = el.querySelector(".cart-checkout-btn");
      if (checkoutLink) checkoutLink.setAttribute("href", "/checkout");
    },
  },
};
