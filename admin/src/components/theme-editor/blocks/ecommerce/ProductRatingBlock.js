import ProductServices from "@/services/ProductServices";

export const ProductRatingBlock = {
  id: "product-rating-block",
  label: "P Product Rating",
  category: "E-Commerce",
  content: {
    type: "product-rating-component",
  },
  attributes: { class: "fa fa-star" },
};

export const ProductRatingComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-rating-component"),
  model: {
    defaults: {
      type: "product-rating-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-rating-component", "data-placeholder-content": "true" },
      styles: `
        .product-rating-component {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .product-rating-stars {
          color: #f59e0b;
          font-size: 18px;
          letter-spacing: 2px;
          cursor: default;
        }
        .product-rating-stars.clickable {
          cursor: pointer;
        }
        .product-rating-count {
          font-size: 14px;
          color: #6b7280;
        }
        .product-rating-neutral {
          font-size: 14px;
          color: #9ca3af;
          font-style: italic;
        }
        .product-rating-link {
          text-decoration: none;
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
          name: "showCount",
          label: "Afficher le nombre d'avis",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
        },
        {
          name: "showStockStatus",
          label: "Afficher le statut stock",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "clickableStars",
          label: "étoiles cliquables",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "product-rating-stars", selectable: false, hoverable: false, editable: false }, content: "" },
        { tagName: "span", attributes: { class: "product-rating-count", selectable: false, hoverable: false, editable: false }, content: "" },
        { tagName: "span", attributes: { class: "product-rating-neutral", selectable: false, hoverable: false, editable: false }, content: "Aucun avis pour le moment" },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:showCount change:showStockStatus change:clickableStars", this.updateRating);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updateRating();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateRating();
          }
        })
        .catch((err) => {
          console.error("Failed to load product rating:", err);
          this.set("productData", null);
          this.updateRating();
        });
    },

    updateRating() {
      const product = this.get("productData");
      const showCount = this.get("showCount");
      const showStock = this.get("showStockStatus");
      const clickable = this.get("clickableStars");

      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;

      const starsEl = el.querySelector(".product-rating-stars");
      const countEl = el.querySelector(".product-rating-count");
      const neutralEl = el.querySelector(".product-rating-neutral");

      if (product.enableReviews && product.averageRating != null) {
        const rating = Number(product.averageRating) || 0;
        const fullStars = Math.floor(rating);
        const halfStar = rating - fullStars >= 0.5;
        let stars = "";
        for (let i = 0; i < 5; i++) {
          if (i < fullStars) stars += "";
          else if (i === fullStars && halfStar) stars += "";
          else stars += "";
        }
        if (starsEl) {
          starsEl.textContent = stars;
          starsEl.style.display = "";
          starsEl.classList.toggle("clickable", clickable);
        }
        if (neutralEl) neutralEl.style.display = "none";
        if (countEl && showCount) {
          countEl.textContent = `(${product.reviewCount || 0} avis)`;
          countEl.style.display = "";
        } else if (countEl) {
          countEl.style.display = "none";
        }
      } else {
        if (starsEl) { starsEl.style.display = "none"; starsEl.classList.remove("clickable"); }
        if (countEl) countEl.style.display = "none";
        if (neutralEl) {
          if (showStock && product.stockStatus) {
            const stockLabels = { instock: "En stock", outofstock: "Rupture de stock", onbackorder: "Sur commande" };
            neutralEl.textContent = stockLabels[product.stockStatus] || product.stockStatus;
          } else {
            neutralEl.textContent = "Aucun avis pour le moment";
          }
          neutralEl.style.display = "";
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

      const starsEl = this.el.querySelector(".product-rating-stars");
      const countEl = this.el.querySelector(".product-rating-count");
      const neutralEl = this.el.querySelector(".product-rating-neutral");
      const showCount = model.get("showCount");
      const showStock = model.get("showStockStatus");
      const clickable = model.get("clickableStars");

      if (product.enableReviews && product.averageRating != null) {
        const rating = Number(product.averageRating) || 0;
        const fullStars = Math.floor(rating);
        const halfStar = rating - fullStars >= 0.5;
        let stars = "";
        for (let i = 0; i < 5; i++) {
          if (i < fullStars) stars += "";
          else if (i === fullStars && halfStar) stars += "";
          else stars += "";
        }
        if (starsEl) {
          starsEl.textContent = stars;
          starsEl.style.display = "";
          starsEl.classList.toggle("clickable", clickable);
        }
        if (neutralEl) neutralEl.style.display = "none";
        if (countEl && showCount) {
          countEl.textContent = `(${product.reviewCount || 0} avis)`;
          countEl.style.display = "";
        } else if (countEl) {
          countEl.style.display = "none";
        }
      } else {
        if (starsEl) { starsEl.style.display = "none"; starsEl.classList.remove("clickable"); }
        if (countEl) countEl.style.display = "none";
        if (neutralEl) {
          if (showStock && product.stockStatus) {
            const stockLabels = { instock: "En stock", outofstock: "Rupture de stock", onbackorder: "Sur commande" };
            neutralEl.textContent = stockLabels[product.stockStatus] || product.stockStatus;
          } else {
            neutralEl.textContent = "Aucun avis pour le moment";
          }
          neutralEl.style.display = "";
        }
      }
    },
  },
};
