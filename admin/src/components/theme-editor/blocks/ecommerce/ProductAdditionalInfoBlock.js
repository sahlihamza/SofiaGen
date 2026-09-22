import ProductServices from "@/services/ProductServices";

export const ProductAdditionalInfoBlock = {
  id: "product-additional-info-block",
  label: "= Product Additional Info",
  category: "E-Commerce",
  content: {
    type: "product-additional-info-component",
  },
  attributes: { class: "fa fa-table" },
};

export const ProductAdditionalInfoComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-additional-info-component"),
  model: {
    defaults: {
      type: "product-additional-info-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-additional-info-component", "data-placeholder-content": "true" },
      styles: `
        .product-additional-info-component {
          width: 100%;
        }
        .product-additional-info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .product-additional-info-table th,
        .product-additional-info-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .product-additional-info-table th {
          width: 40%;
          font-weight: 600;
          color: #374151;
          background: #f9fafb;
        }
        .product-additional-info-table td {
          color: #6b7280;
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
          name: "showWeight",
          label: "Afficher le poids",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
        },
        {
          name: "showDimensions",
          label: "Afficher dimensions",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showAttributes",
          label: "Afficher les attributs",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "table", attributes: { class: "product-additional-info-table", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "tbody", selectable: false, hoverable: false, editable: false, components: [
            { tagName: "tr", selectable: false, hoverable: false, editable: false, components: [
              { tagName: "th", content: "Poids", selectable: false, hoverable: false, editable: false },
              { tagName: "td", content: "1.5 kg", selectable: false, hoverable: false, editable: false },
            ]},
            { tagName: "tr", selectable: false, hoverable: false, editable: false, components: [
              { tagName: "th", content: "Dimensions", selectable: false, hoverable: false, editable: false },
              { tagName: "td", content: "30 x 20 x 10 cm", selectable: false, hoverable: false, editable: false },
            ]},
          ]},
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:productId change:showWeight change:showDimensions change:showAttributes", this.updateInfo);
      this.loadProduct();
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) {
        this.set("productData", null);
        this.updateInfo();
        return;
      }
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateInfo();
          }
        })
        .catch((err) => console.error("Failed to load product additional info:", err));
    },

    updateInfo() {
      const product = this.get("productData");
      const showWeight = this.get("showWeight");
      const showDimensions = this.get("showDimensions");
      const showAttributes = this.get("showAttributes");
      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;

      const tbody = el.querySelector(".product-additional-info-table tbody");
      if (tbody) {
        let rows = [];
        if (showWeight && product.weight != null) {
          rows.push(`<tr><th>Poids</th><td>${product.weight} kg</td></tr>`);
        }
        if (showDimensions && product.dimensions) {
          rows.push(`<tr><th>Dimensions</th><td>${product.dimensions}</td></tr>`);
        }
        if (showAttributes && product.productAttributes && product.productAttributes.length > 0) {
          product.productAttributes.forEach((pa) => {
            const attrName = pa.attribute?.name || "Attribut";
            const attrValues = Array.isArray(pa.values) ? pa.values.join(", ") : (pa.attribute?.values?.join(", ") || "N/A");
            rows.push(`<tr><th>${attrName}</th><td>${attrValues}</td></tr>`);
          });
        }
        tbody.innerHTML = rows.join("") || `<tr><th colspan="2" style="text-align:center;color:#9ca3af;">Aucune information complémentaire</th></tr>`;
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
      const tbody = this.el.querySelector(".product-additional-info-table tbody");
      if (!tbody) return;
      const showWeight = model.get("showWeight");
      const showDimensions = model.get("showDimensions");
      const showAttributes = model.get("showAttributes");
      let rows = [];
      if (showWeight && product.weight != null) {
        rows.push(`<tr><th>Poids</th><td>${product.weight} kg</td></tr>`);
      }
      if (showDimensions && product.dimensions) {
        rows.push(`<tr><th>Dimensions</th><td>${product.dimensions}</td></tr>`);
      }
      if (showAttributes && product.productAttributes && product.productAttributes.length > 0) {
        product.productAttributes.forEach((pa) => {
          const attrName = pa.attribute?.name || "Attribut";
          const attrValues = Array.isArray(pa.values) ? pa.values.join(", ") : (pa.attribute?.values?.join(", ") || "N/A");
          rows.push(`<tr><th>${attrName}</th><td>${attrValues}</td></tr>`);
        });
      }
      tbody.innerHTML = rows.join("") || `<tr><th colspan="2" style="text-align:center;color:#9ca3af;">Aucune information complémentaire</th></tr>`;
    },
  },
};
