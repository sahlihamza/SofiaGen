import CartServices from "@/services/CartServices";
import { Button } from "@sofia/ui";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect fill='%23f3f4f6' width='60' height='60'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='10' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImg%3C/text%3E%3C/svg%3E";

export const MiniCartBlock = {
  id: "mini-cart-block",
  label: "ðŸ›’ Mini Cart",
  category: "E-Commerce",
  content: {
    type: "mini-cart-component",
  },
  attributes: { class: "fa fa-shopping-cart" },
};

export const MiniCartComponent = {
  isComponent: (el) => el.classList && el.classList.contains("mini-cart-component"),
  model: {
    defaults: {
      type: "mini-cart-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "mini-cart-component", "data-placeholder-content": "true" },
      styles: `
        .mini-cart-component {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        .mini-cart-icon {
          font-size: 24px;
          color: #374151;
        }
        .mini-cart-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }
        .mini-cart-badge.bump {
          transform: scale(1.3);
        }
        .mini-cart-drawer {
          position: fixed;
          top: 0;
          right: -420px;
          width: 400px;
          max-width: 90vw;
          height: 100vh;
          background: white;
          box-shadow: -4px 0 20px rgba(0,0,0,0.15);
          z-index: 99999;
          transition: right 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .mini-cart-drawer.open {
          right: 0;
        }
        .mini-cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .mini-cart-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .mini-cart-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px 8px;
        }
        .mini-cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }
        .mini-cart-item {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .mini-cart-item img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 6px;
          background: #f3f4f6;
        }
        .mini-cart-item-info {
          flex: 1;
          min-width: 0;
        }
        .mini-cart-item-name {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mini-cart-item-variant {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        .mini-cart-item-price {
          font-size: 13px;
          color: #6b7280;
        }
        .mini-cart-item-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }
        .mini-cart-qty-btn {
          width: 24px;
          height: 24px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
        }
        .mini-cart-qty-btn:hover {
          background: #f9fafb;
        }
        .mini-cart-qty {
          font-size: 13px;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }
        .mini-cart-item-remove {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 11px;
          padding: 2px 4px;
          margin-top: 4px;
        }
        .mini-cart-footer {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
        }
        .mini-cart-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .mini-cart-row.total {
          font-weight: 700;
          font-size: 16px;
          color: #111827;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }
        .mini-cart-checkout {
          display: block;
          width: 100%;
          padding: 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          margin-top: 12px;
          text-decoration: none;
        }
        .mini-cart-empty {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }
        .mini-cart-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .mini-cart-empty-text {
          font-size: 14px;
          margin-bottom: 16px;
        }
        .mini-cart-empty-cta {
          display: inline-block;
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        .mini-cart-undo {
          display: none;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          margin: 8px 16px;
          font-size: 13px;
          color: #166534;
        }
        .mini-cart-undo.visible {
          display: flex;
        }
        .mini-cart-undo-btn {
          background: none;
          border: none;
          color: #15803d;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          text-decoration: underline;
        }
        .mini-cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 99998;
          display: none;
        }
        .mini-cart-overlay.open {
          display: block;
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
          name: "showProductImage",
          label: "Afficher image produit",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showQuantityControls",
          label: "Afficher contrÃ´les quantitÃ©",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showRemoveButton",
          label: "Afficher bouton supprimer",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showEmptyCta",
          label: "Afficher CTA panier vide",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "checkoutUrl",
          label: "URL de commande",
          type: "text",
          default: "/checkout",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "mini-cart-icon", selectable: false, hoverable: false, editable: false }, content: "ðŸ›’" },
        { tagName: "span", attributes: { class: "mini-cart-badge", selectable: false, hoverable: false, editable: false }, content: "0" },
        { tagName: "div", attributes: { class: "mini-cart-overlay", selectable: false, hoverable: false, editable: false } },
        { tagName: "div", attributes: { class: "mini-cart-drawer", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "div", attributes: { class: "mini-cart-header", selectable: false, hoverable: false, editable: false }, components: [
            { tagName: "h3", content: "Panier", selectable: false, hoverable: false, editable: false },
            { tagName: "button", attributes: { class: "mini-cart-close", type: "button", selectable: false, hoverable: false, editable: false }, content: "Ã—" },
          ]},
          { tagName: "div", attributes: { class: "mini-cart-undo", selectable: false, hoverable: false, editable: false }, components: [
            { tagName: "span", content: "Article retirÃ© du panier", selectable: false, hoverable: false, editable: false },
            { tagName: "button", attributes: { class: "mini-cart-undo-btn", type: "button", selectable: false, hoverable: false, editable: false }, content: "Annuler" },
          ]},
          { tagName: "div", attributes: { class: "mini-cart-items", selectable: false, hoverable: false, editable: false } },
          { tagName: "div", attributes: { class: "mini-cart-footer", selectable: false, hoverable: false, editable: false }, components: [
            { tagName: "div", attributes: { class: "mini-cart-row", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "Sous-total", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "mini-cart-subtotal", selectable: false, hoverable: false, editable: false }, content: "â‚¬0.00" },
            ]},
            { tagName: "div", attributes: { class: "mini-cart-row", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "Livraison", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "mini-cart-shipping", selectable: false, hoverable: false, editable: false }, content: "CalculÃ© Ã  la prochaine Ã©tape" },
            ]},
            { tagName: "div", attributes: { class: "mini-cart-row total", selectable: false, hoverable: false, editable: false }, components: [
              { tagName: "span", content: "Total", selectable: false, hoverable: false, editable: false },
              { tagName: "span", attributes: { class: "mini-cart-total", selectable: false, hoverable: false, editable: false }, content: "â‚¬0.00" },
            ]},
            { tagName: "a", attributes: { class: "mini-cart-checkout", href: "/checkout", selectable: false, hoverable: false, editable: false }, content: "Commander" },
          ]},
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this._lastRemovedItem = null;
      this._undoTimeout = null;
      this.on("change:storeId", this.loadCart);
      this.loadCart();

      if (typeof window !== "undefined") {
        this._storageHandler = () => this.loadCart();
        window.addEventListener("storage", this._storageHandler);
      }

      if (typeof document !== "undefined") {
        this._miniCartHandler = (e) => {
          const icon = e.target.closest(".mini-cart-icon");
          if (icon) {
            const root = icon.closest(".mini-cart-component");
            if (!root) return;
            this.openDrawer(root);
            return;
          }
          const closeBtn = e.target.closest(".mini-cart-close");
          if (closeBtn) {
            const root = closeBtn.closest(".mini-cart-component");
            if (!root) return;
            this.closeDrawer(root);
            return;
          }
          const overlay = e.target.closest(".mini-cart-overlay");
          if (overlay) {
            const root = overlay.closest(".mini-cart-component");
            if (!root) return;
            this.closeDrawer(root);
          }
          const qtyBtn = e.target.closest(".mini-cart-qty-btn");
          if (qtyBtn) {
            const itemEl = qtyBtn.closest(".mini-cart-item");
            if (!itemEl) return;
            const itemId = itemEl.dataset.itemId;
            const delta = parseInt(qtyBtn.dataset.delta || "0", 10);
            const currentQty = parseInt(itemEl.dataset.qty || "1", 10);
            const newQty = Math.max(1, currentQty + delta);
            if (delta !== 0 && itemId) {
              CartServices.updateItem(itemId, { quantity: newQty }).then(() => {
                itemEl.dataset.qty = String(newQty);
                this.loadCart();
              });
            }
            return;
          }
          const removeBtn = e.target.closest(".mini-cart-item-remove");
          if (removeBtn) {
            const itemEl = removeBtn.closest(".mini-cart-item");
            if (!itemEl) return;
            const itemId = itemEl.dataset.itemId;
            const itemName = itemEl.querySelector(".mini-cart-item-name")?.textContent || "Article";
            if (itemId) {
              CartServices.deleteItem(itemId).then(() => {
                this._lastRemovedItem = { itemId, itemName };
                this.loadCart();
                this.showUndo();
              });
            }
            return;
          }
          const undoBtn = e.target.closest(".mini-cart-undo-btn");
          if (undoBtn) {
            this.hideUndo();
            if (this._lastRemovedItem && this._lastRemovedItem.itemId) {
              const storeId = this.get("storeId");
              CartServices.addItem({
                productId: this._lastRemovedItem.itemId,
                quantity: 1,
                storeId,
              }).then(() => {
                this._lastRemovedItem = null;
                this.loadCart();
              });
            }
            return;
          }
          const checkoutLink = e.target.closest(".mini-cart-checkout");
          if (checkoutLink) {
            const checkoutUrl = this.get("checkoutUrl") || "/checkout";
            if (e.target.tagName === "A") {
              e.target.setAttribute("href", checkoutUrl);
            }
          }
        };
        document.addEventListener("click", this._miniCartHandler);
      }
    },

    onRemove() {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", this._storageHandler);
        this._storageHandler = null;
      }
      if (typeof document !== "undefined" && this._miniCartHandler) {
        document.removeEventListener("click", this._miniCartHandler);
        this._miniCartHandler = null;
      }
      if (this._undoTimeout) {
        clearTimeout(this._undoTimeout);
        this._undoTimeout = null;
      }
    },

    openDrawer(root) {
      const drawer = root.querySelector(".mini-cart-drawer");
      const overlay = root.querySelector(".mini-cart-overlay");
      if (drawer) drawer.classList.add("open");
      if (overlay) overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    },

    closeDrawer(root) {
      const drawer = root.querySelector(".mini-cart-drawer");
      const overlay = root.querySelector(".mini-cart-overlay");
      if (drawer) drawer.classList.remove("open");
      if (overlay) overlay.classList.remove("open");
      document.body.style.overflow = "";
    },

    showUndo() {
      if (typeof document === "undefined" || !this.view) return;
      const undoEl = this.view.el.querySelector(".mini-cart-undo");
      if (undoEl) {
        undoEl.classList.add("visible");
        this._undoTimeout = setTimeout(() => {
          undoEl.classList.remove("visible");
          this._lastRemovedItem = null;
        }, 5000);
      }
    },

    hideUndo() {
      if (this._undoTimeout) clearTimeout(this._undoTimeout);
      if (typeof document !== "undefined" && this.view) {
        const undoEl = this.view.el.querySelector(".mini-cart-undo");
        if (undoEl) undoEl.classList.remove("visible");
      }
    },

    loadCart() {
      const storeId = this.get("storeId");
      if (!storeId) return;
      const sessionId = CartServices.getSessionId();
      CartServices.getCart(sessionId)
        .then((response) => {
          const cart = response?.data || response;
          this.set("cartData", cart);
          this.updateCartUI();
        })
        .catch((err) => console.error("Failed to load cart:", err));
    },

    updateCartUI() {
      const cart = this.get("cartData");
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;

      const items = cart?.items || [];
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shipping = items.length > 0 ? (cart.shipping || 0) : 0;
      const total = subtotal + shipping;

      const badge = el.querySelector(".mini-cart-badge");
      if (badge) {
        badge.textContent = String(totalQty);
        badge.classList.add("bump");
        setTimeout(() => badge.classList.remove("bump"), 200);
      }

      const itemsContainer = el.querySelector(".mini-cart-items");
      if (itemsContainer) {
        if (items.length === 0) {
          const showEmptyCta = this.get("showEmptyCta");
          itemsContainer.innerHTML = `
            <div class="mini-cart-empty">
              <div class="mini-cart-empty-icon">ðŸ›’</div>
              <div class="mini-cart-empty-text">Votre panier est vide</div>
              ${showEmptyCta ? `<a href="/products" class="mini-cart-empty-cta">DÃ©couvrir nos produits</a>` : ""}
            </div>`;
        } else {
          const showImg = this.get("showProductImage");
          const showQty = this.get("showQuantityControls");
          const showRemove = this.get("showRemoveButton");
          itemsContainer.innerHTML = items
            .map(
              (item) => `
              <div class="mini-cart-item" data-item-id="${item._id || item.id || ""}" data-qty="${item.quantity || 1}">
                ${showImg ? `<img src="${item.thumbnail || placeholderImage}" alt="${item.name || "Product"}" />` : ""}
                <div class="mini-cart-item-info">
                  <div class="mini-cart-item-name">${item.name || "Produit"}</div>
                  ${item.variantInfo ? `<div class="mini-cart-item-variant">${item.variantInfo}</div>` : ""}
                  <div class="mini-cart-item-price">â‚¬${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                  ${showQty ? `
                    <div class="mini-cart-item-controls">
                      <Button class="mini-cart-qty-btn" data-delta="-1" type="button" selectable="false" hoverable="false" editable="false">âˆ’</Button>
                      <span class="mini-cart-qty">${item.quantity || 1}</span>
                      <Button class="mini-cart-qty-btn" data-delta="1" type="button" selectable="false" hoverable="false" editable="false">+</Button>
                    </div>
                  ` : `<div style="font-size:13px;color:#6b7280;">QtÃ©: ${item.quantity || 1}</div>`}
                  ${showRemove ? `<Button class="mini-cart-item-remove" type="button" selectable="false" hoverable="false" editable="false">Supprimer</Button>` : ""}
                </div>
              </div>
            `
            )
            .join("");
        }
      }

      const subtotalEl = el.querySelector(".mini-cart-subtotal");
      if (subtotalEl) subtotalEl.textContent = `â‚¬${subtotal.toFixed(2)}`;

      const shippingEl = el.querySelector(".mini-cart-shipping");
      if (shippingEl) shippingEl.textContent = shipping > 0 ? `â‚¬${shipping.toFixed(2)}` : "CalculÃ© Ã  la prochaine Ã©tape";

      const totalEl = el.querySelector(".mini-cart-total");
      if (totalEl) totalEl.textContent = `â‚¬${total.toFixed(2)}`;

      const checkoutLink = el.querySelector(".mini-cart-checkout");
      if (checkoutLink) checkoutLink.setAttribute("href", this.get("checkoutUrl") || "/checkout");
    },
  },

  view: {
    onRender() {
      this.updateCartUI();
    },

    updateCartUI() {
      const model = this.model;
      const cart = model.get("cartData");
      if (!this.el) return;
      const el = this.el;
      const items = cart?.items || [];
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shipping = items.length > 0 ? (cart.shipping || 0) : 0;
      const total = subtotal + shipping;

      const badge = el.querySelector(".mini-cart-badge");
      if (badge) {
        badge.textContent = String(totalQty);
        badge.classList.add("bump");
        setTimeout(() => badge.classList.remove("bump"), 200);
      }

      const itemsContainer = el.querySelector(".mini-cart-items");
      if (itemsContainer) {
        if (items.length === 0) {
          const showEmptyCta = model.get("showEmptyCta");
          itemsContainer.innerHTML = `
            <div class="mini-cart-empty">
              <div class="mini-cart-empty-icon">ðŸ›’</div>
              <div class="mini-cart-empty-text">Votre panier est vide</div>
              ${showEmptyCta ? `<a href="/products" class="mini-cart-empty-cta">DÃ©couvrir nos produits</a>` : ""}
            </div>`;
        } else {
          const showImg = model.get("showProductImage");
          const showQty = model.get("showQuantityControls");
          const showRemove = model.get("showRemoveButton");
          itemsContainer.innerHTML = items
            .map(
              (item) => `
              <div class="mini-cart-item" data-item-id="${item._id || item.id || ""}" data-qty="${item.quantity || 1}">
                ${showImg ? `<img src="${item.thumbnail || placeholderImage}" alt="${item.name || "Product"}" />` : ""}
                <div class="mini-cart-item-info">
                  <div class="mini-cart-item-name">${item.name || "Produit"}</div>
                  ${item.variantInfo ? `<div class="mini-cart-item-variant">${item.variantInfo}</div>` : ""}
                  <div class="mini-cart-item-price">â‚¬${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                  ${showQty ? `
                    <div class="mini-cart-item-controls">
                      <Button class="mini-cart-qty-btn" data-delta="-1" type="button" selectable="false" hoverable="false" editable="false">âˆ’</Button>
                      <span class="mini-cart-qty">${item.quantity || 1}</span>
                      <Button class="mini-cart-qty-btn" data-delta="1" type="button" selectable="false" hoverable="false" editable="false">+</Button>
                    </div>
                  ` : `<div style="font-size:13px;color:#6b7280;">QtÃ©: ${item.quantity || 1}</div>`}
                  ${showRemove ? `<Button class="mini-cart-item-remove" type="button" selectable="false" hoverable="false" editable="false">Supprimer</Button>` : ""}
                </div>
              </div>
            `
            )
            .join("");
        }
      }

      const subtotalEl = el.querySelector(".mini-cart-subtotal");
      if (subtotalEl) subtotalEl.textContent = `â‚¬${subtotal.toFixed(2)}`;

      const shippingEl = el.querySelector(".mini-cart-shipping");
      if (shippingEl) shippingEl.textContent = shipping > 0 ? `â‚¬${shipping.toFixed(2)}` : "CalculÃ© Ã  la prochaine Ã©tape";

      const totalEl = el.querySelector(".mini-cart-total");
      if (totalEl) totalEl.textContent = `â‚¬${total.toFixed(2)}`;

      const checkoutLink = el.querySelector(".mini-cart-checkout");
      if (checkoutLink) checkoutLink.setAttribute("href", model.get("checkoutUrl") || "/checkout");
    },
  },
};
