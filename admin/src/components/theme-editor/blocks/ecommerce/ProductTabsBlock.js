import ProductServices from "@/services/ProductServices";
import { Button } from "@sofia/ui";

export const ProductTabsBlock = {
  id: "product-tabs-block",
  label: "ðŸ“‘ Product Tabs",

  category: "E-Commerce",
  content: {
    type: "product-tabs-component",
  },
  attributes: { class: "fa fa-folder" },
};

export const ProductTabsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-tabs-component"),
  model: {
    defaults: {
      type: "product-tabs-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-tabs-component", "data-placeholder-content": "true" },
      styles: `
        .product-tabs-component {
          width: 100%;
        }
        .product-tabs-nav {
          display: flex;
          gap: 0;
          border-bottom: 1px solid #e5e7eb;
          overflow-x: auto;
        }
        .product-tab-btn {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .product-tab-btn.active {
          color: var(--ts-color-primary, #667eea);
          border-bottom-color: var(--ts-color-primary, #667eea);
        }
        .product-tab-btn:hover {
          color: var(--ts-color-primary, #667eea);
        }
        .product-tab-panel {
          display: none;
          padding: 20px 0;
          font-size: 14px;
          line-height: 1.7;
          color: #374151;
        }
        .product-tab-panel.active {
          display: block;
        }
        .product-reviews-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .product-reviews-avg {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
        }
        .product-reviews-stars {
          color: #f59e0b;
          font-size: 20px;
        }
        .product-reviews-count {
          font-size: 14px;
          color: #6b7280;
        }
        .product-review-item {
          padding: 16px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .product-review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .product-review-author {
          font-weight: 600;
          font-size: 14px;
          color: #374151;
        }
        .product-review-date {
          font-size: 12px;
          color: #9ca3af;
        }
        .product-review-body {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
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
          name: "tabDescription",
          label: "Onglet Description",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Onglets",
        },
        {
          name: "tabAttributes",
          label: "Onglet Attributs",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Onglets",
        },
        {
          name: "tabReviews",
          label: "Onglet Avis",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Onglets",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "product-tabs-nav", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "button", attributes: { class: "product-tab-btn active", type: "button", selectable: false, hoverable: false, editable: false }, content: "Description" },
          { tagName: "button", attributes: { class: "product-tab-btn", type: "button", selectable: false, hoverable: false, editable: false }, content: "Informations complÃ©mentaires" },
          { tagName: "button", attributes: { class: "product-tab-btn", type: "button", selectable: false, hoverable: false, editable: false }, content: "Avis" },
        ]},
        { tagName: "div", attributes: { class: "product-tab-panel active", selectable: false, hoverable: false, editable: false }, content: "Product description here." },
        { tagName: "div", attributes: { class: "product-tab-panel", selectable: false, hoverable: false, editable: false }, content: "Additional information here." },
        { tagName: "div", attributes: { class: "product-tab-panel", selectable: false, hoverable: false, editable: false }, content: "Customer reviews here." },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:tabDescription change:tabAttributes change:tabReviews", this.renderTabs);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.renderTabs();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.renderTabs();
          }
        })
        .catch((err) => console.error("Failed to load product tabs:", err));
    },

    renderTabs() {
      const product = this.get("productData");
      if (!this.view) return;
      const el = this.view.el;
      if (!el) return;

      const tabDescription = this.get("tabDescription");
      const tabAttributes = this.get("tabAttributes");
      const tabReviews = this.get("tabReviews");

      const tabsNav = el.querySelector(".product-tabs-nav");
      if (tabsNav) {
        const buttons = tabsNav.querySelectorAll(".product-tab-btn");
        const visibleTabs = [];
        if (tabDescription) visibleTabs.push({ label: "Description", idx: 0 });
        if (tabAttributes) visibleTabs.push({ label: "Informations complÃ©mentaires", idx: 1 });
        if (tabReviews) visibleTabs.push({ label: `Avis (${product?.reviewCount || 0})`, idx: 2 });

        tabsNav.innerHTML = visibleTabs.map((tab, displayIdx) =>
          `<Button class="product-tab-btn ${displayIdx === 0 ? "active" : ""}" type="button" data-tab-idx="${tab.idx}" selectable="false" hoverable="false" editable="false">${tab.label}</Button>`
        ).join("");

        const panels = el.querySelectorAll(".product-tab-panel");
        panels.forEach((p, i) => {
          p.style.display = "none";
          p.classList.remove("active");
        });

        buttons.forEach((btn) => btn.removeEventListener("click", btn._handler));
        const newButtons = tabsNav.querySelectorAll(".product-tab-btn");
        newButtons.forEach((btn, displayIdx) => {
          const tabIdx = parseInt(btn.dataset.tabIdx, 10);
          btn._handler = () => {
            newButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const panels = el.querySelectorAll(".product-tab-panel");
            panels.forEach((p) => { p.classList.remove("active"); p.style.display = "none"; });
            const target = el.querySelectorAll(".product-tab-panel")[tabIdx];
            if (target) { target.classList.add("active"); target.style.display = "block"; }
          };
          btn.addEventListener("click", btn._handler);
        });
      }

      const panels = el.querySelectorAll(".product-tab-panel");
      if (panels[0] && product?.description) {
        panels[0].innerHTML = product.description;
      } else if (panels[0]) {
        panels[0].innerHTML = product ? "Aucune description disponible." : "Product description here.";
      }

      if (panels[1]) {
        let infoHtml = "";
        if (product) {
          if (product.weight != null) infoHtml += `<p><strong>Poids:</strong> ${product.weight} kg</p>`;
          if (product.dimensions) infoHtml += `<p><strong>Dimensions:</strong> ${product.dimensions}</p>`;
          if (product.productAttributes && product.productAttributes.length > 0) {
            infoHtml += `<table style="width:100%;border-collapse:collapse;margin-top:12px;"><tbody>`;
            product.productAttributes.forEach((pa) => {
              const name = pa.attribute?.name || "Attribut";
              const values = Array.isArray(pa.values) ? pa.values.join(", ") : (pa.attribute?.values?.join(", ") || "N/A");
              infoHtml += `<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;width:40%;">${name}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${values}</td></tr>`;
            });
            infoHtml += `</tbody></table>`;
          }
        }
        panels[1].innerHTML = infoHtml || "Aucune information complÃ©mentaire.";
        panels[1].style.display = tabAttributes ? "block" : "none";
      }

      if (panels[2]) {
        if (product?.enableReviews && product.reviews?.length > 0) {
          let reviewsHtml = `
            <div class="product-reviews-summary">
              <div class="product-reviews-avg">${(product.averageRating || 0).toFixed(1)}</div>
              <div>
                <div class="product-reviews-stars">${"â˜…".repeat(Math.round(product.averageRating || 0))}${"â˜†".repeat(5 - Math.round(product.averageRating || 0))}</div>

                <div class="product-reviews-count">${product.reviewCount || product.reviews.length} avis</div>
              </div>
            </div>
          `;
          reviewsHtml += product.reviews.map((review) => `
            <div class="product-review-item">
              <div class="product-review-header">
                <span class="product-review-author">${review.authorName || review.customerName || "Client"}</span>
                <span class="product-review-date">${review.createdAt ? new Date(review.createdAt).toLocaleDateString("fr-FR") : ""}</span>
              </div>
              <div style="color:#f59e0b;font-size:14px;margin-bottom:4px;">${"â˜…".repeat(review.rating || 0)}${"â˜†".repeat(5 - (review.rating || 0))}</div>

              <div class="product-review-body">${review.comment || ""}</div>
            </div>
          `).join("");
          panels[2].innerHTML = reviewsHtml;
        } else if (product?.enableReviews) {
          panels[2].innerHTML = `<p style='color:#9ca3af;font-style:italic;'>Aucun avis pour le moment. Soyez le premier Ã  donner votre avis !</p>`;

        } else {
          panels[2].innerHTML = `<p style='color:#9ca3af;font-style:italic;'>Les avis sont dÃ©sactivÃ©s pour ce produit.</p>`;
        }
        panels[2].style.display = tabReviews ? "block" : "none";
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
      const panels = this.el.querySelectorAll(".product-tab-panel");
      if (panels[0] && product.description) panels[0].innerHTML = product.description;
      if (panels[2] && product.enableReviews) {
        if (product.reviews?.length > 0) {
          panels[2].innerHTML = product.reviews.map((review) => `
            <div class="product-review-item">
              <div class="product-review-header">
                <span class="product-review-author">${review.authorName || "Client"}</span>
                <span class="product-review-date">${review.createdAt ? new Date(review.createdAt).toLocaleDateString("fr-FR") : ""}</span>
              </div>
              <div style="color:#f59e0b;font-size:14px;">${"â˜…".repeat(review.rating || 0)}${"â˜†".repeat(5 - (review.rating || 0))}</div>

              <div class="product-review-body">${review.comment || ""}</div>
            </div>
          `).join("");
        } else {
          panels[2].innerHTML = `<p style='color:#9ca3af;font-style:italic;'>Aucun avis pour le moment.</p>`;
        }
      }
    },
  },
};
