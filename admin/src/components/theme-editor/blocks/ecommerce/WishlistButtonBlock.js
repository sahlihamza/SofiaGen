import WishlistService from "@/services/WishlistService";

export const WishlistButtonBlock = {
  id: "wishlist-button-block",
  label: "d Wishlist Button",
  category: "E-Commerce",
  content: {
    type: "wishlist-button-component",
  },
  attributes: { class: "fa fa-heart" },
};

export const WishlistButtonComponent = {
  isComponent: (el) => el.classList && el.classList.contains("wishlist-button-component"),
  model: {
    defaults: {
      type: "wishlist-button-component",
      tagName: "button",
      draggable: true,
      droppable: false,
      attributes: { class: "wishlist-button-component", type: "button", "data-product-id": "", title: "Ajouter aux favoris" },
      styles: `
        .wishlist-button-component {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s;
          position: relative;
        }
        .wishlist-button-component:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .wishlist-button-component.in-wishlist {
          background: #fef2f2;
          border-color: #ef4444;
          color: #ef4444;
        }
        .wishlist-button-component.adding {
          animation: wishlist-pulse 0.4s ease;
        }
        @keyframes wishlist-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .wishlist-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: #111827;
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .wishlist-button-component:hover .wishlist-tooltip {
          opacity: 1;
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
          name: "storeId",
          label: "Store ID",
          type: "text",
          changeProp: 1,
          category: "content",
        },
        {
          name: "customerId",
          label: "Customer ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "label",
          label: "Label",
          type: "text",
          default: "Ajouter aux favoris",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "activeLabel",
          label: "Label actif",
          type: "text",
          default: "Retirer des favoris",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showTooltip",
          label: "Afficher infobulle",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      content: "d Ajouter aux favoris",
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:storeId change:customerId", this.checkWishlist);
      this.on("change:label change:activeLabel", this.updateButton);
      this.checkWishlist();

      if (typeof document !== "undefined") {
        this._wishlistBtnHandler = (e) => {
          const btn = e.target.closest(".wishlist-button-component");
          if (!btn) return;
          const model = btn.__gjsModel || this.model;
          if (!model) return;
          const pid = model.get("productId");
          const sid = model.get("storeId");
          const cid = model.get("customerId");
          if (!pid || !sid || !cid) return;
          btn.classList.add("adding");
          setTimeout(() => btn.classList.remove("adding"), 400);
          WishlistService.toggleWishlist({ storeId: sid, customerId: cid, productId: pid })
            .then((response) => {
              const wishlist = response?.data || response;
              const added = response?.added;
              const nowInList = added ?? !model.get("inWishlist");
              model.set("inWishlist", nowInList);
              model.updateButton && model.updateButton();
            })
            .catch((err) => console.error("Failed to toggle wishlist:", err));
        };
        document.addEventListener("click", this._wishlistBtnHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._wishlistBtnHandler) {
        document.removeEventListener("click", this._wishlistBtnHandler);
        this._wishlistBtnHandler = null;
      }
    },

    checkWishlist() {
      const productId = this.get("productId");
      const storeId = this.get("storeId");
      const customerId = this.get("customerId");
      if (!productId || !storeId || !customerId) return;
      WishlistService.getWishlist({ storeId, customerId })
        .then((response) => {
          const wishlist = response?.data || response;
          const inList = wishlist?.productIds?.includes(productId);
          this.set("inWishlist", inList);
          this.updateButton();
        })
        .catch((err) => console.error("Failed to check wishlist:", err));
    },

    updateButton() {
      const inList = this.get("inWishlist");
      const label = this.get(inList ? "activeLabel" : "label") || (inList ? "Retirer des favoris" : "Ajouter aux favoris");
      const showTooltip = this.get("showTooltip");
      if (this.view) {
        const el = this.view.el;
        if (el) {
          const textNode = el.childNodes[el.childNodes.length - 1];
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = " " + label;
          } else {
            el.childNodes.forEach((n) => {
              if (n.nodeType === Node.TEXT_NODE) n.textContent = " " + label;
            });
          }
          if (inList) el.classList.add("in-wishlist");
          else el.classList.remove("in-wishlist");
          if (showTooltip) {
            el.setAttribute("title", label);
            let tooltip = el.querySelector(".wishlist-tooltip");
            if (!tooltip) {
              tooltip = document.createElement("span");
              tooltip.className = "wishlist-tooltip";
              el.appendChild(tooltip);
            }
            tooltip.textContent = label;
          } else {
            el.removeAttribute("title");
            const tooltip = el.querySelector(".wishlist-tooltip");
            if (tooltip) tooltip.remove();
          }
        }
      }
    },
  },

  view: {
    onRender() {
      const model = this.model;
      const productId = model.get("productId");
      const storeId = model.get("storeId");
      const customerId = model.get("customerId");
      if (!productId || !storeId || !customerId) return;

      WishlistService.getWishlist({ storeId, customerId })
        .then((response) => {
          const wishlist = response?.data || response;
          const inList = wishlist?.productIds?.includes(productId);
          model.set("inWishlist", inList);
          if (this.el) {
            this.el.__gjsModel = model;
            const label = model.get(inList ? "activeLabel" : "label") || (inList ? "Retirer des favoris" : "Ajouter aux favoris");
            const textNode = this.el.childNodes[this.el.childNodes.length - 1];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              textNode.textContent = " " + label;
            }
            if (inList) this.el.classList.add("in-wishlist");
            else this.el.classList.remove("in-wishlist");
            const showTooltip = model.get("showTooltip");
            this.el.setAttribute("title", showTooltip ? label : "");
            let tooltip = this.el.querySelector(".wishlist-tooltip");
            if (!tooltip && showTooltip) {
              tooltip = document.createElement("span");
              tooltip.className = "wishlist-tooltip";
              this.el.appendChild(tooltip);
            }
            if (tooltip) tooltip.textContent = label;
          }
        })
        .catch((err) => console.error("Failed to check wishlist on render:", err));
    },
  },
};
