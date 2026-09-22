import ProductServices from "@/services/ProductServices";

export const ProductFilterBlock = {
  id: "product-filter-block",
  label: "= Filtre de produits",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "product-filter-component",
  },
  attributes: { class: "fa fa-filter" },
};

export const ProductFilterComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-filter-component"),
  model: {
    defaults: {
      type: "product-filter-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-filter-component" },
      styles: `
        .product-filter-component {
          width: 100%;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .product-filter-title {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 16px;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .product-filter-badge {
          background: #667eea;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          display: none;
        }
        .product-filter-badge.visible {
          display: inline-block;
        }
        .product-filter-group {
          margin-bottom: 16px;
        }
        .product-filter-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .product-filter-group input,
        .product-filter-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
          background: white;
          color: #374151;
        }
        .product-filter-stars {
          display: flex;
          gap: 4px;
          cursor: pointer;
        }
        .product-filter-star {
          font-size: 20px;
          color: #d1d5db;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          transition: color 0.15s;
        }
        .product-filter-star.active {
          color: #f59e0b;
        }
        .product-filter-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .product-filter-apply {
          flex: 1;
          padding: 10px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .product-filter-clear {
          padding: 10px 16px;
          background: white;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          display: none;
        }
        .product-filter-clear.visible {
          display: block;
        }
      `,
      traits: [
        {
          name: "storeId",
          label: "ID de la boutique",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "targetGridId",
          label: "ID de la grille cible",
          type: "text",
          default: "product-grid-items",
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "showCategories",
          label: "Afficher filtre catégories",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showRating",
          label: "Afficher filtre note",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showStockStatus",
          label: "Afficher filtre stock",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showClearButton",
          label: "Afficher bouton réinitialiser",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "product-filter-title", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "span", content: "Filtres", selectable: false, hoverable: false, editable: false },
          { tagName: "span", attributes: { class: "product-filter-badge", selectable: false, hoverable: false, editable: false }, content: "0" },
        ]},
        { tagName: "div", attributes: { class: "product-filter-group", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "label", content: "Catégorie", selectable: false, hoverable: false, editable: false },
          { tagName: "div", attributes: { class: "filter-categories-wrap", selectable: false, hoverable: false, editable: false }, content: "<select class='filter-category-select' selectable='false' hoverable='false' editable='false'><option value=''>Chargement...</option></select>" },
        ]},
        { tagName: "div", attributes: { class: "product-filter-group", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "label", content: "Prix min", selectable: false, hoverable: false, editable: false },
          { tagName: "input", attributes: { type: "number", placeholder: "0", class: "filter-price-min", selectable: false, hoverable: false, editable: false } },
        ]},
        { tagName: "div", attributes: { class: "product-filter-group", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "label", content: "Prix max", selectable: false, hoverable: false, editable: false },
          { tagName: "input", attributes: { type: "number", placeholder: "1000", class: "filter-price-max", selectable: false, hoverable: false, editable: false } },
        ]},
        { tagName: "div", attributes: { class: "product-filter-group filter-rating-group", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "label", content: "Note minimum", selectable: false, hoverable: false, editable: false },
          { tagName: "div", attributes: { class: "product-filter-stars", selectable: false, hoverable: false, editable: false }, components: [
            { tagName: "button", attributes: { class: "product-filter-star", type: "button", "data-rating": "1", selectable: false, hoverable: false, editable: false }, content: "" },
            { tagName: "button", attributes: { class: "product-filter-star", type: "button", "data-rating": "2", selectable: false, hoverable: false, editable: false }, content: "" },
            { tagName: "button", attributes: { class: "product-filter-star", type: "button", "data-rating": "3", selectable: false, hoverable: false, editable: false }, content: "" },
            { tagName: "button", attributes: { class: "product-filter-star", type: "button", "data-rating": "4", selectable: false, hoverable: false, editable: false }, content: "" },
            { tagName: "button", attributes: { class: "product-filter-star", type: "button", "data-rating": "5", selectable: false, hoverable: false, editable: false }, content: "" },
          ]},
          { tagName: "input", attributes: { type: "hidden", class: "filter-rating-input", value: "0", selectable: false, hoverable: false, editable: false } },
        ]},
        { tagName: "div", attributes: { class: "product-filter-group filter-stock-group", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "label", content: "Disponibilité", selectable: false, hoverable: false, editable: false },
          { tagName: "select", attributes: { class: "filter-stock-select", selectable: false, hoverable: false, editable: false }, components: [
            { tagName: "option", attributes: { value: "" }, content: "Tous", selectable: false, hoverable: false, editable: false },
            { tagName: "option", attributes: { value: "instock" }, content: "En stock", selectable: false, hoverable: false, editable: false },
            { tagName: "option", attributes: { value: "outofstock" }, content: "Rupture de stock", selectable: false, hoverable: false, editable: false },
          ]},
        ]},
        { tagName: "div", attributes: { class: "product-filter-actions", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "button", attributes: { class: "product-filter-apply", type: "button", selectable: false, hoverable: false, editable: false }, content: "Appliquer" },
          { tagName: "button", attributes: { class: "product-filter-clear", type: "button", selectable: false, hoverable: false, editable: false }, content: "Réinitialiser" },
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:storeId", this.populateCategories);
      this.on("change:showCategories change:showRating change:showStockStatus change:showClearButton", this.updateFilterVisibility);
      this.populateCategories();
    },

    onRemove() {
      if (typeof document !== "undefined") {
        this._applyHandler = null;
        this._clearHandler = null;
        this._starHandler = null;
        this._catHandler = null;
        this._stockHandler = null;
      }
    },

    populateCategories() {
      if (typeof document === "undefined" || !this.view) return;
      const storeId = this.get("storeId");
      if (!storeId) return;

      ProductServices.getAllProducts({ storeId, limit: 1 })
        .then((response) => {
          const container = this.view.el.querySelector(".filter-categories-wrap");
          if (!container) return;
          const products = response?.data?.products || response?.data || [];
          const cats = [...new Set(products.map((p) => p.productCategory?.name || p.category).filter(Boolean))];
          container.innerHTML = `
            <select class="filter-category-select" selectable="false" hoverable="false" editable="false">
              <option value="">Toutes les catégories</option>
              ${cats.map((c) => `<option value="${c}">${c}</option>`).join("")}
            </select>
          `;
          container.style.display = this.get("showCategories") ? "block" : "none";
        })
        .catch(() => {});
    },

    updateFilterVisibility() {
      if (typeof document === "undefined" || !this.view) return;
      const showCats = this.get("showCategories");
      const showRating = this.get("showRating");
      const showStock = this.get("showStockStatus");
      const showClear = this.get("showClearButton");

      const catsWrap = this.view.el.querySelector(".filter-categories-wrap");
      if (catsWrap) catsWrap.style.display = showCats ? "block" : "none";
      const ratingGroup = this.view.el.querySelector(".filter-rating-group");
      if (ratingGroup) ratingGroup.style.display = showRating ? "block" : "none";
      const stockGroup = this.view.el.querySelector(".filter-stock-group");
      if (stockGroup) stockGroup.style.display = showStock ? "block" : "none";
      const clearBtn = this.view.el.querySelector(".product-filter-clear");
      if (clearBtn) clearBtn.classList.toggle("visible", showClear);
    },

    getFilterState() {
      if (typeof document === "undefined" || !this.view) return {};
      const el = this.view.el;
      const minPrice = parseFloat(el.querySelector(".filter-price-min")?.value) || 0;
      const maxPrice = parseFloat(el.querySelector(".filter-price-max")?.value) || Infinity;
      const category = el.querySelector(".filter-category-select")?.value || "";
      const rating = parseInt(el.querySelector(".filter-rating-input")?.value || "0", 10);
      const stockStatus = el.querySelector(".filter-stock-select")?.value || "";
      const storeId = this.get("storeId");
      return { storeId, minPrice, maxPrice, category, rating, stockStatus };
    },

    countActiveFilters() {
      const state = this.getFilterState();
      let count = 0;
      if (state.minPrice > 0) count++;
      if (state.maxPrice < Infinity) count++;
      if (state.category) count++;
      if (state.rating > 0) count++;
      if (state.stockStatus) count++;
      return count;
    },

    updateBadge() {
      if (typeof document === "undefined" || !this.view) return;
      const count = this.countActiveFilters();
      const badge = this.view.el.querySelector(".product-filter-badge");
      if (badge) {
        badge.textContent = String(count);
        badge.classList.toggle("visible", count > 0);
      }
    },
  },

  view: {
    onRender() {
      if (typeof document === "undefined" || !this.el) return;
      const model = this.model;

      const catsWrap = this.el.querySelector(".filter-categories-wrap");
      if (catsWrap) catsWrap.style.display = model.get("showCategories") ? "block" : "none";
      const ratingGroup = this.el.querySelector(".filter-rating-group");
      if (ratingGroup) ratingGroup.style.display = model.get("showRating") ? "block" : "none";
      const stockGroup = this.el.querySelector(".filter-stock-group");
      if (stockGroup) stockGroup.style.display = model.get("showStockStatus") ? "block" : "none";
      const clearBtn = this.el.querySelector(".product-filter-clear");
      if (clearBtn) clearBtn.classList.toggle("visible", model.get("showClearButton"));

      const applyBtn = this.el.querySelector(".product-filter-apply");
      const clearBtnEl = this.el.querySelector(".product-filter-clear");
      const starBtns = this.el.querySelectorAll(".product-filter-star");
      const ratingInput = this.el.querySelector(".filter-rating-input");

      if (applyBtn) {
        applyBtn.onclick = () => {
          const state = model.getFilterState();
          state.targetId = model.get("targetGridId") || "product-grid-items";
          model.updateBadge();
          const event = new CustomEvent("product-filter:changed", {
            detail: state,
            bubbles: true,
          });
          this.el.dispatchEvent(event);
        };
      }

      if (clearBtnEl) {
        clearBtnEl.onclick = () => {
          const minInput = this.el.querySelector(".filter-price-min");
          const maxInput = this.el.querySelector(".filter-price-max");
          const catSelect = this.el.querySelector(".filter-category-select");
          const stockSelect = this.el.querySelector(".filter-stock-select");
          if (minInput) minInput.value = "";
          if (maxInput) maxInput.value = "";
          if (catSelect) catSelect.value = "";
          if (stockSelect) stockSelect.value = "";
          if (ratingInput) ratingInput.value = "0";
          starBtns.forEach((s) => s.classList.remove("active"));
          model.updateBadge();
          const state = model.getFilterState();
          state.targetId = model.get("targetGridId") || "product-grid-items";
          const event = new CustomEvent("product-filter:changed", {
            detail: state,
            bubbles: true,
          });
          this.el.dispatchEvent(event);
        };
      }

      starBtns.forEach((btn, idx) => {
        btn.onclick = () => {
          const current = parseInt(ratingInput?.value || "0", 10);
          const newRating = current === idx + 1 ? 0 : idx + 1;
          if (ratingInput) ratingInput.value = String(newRating);
          starBtns.forEach((s, i) => s.classList.toggle("active", i < newRating));
          model.updateBadge();
        };
      });
    },
  },
};
