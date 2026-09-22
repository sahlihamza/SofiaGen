import WishlistService from "@/services/WishlistService";
import ProductServices from "@/services/ProductServices";
import CartServices from "@/services/CartServices";
import { Button } from "@sofia/ui";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='200' viewBox='0 0 250 200'%3E%3Crect fill='%23f3f4f6' width='250' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='12' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const WishlistPageBlock = {
  id: "wishlist-page-block",
  label: "â¤ï¸ Wishlist Page",
  category: "E-Commerce",
  content: {
    type: "wishlist-page-component",
  },
  attributes: { class: "fa fa-heart" },
};

export const WishlistPageComponent = {
  isComponent: (el) => el.classList && el.classList.contains("wishlist-page-component"),
  model: {
    defaults: {
      type: "wishlist-page-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "wishlist-page-component", "data-placeholder-content": "true" },
      styles: `
        .wishlist-page-component {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        .wishlist-product-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .wishlist-product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .wishlist-product-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        .wishlist-product-info {
          padding: 16px;
        }
        .wishlist-product-name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
          color: #111827;
        }
        .wishlist-product-price {
          font-size: 18px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 12px;
        }
        .wishlist-card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .wishlist-add-cart-btn {
          flex: 1;
          padding: 8px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        }
        .wishlist-add-cart-btn:hover {
          background: #059669;
        }
        .wishlist-remove-btn {
          padding: 8px;
          background: white;
          border: 1px solid #ef4444;
          color: #ef4444;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        .wishlist-remove-btn:hover {
          background: #fef2f2;
        }
        .wishlist-share-btn {
          padding: 8px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }
        .wishlist-empty {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
        }
        .wishlist-empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .wishlist-empty-text {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .wishlist-empty-cta {
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border-radius: 6px;
          font-weight: 600;
          text-decoration: none;
        }
        .wishlist-share-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #111827;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 99999;
          display: none;
          gap: 12px;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .wishlist-share-toast.visible {
          display: flex;
        }
        .wishlist-share-toast button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 13px;
          text-decoration: underline;
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
          name: "customerId",
          label: "Customer ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showAddToCart",
          label: "Afficher bouton panier",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showShareButton",
          label: "Afficher bouton partage",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "wishlist-empty", selectable: false, hoverable: false, editable: false }, content: "Votre liste de favoris est vide." },
        { tagName: "div", attributes: { class: "wishlist-share-toast", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "span", content: "Lien copiÃ© !", selectable: false, hoverable: false, editable: false },
          { tagName: "button", attributes: { class: "wishlist-share-toast-close", type: "button", selectable: false, hoverable: false, editable: false }, content: "Fermer" },
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:storeId change:customerId", this.loadWishlist);
      this.loadWishlist();

      if (typeof document !== "undefined") {
        this._wishlistHandler = (e) => {
          const btn = e.target.closest(".wishlist-remove-btn");
          if (btn) {
            const productId = btn.getAttribute("data-product-id");
            if (productId && this.removeFromWishlist) {
              this.removeFromWishlist(productId);
            }
            return;
          }
          const addBtn = e.target.closest(".wishlist-add-cart-btn");
          if (addBtn) {
            const productId = addBtn.getAttribute("data-product-id");
            const storeId = this.get("storeId");
            if (productId && storeId) {
              addBtn.textContent = "Ajout...";
              addBtn.disabled = true;
              CartServices.addItem({ productId, quantity: 1, storeId })
                .then(() => {
                  addBtn.textContent = "âœ“ AjoutÃ©";
                  setTimeout(() => { addBtn.textContent = "Ajouter au panier"; addBtn.disabled = false; }, 1500);
                })
                .catch(() => {
                  addBtn.textContent = "Ajouter au panier";
                  addBtn.disabled = false;
                });
            }
            return;
          }
          const shareBtn = e.target.closest(".wishlist-share-btn");
          if (shareBtn) {
            const productId = shareBtn.getAttribute("data-product-id");
            const url = `${window.location.origin}/wishlist?product=${productId}`;
            if (navigator.clipboard) {
              navigator.clipboard.writeText(url).then(() => this.showShareToast());
            }
            return;
          }
          const toastClose = e.target.closest(".wishlist-share-toast-close");
          if (toastClose) this.hideShareToast();
        };
        document.addEventListener("click", this._wishlistHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._wishlistHandler) {
        document.removeEventListener("click", this._wishlistHandler);
        this._wishlistHandler = null;
      }
      if (this._toastTimeout) clearTimeout(this._toastTimeout);
    },

    showShareToast() {
      const toast = this.view?.el?.querySelector(".wishlist-share-toast");
      if (toast) {
        toast.classList.add("visible");
        this._toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3000);
      }
    },

    hideShareToast() {
      const toast = this.view?.el?.querySelector(".wishlist-share-toast");
      if (toast) toast.classList.remove("visible");
      if (this._toastTimeout) clearTimeout(this._toastTimeout);
    },

    removeFromWishlist(productId) {
      const storeId = this.get("storeId");
      const customerId = this.get("customerId");
      if (!storeId || !customerId || !productId) return;
      WishlistService.removeFromWishlist({ storeId, customerId, productId })
        .then(() => this.loadWishlist())
        .catch((err) => console.error("Failed to remove from wishlist:", err));
    },

    loadWishlist() {
      const storeId = this.get("storeId");
      const customerId = this.get("customerId");
      if (!storeId || !customerId) return;
      WishlistService.getWishlist({ storeId, customerId })
        .then((response) => {
          const wishlist = response?.data || response;
          this.set("wishlistData", wishlist);
          this.renderWishlist();
        })
        .catch((err) => console.error("Failed to load wishlist:", err));
    },

    renderWishlist() {
      const wishlist = this.get("wishlistData");
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;
      const productIds = wishlist?.productIds || [];
      const showAddToCart = this.get("showAddToCart");
      const showShare = this.get("showShareButton");

      const emptyEl = el.querySelector(".wishlist-empty");
      if (productIds.length === 0) {
        if (emptyEl) emptyEl.style.display = "";
        const grid = el.querySelector(".wishlist-grid");
        if (grid) grid.innerHTML = "";
        return;
      }
      if (emptyEl) emptyEl.style.display = "none";

      const grid = el.querySelector(".wishlist-grid");
      if (!grid) return;

      const existingIds = new Set([...grid.querySelectorAll("[data-product-id]")].map((n) => n.dataset.productId));
      const toLoad = productIds.filter((pid) => !existingIds.has(pid));
      const toRemove = [...grid.querySelectorAll("[data-product-id]")].filter((n) => !productIds.includes(n.dataset.productId));

      toRemove.forEach((n) => n.remove());
      grid.innerHTML = "";

      productIds.forEach((pid) => {
        ProductServices.getProductById(pid)
          .then((response) => {
            const product = response?.data || response;
            if (!product) return;
            if (typeof document === "undefined") return;
            const card = document.createElement("div");
            card.className = "wishlist-product-card";
            card.setAttribute("data-product-id", pid);
            card.innerHTML = `
              <img src="${product.productGallery?.find((g) => g.isPrimary)?.image || product.productGallery?.[0]?.image || placeholderImage}" alt="${product.productName}" />
              <div class="wishlist-product-info">
                <div class="wishlist-product-name">${product.productName}</div>
                <div class="wishlist-product-price">â‚¬${(product.salePrice || product.regularPrice || 0).toFixed(2)}</div>
                <div class="wishlist-card-actions">
                  ${showAddToCart ? `<Button class="wishlist-add-cart-btn" data-product-id="${pid}">Ajouter au panier</Button>` : ""}
                  <Button class="wishlist-remove-btn" data-product-id="${pid}">Retirer</Button>
                  ${showShare ? `<Button class="wishlist-share-btn" data-product-id="${pid}">Partager</Button>` : ""}
                </div>
              </div>
            `;
            grid.appendChild(card);
          })
          .catch((err) => console.error("Failed to load wishlist product:", err));
      });
    },
  },

  view: {
    onRender() {
      this.renderWishlist();
    },
  },
};
