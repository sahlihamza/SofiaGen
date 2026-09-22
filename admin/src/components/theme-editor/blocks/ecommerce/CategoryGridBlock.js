import CategoryServices from "@/services/CategoryServices";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const CategoryGridBlock = {
  id: "category-grid-block",
  label: "< Grille de catégories",
  category: "Sections",
  section: "Sections",
  content: {
    type: "category-grid-component",
  },
  attributes: {
    class: "fa fa-list",
  },
};

export const CategoryGridBlockComponent = {
  isComponent: (el) => {
    return el.classList && el.classList.contains("category-grid-component");
  },

  model: {
    defaults: {
      type: "category-grid-component",
      draggable: true,
      droppable: false,
      attributes: {
        class: "category-grid-component",
      },
      styles: `
        .category-grid-component {
          padding: var(--ts-section-spacing, 60px) 20px;
          background-color: var(--ts-color-background, #ffffff);
        }

        .category-grid-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .category-grid-header h2 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: bold;
          color: var(--ts-color-text-primary, #333);
        }

        .category-grid-header p {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          color: var(--ts-color-text-secondary, #666);
        }

        .category-grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          max-width: var(--ts-container-width, 1200px);
          margin: 0 auto;
        }

        .category-card {
          position: relative;
          overflow: hidden;
          border-radius: var(--ts-card-radius, 8px);
          height: 250px;
          cursor: pointer;
          box-shadow: var(--ts-card-shadow, 0 2px 8px rgba(0,0,0,0.08));
          transition: transform var(--ts-anim-speed, 0.3s) var(--ts-anim-easing, ease),
                      box-shadow var(--ts-anim-speed, 0.3s) var(--ts-anim-easing, ease);
          text-decoration: none;
          display: block;
        }

        .category-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .category-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .category-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: background var(--ts-anim-speed, 0.3s) var(--ts-anim-easing, ease);
        }

        .category-card:hover .category-overlay {
          background: rgba(0, 0, 0, 0.5);
        }

        .category-name {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          color: #ffffff;
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          padding: 0 12px;
        }

        .category-count {
          color: rgba(255,255,255,0.85);
          font-size: 13px;
          margin-top: 4px;
        }

        .category-loading {
          text-align: center;
          padding: 40px;
          color: var(--ts-color-text-secondary, #666);
        }

        .category-error {
          text-align: center;
          padding: 40px;
          color: var(--ts-error-color, #d32f2f);
          background: rgba(239,68,68,0.08);
          border-radius: var(--ts-card-radius, 8px);
        }

        .category-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--ts-color-text-secondary, #666);
        }

        .category-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
      `,
      content: `
        <div class="category-grid-header">
          <h2>Parcourir par catégorie</h2>
          <p>Parcourez notre collection</p>
        </div>
        <div class="category-grid-container" id="category-grid-items">
          <div class="category-loading">Chargement des catégories...</div>
        </div>
      `,
      categories: [],
      traits: [
        {
          name: "columnCount",
          label: "Columns",
          type: "number",
          default: 4,
          min: 2,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "categoryCount",
          label: "Afficher les catégories",
          type: "number",
          default: 8,
          min: 1,
          max: 20,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "storeId",
          label: "ID de la boutique",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showFeaturedOnly",
          label: "Catégories vedettes uniquement",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showCount",
          label: "Afficher nombre de produits",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showCategoryName",
          label: "Afficher nom catégorie",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "overlayOpacity",
          label: "Opacité de l'overlay",
          type: "range",
          min: 0,
          max: 1,
          step: 0.1,
          default: 0.3,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this._overlayStyleEl = null;
      this.on("change:columnCount", this.updateColumns);
      this.on("change:categoryCount change:storeId change:showFeaturedOnly change:overlayOpacity", this.onGridConfigChange);
      this.loadCategories();
    },

    onRemove() {
      if (this._overlayStyleEl && this._overlayStyleEl.parentNode) {
        this._overlayStyleEl.parentNode.removeChild(this._overlayStyleEl);
      }
      this._overlayStyleEl = null;
    },

    onGridConfigChange() {
      this.loadCategories();
      this.updateOpacity();
    },

    loadCategories() {
      const self = this;
      const storeId = this.get("storeId");
      const showFeatured = this.get("showFeaturedOnly");
      const count = this.get("categoryCount") || 8;

      const container = self.view?.el?.querySelector("#category-grid-items");
      if (container) {
        container.innerHTML = `<div class="category-loading">Chargement des catégories...</div>`;
      }

      const fetchPromise = showFeatured
        ? CategoryServices.getAllCategories()
        : CategoryServices.getAllCategory();

      fetchPromise
        .then((response) => {
          let categories = response?.data || [];
          if (showFeatured) {
            categories = categories.filter((c) => c.featured || c.isFeatured);
          }
          categories = categories.slice(0, count);
          self.set("categories", categories);
          self.renderCategories();
        })
        .catch((error) => {
          console.error("Error loading categories:", error);
          if (container) {
            container.innerHTML = `<div class="category-error">Erreur lors du chargement des catégories. Veuillez réssayer plus tard.</div>`;
          }
        });
    },

    renderCategories() {
      if (!this.view) return;

      const container = this.view.el.querySelector("#category-grid-items");
      if (!container) return;

      const categories = this.get("categories") || [];
      const showCount = this.get("showCount");
      const showName = this.get("showCategoryName");

      if (categories.length === 0) {
        container.innerHTML = `
          <div class="category-empty">
            <div class="category-empty-icon"><</div>
            <div>Aucune catégorie disponible</div>
          </div>`;
        return;
      }

      container.innerHTML = categories
        .map(
          (cat) => `
          <a href="/category/${cat._id || cat.id || cat.slug || ""}" class="category-card">
            <img 
              class="category-image" 
              src="${cat.image || cat.coverImage || placeholderImage}" 
              alt="${cat.name}"
              selectable="false" hoverable="false" editable="false"
            />
            <div class="category-overlay">
              ${showName ? `<div class="category-name">${cat.name}</div>` : ""}
              ${showCount && cat.productCount != null ? `<div class="category-count">${cat.productCount} produit${cat.productCount > 1 ? "s" : ""}</div>` : ""}
            </div>
          </a>
        `
        )
        .join("");
    },

    updateColumns() {
      const cols = this.get("columnCount");
      const container = this.view?.el?.querySelector(".category-grid-container");
      if (container) {
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      }
    },

    updateOpacity() {
      const opacity = this.get("overlayOpacity");
      if (typeof document !== "undefined") {
        if (!this._overlayStyleEl) {
          this._overlayStyleEl = document.createElement("style");
          this._overlayStyleEl.setAttribute("data-category-overlay", "true");
          document.head.appendChild(this._overlayStyleEl);
        }
        this._overlayStyleEl.innerHTML = `.category-grid-component .category-overlay { background: rgba(0, 0, 0, ${opacity}) !important; }`;
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:columnCount", this.updateColumns);
      this.listenTo(this.model, "change:categories", this.renderCategories);
    },

    onRender() {
      this.updateColumns();
      this.model.loadCategories();
      this.model.updateOpacity();
    },

    updateColumns() {
      const cols = this.model.get("columnCount");
      const container = this.el.querySelector(".category-grid-container");
      if (container) {
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      }
    },

    renderCategories() {
      const categories = this.model.get("categories") || [];
      const container = this.el.querySelector("#category-grid-items");

      if (!container) return;

      if (categories.length === 0) {
        container.innerHTML = `
          <div class="category-empty">
            <div class="category-empty-icon"><</div>
            <div>Aucune catégorie disponible</div>
          </div>`;
        return;
      }

      const showCount = this.model.get("showCount");
      const showName = this.model.get("showCategoryName");

      container.innerHTML = categories
        .map(
          (cat) => `
          <a href="/category/${cat._id || cat.id || cat.slug || ""}" class="category-card">
            <img 
              class="category-image" 
              src="${cat.image || cat.coverImage || placeholderImage}" 
              alt="${cat.name}"
              selectable="false" hoverable="false" editable="false"
            />
            <div class="category-overlay">
              ${showName ? `<div class="category-name">${cat.name}</div>` : ""}
              ${showCount && cat.productCount != null ? `<div class="category-count">${cat.productCount} produit${cat.productCount > 1 ? "s" : ""}</div>` : ""}
            </div>
          </a>
        `
        )
        .join("");
    },
  },
};
