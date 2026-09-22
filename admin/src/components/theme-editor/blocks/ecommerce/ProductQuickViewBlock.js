import ProductServices from "@/services/ProductServices";
import CartServices from "@/services/CartServices";
import { Button } from "@sofia/ui";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const ProductQuickViewBlock = {
  id: "product-quick-view-block",
  label: "ðŸ‘ï¸ AperÃ§u rapide",

  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "product-quick-view-component",
  },
  attributes: { class: "fa fa-eye" },
};

export const ProductQuickViewComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-quick-view-component"),
  model: {
    defaults: {
      type: "product-quick-view-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-quick-view-component" },
      styles: `
        .product-quick-view-component {
          display: inline-block;
        }
        .quick-view-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s;
        }
        .quick-view-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }
        .quick-view-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .quick-view-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }
        .quick-view-modal.open {
          display: flex;
        }
        .quick-view-modal.modal-loading .quick-view-content {
          opacity: 0.7;
          pointer-events: none;
        }
        .quick-view-content {
          background: white;
          border-radius: 12px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          gap: 40px;
          padding: 32px;
          position: relative;
        }
        .quick-view-image {
          flex: 1;
          max-width: 400px;
        }
        .quick-view-image img {
          width: 100%;
          border-radius: 8px;
        }
        .quick-view-details {
          flex: 1;
        }
        .quick-view-close {
          position: absolute;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          color: #6b7280;
          font-size: 28px;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
          z-index: 1;
        }
        .quick-view-close:hover {
          color: #111827;
        }
        .quick-view-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #111827;
        }
        .quick-view-price {
          font-size: 20px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 8px;
        }
        .quick-view-original-price {
          font-size: 16px;
          color: #9ca3af;
          text-decoration: line-through;
          margin-left: 8px;
        }
        .quick-view-sale-badge {
          display: inline-block;
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 700;
          margin-left: 8px;
          vertical-align: middle;
        }
        .quick-view-desc {
          font-size: 14px;
          line-height: 1.6;
          color: #6b7280;
          margin-bottom: 20px;
        }
        .quick-view-stock {
          font-size: 13px;
          margin-bottom: 12px;
        }
        .quick-view-stock.in-stock {
          color: #10b981;
        }
        .quick-view-stock.out-of-stock {
          color: #ef4444;
        }
        .quick-view-add-btn {
          padding: 12px 24px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .quick-view-add-btn:hover {
          background: #059669;
        }
        .quick-view-add-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .quick-view-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6b7280;
          gap: 12px;
        }
        .qv-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: qv-spin 0.8s linear infinite;
        }
        @keyframes qv-spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .quick-view-content {
            flex-direction: column;
            gap: 20px;
            padding: 20px;
          }
          .quick-view-image {
            max-width: 100%;
          }
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
          name: "label",
          label: "Label",
          type: "text",
          default: "AperÃ§u rapide",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "button", attributes: { class: "quick-view-btn", type: "button", selectable: false, hoverable: false, editable: false }, content: "AperÃ§u rapide" },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:storeId change:label", this.updateButton);
      this._prevBodyOverflow = null;
      if (typeof document !== "undefined") {
        this._qvHandler = (e) => {
          const btn = e.target.closest(".quick-view-btn");
          if (!btn) return;
          this.openQuickView();
        };
        document.addEventListener("click", this._qvHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._qvHandler) {
        document.removeEventListener("click", this._qvHandler);
        this._qvHandler = null;
      }
      this.closeQuickView();
      if (typeof document !== "undefined") {
        const modal = document.getElementById("quick-view-modal-root");
        if (modal) modal.remove();
      }
    },

    updateButton() {
      const label = this.get("label") || "AperÃ§u rapide";
      if (this.view) {
        const btn = this.view.el?.querySelector(".quick-view-btn");
        if (btn) btn.textContent = label;
      }
    },

    openQuickView() {
      const productId = this.get("productId");
      const storeId = this.get("storeId");
      if (!productId || !storeId) return;

      const modal = this.getOrCreateModal();
      if (!modal) return;
      modal.classList.add("modal-loading");
      modal.querySelector(".quick-view-content").innerHTML = `
        <div class="quick-view-loading" style="flex:1;display:flex;align-items:center;justify-content:center;">
          <div class="qv-spinner"></div>
          <span>Chargement...</span>
        </div>
      `;
      modal.classList.add("open");
      this._prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      this._escapeHandler = (e) => {
        if (e.key === "Escape") this.closeQuickView();
      };
      document.addEventListener("keydown", this._escapeHandler);

      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (!product) {
            modal.querySelector(".quick-view-content").innerHTML = `<div class="quick-view-loading">Produit non trouvÃ©</div>`;
            modal.classList.remove("modal-loading");
            return;
          }
          this.set("quickViewProduct", product);
          this.renderQuickViewModal();
        })
        .catch((err) => {
          console.error("Failed to load quick view:", err);
          modal.querySelector(".quick-view-content").innerHTML = `<div class="quick-view-loading">Erreur lors du chargement</div>`;
          modal.classList.remove("modal-loading");
        });
    },

    closeQuickView() {
      if (typeof document === "undefined") return;
      const modal = document.getElementById("quick-view-modal-root");
      if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("modal-loading");
      }
      if (this._prevBodyOverflow !== null) {
        document.body.style.overflow = this._prevBodyOverflow;
        this._prevBodyOverflow = null;
      }
      if (this._escapeHandler) {
        document.removeEventListener("keydown", this._escapeHandler);
        this._escapeHandler = null;
      }
    },

    getOrCreateModal() {
      if (typeof document === "undefined") return null;
      let modal = document.getElementById("quick-view-modal-root");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "quick-view-modal-root";
        document.body.appendChild(modal);
        modal.addEventListener("click", (e) => {
          if (e.target.id === "quick-view-modal-root") this.closeQuickView();
        });
      }
      return modal;
    },

    renderQuickViewModal() {
      const product = this.get("quickViewProduct");
      if (!product || typeof document === "undefined") return;
      const modal = document.getElementById("quick-view-modal-root");
      if (!modal) return;

      modal.classList.remove("modal-loading");
      const primaryImg = product.productGallery?.find((g) => g.isPrimary)?.image || product.productGallery?.[0]?.image || product.thumbnail || product.productImage || placeholderImage;
      const price = product.salePrice || product.regularPrice || product.price || 0;
      const regularPrice = product.regularPrice || product.price || 0;
      const hasSale = product.salePrice != null && product.salePrice < regularPrice;
      const discountPercent = hasSale && regularPrice > 0 ? Math.round(((regularPrice - product.salePrice) / regularPrice) * 100) : 0;
      const inStock = product.stockStatus === "instock" || product.stockStatus === "onbackorder";
      const stockLabels = { instock: "En stock", outofstock: "Rupture de stock", onbackorder: "Sur commande" };

      modal.innerHTML = `
        <div class="quick-view-modal open" id="qv-modal">
          <Button class="quick-view-close" id="qv-close" aria-label="Fermer">&times;</Button>
          <div class="quick-view-content">
            <div class="quick-view-image">
              <img src="${primaryImg}" alt="${product.productName || "Produit"}" />
            </div>
            <div class="quick-view-details">
              <h2 class="quick-view-title">${product.productName || "Produit"}</h2>
              <div class="quick-view-price">
                â‚¬${price.toFixed(2)}
                ${hasSale ? `<span class="quick-view-original-price">â‚¬${regularPrice.toFixed(2)}</span><span class="quick-view-sale-badge">-${discountPercent}%</span>` : ""}
              </div>
              <p class="quick-view-desc">${product.shortDescription || product.description || ""}</p>
              <div class="quick-view-stock ${inStock ? "in-stock" : "out-of-stock"}">
                ${inStock ? "âœ“ " + (stockLabels[product.stockStatus] || "En stock") : "âœ— " + (stockLabels[product.stockStatus] || "Rupture de stock")}

                ${product.stockQuantity != null ? ` (${product.stockQuantity} restant${product.stockQuantity > 1 ? "s" : ""})` : ""}
              </div>
              <Button class="quick-view-add-btn" data-product-id="${product._id || product.id}" ${!inStock ? "disabled" : ""} type="button">${inStock ? "Ajouter au panier" : "Rupture de stock"}</Button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("qv-close")?.addEventListener("click", () => this.closeQuickView());

      const addBtn = modal.querySelector(".quick-view-add-btn");
      if (addBtn && inStock) {
        addBtn.addEventListener("click", () => {
          const pid = addBtn.dataset.productId;
          const storeId = this.get("storeId");
          if (!pid) return;
          addBtn.textContent = "Ajout...";
          addBtn.disabled = true;
          CartServices.addItem({ productId: pid, quantity: 1, storeId })
            .then(() => {
              addBtn.textContent = "âœ“ AjoutÃ© !";

              setTimeout(() => {
                addBtn.textContent = "Ajouter au panier";
                addBtn.disabled = false;
              }, 2000);
            })
            .catch(() => {
              addBtn.textContent = "Ajouter au panier";
              addBtn.disabled = false;
            });
        });
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:quickViewProduct", (m) => {
        const product = m.get("quickViewProduct");
        if (product) m.renderQuickViewModal();
      });
    },

    onRender() {
      const model = this.model;
      const label = model.get("label") || "AperÃ§u rapide";
      const btn = this.el?.querySelector(".quick-view-btn");
      if (btn) btn.textContent = label;
    },
  },
};
