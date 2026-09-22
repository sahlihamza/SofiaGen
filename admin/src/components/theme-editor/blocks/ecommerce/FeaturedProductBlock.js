import ProductServices from "@/services/ProductServices";
import { colorTraits, spacingTraits, borderTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle } from "../../traits/utils/applyCommonStyles";
import { Button } from "@sofia/ui";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const FeaturedProductBlock = {
  id: "featured-product-block",
  label: "â­ Produit en vedette",
  category: "E-Commerce",
  content: {
    type: "featured-product-component",
  },
  attributes: { class: "fa fa-star" },
};

export const FeaturedProductComponent = {
  isComponent: (el) => el.classList && el.classList.contains("featured-product"),
  model: {
    defaults: {
      type: "featured-product-component",
      tagName: "section",
      attributes: { class: "featured-product" },
      styles: `
        .featured-product {
          padding: 80px 20px;
          background-color: #f9fafb;
        }
        .fp-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 60px;
        }
        .fp-container.layout-carousel {
          flex-wrap: nowrap;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          gap: 24px;
          -ms-overflow-style: none;
          scrollbar-width: none;
          padding-bottom: 16px;
        }
        .fp-container.layout-carousel::-webkit-scrollbar { display: none; }
        .fp-card {
          flex: 0 0 280px;
          scroll-snap-align: start;
          background: white;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .fp-image-wrap {
          flex: 1;
        }
        .fp-image {
          width: 100%;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .fp-content {
          flex: 1;
        }
        .fp-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 15px;
        }
        .fp-sale-badge {
          display: inline-block;
          background: #ef4444;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .fp-title {
          font-size: 42px;
          color: #111827;
          margin: 0 0 20px 0;
          line-height: 1.2;
        }
        .fp-price {
          font-size: 28px;
          color: #10b981;
          font-weight: bold;
          margin: 0 0 8px 0;
        }
        .fp-original-price {
          font-size: 18px;
          color: #9ca3af;
          text-decoration: line-through;
          margin-left: 12px;
        }
        .fp-discount {
          display: inline-block;
          background: #fef2f2;
          color: #ef4444;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 700;
          margin-left: 8px;
        }
        .fp-desc {
          font-size: 16px;
          color: #4b5563;
          line-height: 1.6;
          margin: 0 0 30px 0;
        }
        .fp-actions {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        .fp-btn-primary {
          padding: 15px 30px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        }
        .fp-btn-primary:hover {
          background: #374151;
        }
        .fp-btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .fp-btn-secondary {
          padding: 15px 30px;
          background: transparent;
          color: #111827;
          border: 2px solid #111827;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }
        .fp-btn-secondary:hover {
          background: #111827;
          color: white;
        }
        .fp-loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        .fp-error {
          text-align: center;
          padding: 40px;
          color: #ef4444;
        }
        @media (max-width: 768px) {
          .fp-container {
            flex-direction: column;
            gap: 40px;
          }
          .fp-title { font-size: 28px; }
          .fp-price { font-size: 22px; }
        }
      `,
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
          name: "layout",
          label: "Mise en page",
          type: "select",
          default: "static",
          options: [
            { value: "static", label: "Statique (produit unique)" },
            { value: "carousel", label: "Carrousel (plusieurs produits)" },
          ],
          changeProp: 1,
          category: "content",
          section: "Mise en page",
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
          name: "showSaleBadge",
          label: "Afficher badge promo",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        ...colorTraits({ prefix: "featuredProduct", fields: ["background"], defaults: { background: "#f9fafb" }, section: "ArriÃ¨re-plan" }),
        ...spacingTraits({ prefix: "featuredProduct", defaults: { padding: 80 }, section: "Espacement" }),
        ...borderTraits({ prefix: "featuredProduct", defaults: { width: 0, color: "#e5e7eb", radius: 12 }, section: "Bordure" }),
        ...typographyTraits({ prefix: "featuredProduct", defaults: { size: 16, weight: "500" }, section: "Typographie" }),
      ],
      components: [
        {
          tagName: "div",
          attributes: { class: "fp-container", selectable: false, hoverable: false, editable: false },
          components: [
            {
              tagName: "div",
              attributes: { class: "fp-image-wrap", selectable: false, hoverable: false, editable: false },
              components: [
                { tagName: "img", attributes: { src: placeholderImage, class: "fp-image", selectable: false, hoverable: false, editable: false } }
              ]
            },
            {
              tagName: "div",
              attributes: { class: "fp-content", selectable: false, hoverable: false, editable: false },
              components: [
                { tagName: "span", attributes: { class: "fp-badge", selectable: false, hoverable: false, editable: false }, content: "Meilleure vente" },
                { tagName: "h2", attributes: { class: "fp-title", selectable: false, hoverable: false, editable: false }, content: "Chargement..." },
                { tagName: "div", attributes: { class: "fp-price", selectable: false, hoverable: false, editable: false }, content: "â€”" },
                { tagName: "p", attributes: { class: "fp-desc", selectable: false, hoverable: false, editable: false }, content: "Chargement..." },
                {
                  tagName: "div",
                  attributes: { class: "fp-actions", selectable: false, hoverable: false, editable: false },
                  components: [
                    { tagName: "button", attributes: { class: "fp-btn-primary", type: "button", selectable: false, hoverable: false, editable: false }, content: "Ajouter au panier" },
                    { tagName: "button", attributes: { class: "fp-btn-secondary", type: "button", selectable: false, hoverable: false, editable: false }, content: "Voir les dÃ©tails" }
                  ]
                }
              ]
            }
          ]
        }
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:layout change:showAddToCart change:showSaleBadge change:featuredProductBackgroundColor change:featuredProductPadding change:featuredProductBorderRadius change:featuredProductFontSize change:featuredProductFontWeight", this.updateContent);
      this.loadProduct();
    },

    onRemove() {
      this._productPromise = null;
    },

    updateContent() {
      applyColorStyle(this.view?.el, this, { prefix: "featuredProduct", selector: ".featured-product", fields: ["background"] });
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      const layout = this.get("layout") || "static";

      if (!productId && layout === "static") {
        if (this.view) this.renderPlaceholder();
        return;
      }

      if (!this.view) return;
      const containerEl = this.view.el.querySelector(".fp-container");
      const contentEl = this.view.el.querySelector(".fp-content");
      const loadingEl = this.view.el.querySelector(".fp-loading");
      const errorEl = this.view.el.querySelector(".fp-error");

      if (loadingEl) loadingEl.style.display = "none";
      if (errorEl) errorEl.style.display = "none";

      if (layout === "carousel") {
        this.loadCarouselProducts();
        return;
      }

      if (!productId) return;

      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (!product) throw new Error("Product not found");
          this.set("productData", product);
          this.renderFeaturedProduct(product);
        })
        .catch((err) => {
          console.error("Failed to load featured product:", err);
          if (this.view) this.renderPlaceholder();
        });
    },

    loadCarouselProducts() {
      const storeId = this.get("storeId");
      ProductServices.getAllProducts({ storeId, limit: 8, sortBy: "popular" })
        .then((response) => {
          const products = response?.data?.products || response?.data || [];
          this.set("products", products);
          this.renderCarousel(products);
        })
        .catch((err) => {
          console.error("Failed to load carousel products:", err);
          if (this.view) this.renderPlaceholder();
        });
    },

    renderFeaturedProduct(product) {
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;
      const layout = this.get("layout") || "static";
      const containerEl = el.querySelector(".fp-container");

      if (layout === "carousel") {
        containerEl?.classList.add("layout-carousel");
      } else {
        containerEl?.classList.remove("layout-carousel");
      }

      const showSaleBadge = this.get("showSaleBadge");
      const hasSale = product.salePrice != null && product.salePrice < (product.regularPrice || product.price || 0);
      const displayPrice = hasSale ? product.salePrice : (product.regularPrice || product.price || 0);
      const originalPrice = hasSale ? (product.regularPrice || product.price || 0) : null;
      const discountPercent = hasSale && originalPrice > 0 ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100) : 0;
      const inStock = product.stockStatus === "instock" || product.stockStatus === "onbackorder";
      const showAddToCart = this.get("showAddToCart");

      if (containerEl) {
        containerEl.innerHTML = `
          <div class="fp-image-wrap">
            <img class="fp-image" src="${product.productGallery?.find(g => g.isPrimary)?.image || product.productGallery?.[0]?.image || product.thumbnail || product.productImage || placeholderImage}" alt="${product.productName}" />
          </div>
          <div class="fp-content">
            ${showSaleBadge && hasSale ? `<span class="fp-sale-badge">-${discountPercent}%</span>` : "<span class='fp-badge'>Meilleure vente</span>"}
            <h2 class="fp-title">${product.productName || "Produit en vedette"}</h2>
            <div class="fp-price">
              â‚¬${displayPrice.toFixed(2)}
              ${originalPrice ? `<span class="fp-original-price">â‚¬${originalPrice.toFixed(2)}</span>` : ""}
              ${showSaleBadge && hasSale ? `<span class="fp-discount">-${discountPercent}%</span>` : ""}
            </div>
            <p class="fp-desc">${product.shortDescription || product.description || "DÃ©couvrez ce produit exceptionnel."}</p>
            <div class="fp-actions">
              ${showAddToCart ? `<Button class="fp-btn-primary" type="button" data-product-id="${product._id || product.id}" ${!inStock ? "disabled" : ""} selectable="false" hoverable="false" editable="false">${inStock ? "Ajouter au panier" : "Rupture de stock"}</Button>` : ""}
              <Button class="fp-btn-secondary" type="button" selectable="false" hoverable="false" editable="false">Voir les dÃ©tails</Button>

            </div>
          </div>
        `;
      }
    },

    renderCarousel(products) {
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;
      const containerEl = el.querySelector(".fp-container");
      if (!containerEl) return;
      containerEl.classList.add("layout-carousel");

      const showSaleBadge = this.get("showSaleBadge");
      const showAddToCart = this.get("showAddToCart");

      containerEl.innerHTML = products
        .map((product) => {
          const hasSale = product.salePrice != null && product.salePrice < (product.regularPrice || product.price || 0);
          const displayPrice = hasSale ? product.salePrice : (product.regularPrice || product.price || 0);
          const originalPrice = hasSale ? (product.regularPrice || product.price || 0) : null;
          const discountPercent = hasSale && originalPrice > 0 ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100) : 0;
          const inStock = product.stockStatus === "instock" || product.stockStatus === "onbackorder";
          return `
            <div class="fp-card" data-product-id="${product._id || product.id || ""}">
              <img class="fp-image" src="${product.productGallery?.find(g => g.isPrimary)?.image || product.productGallery?.[0]?.image || product.thumbnail || product.productImage || placeholderImage}" alt="${product.productName || "Produit"}" style="border-radius:8px;width:100%;height:180px;object-fit:cover;" />
              ${showSaleBadge && hasSale ? `<span class="fp-sale-badge">-${discountPercent}%</span>` : ""}
              <h3 style="font-size:16px;margin:8px 0 4px;color:#111827;">${product.productName || "Produit"}</h3>
              <div style="font-size:16px;font-weight:700;color:#10b981;">
                â‚¬${displayPrice.toFixed(2)}
                ${originalPrice ? `<span style="font-size:13px;color:#9ca3af;text-decoration:line-through;margin-left:6px;">â‚¬${originalPrice.toFixed(2)}</span>` : ""}

              </div>
              ${showAddToCart ? `<Button class="fp-btn-primary" type="button" data-product-id="${product._id || product.id}" style="margin-top:8px;padding:8px 16px;font-size:13px;" ${!inStock ? "disabled" : ""} selectable="false" hoverable="false" editable="false">${inStock ? "Ajouter au panier" : "Rupture"}</Button>` : ""}
            </div>
          `;
        })
        .join("");
    },

    renderPlaceholder() {
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;
      const containerEl = el.querySelector(".fp-container");
      if (!containerEl) return;
      const layout = this.get("layout") || "static";
      if (layout === "carousel") {
        containerEl.classList.add("layout-carousel");
        containerEl.innerHTML = `<div class="fp-loading">Chargement des produits...</div>`;
      } else {
        containerEl.classList.remove("layout-carousel");
        containerEl.innerHTML = `
          <div class="fp-image-wrap">
            <img class="fp-image" src="${placeholderImage}" alt="Produit en vedette" />
          </div>
          <div class="fp-content">
            <span class="fp-badge">Meilleure vente</span>
            <h2 class="fp-title">Produit en vedette</h2>
            <div class="fp-price">â€”</div>
            <p class="fp-desc">Configurez un ID de produit pour afficher les dÃ©tails.</p>

          </div>
        `;
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:productData", (m) => {
        const product = m.get("productData");
        if (product) this.model.renderFeaturedProduct(product);
      });
      this.listenTo(this.model, "change:products", (m) => {
        const products = m.get("products");
        if (products) this.model.renderCarousel(products);
      });
    },

    onRender() {
      this.model.loadProduct();
    },
  },
};
