/**
 * AllProductsBlock  widget "Tous les produits" (Product Grid) pour le
 * builder visuel (GrapesJS / theme-editor).
 *
 * Rôle du block :
 *  - exposer les options du builder organisés en 3 onglets (Content,
 *    Style, Advanced) via les `traits` ;
 *  - produire un placeholder `<div data-widget="all-products"
 *    data-config='{...}' data-store-id="..."></div>` qui sera, côté
 *    storefront, monté en React par `mountStorefrontWidgets.js` ;
 *  - afficher un aperçu dynamique dans le canvas (admin) en interrogeant
 *    ProductServices.
 *
 * Le runtime React vit dans store/src/components/product-grid/AllProductsWidget.jsx.
 * Ce block ne fait que configurer + sérialiser.
 */

import ProductServices from "@/services/ProductServices";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";
import {
  colorTraits,
  spacingTraits,
  borderTraits,
  typographyTraits,
  shadowTraits,
} from "../../traits/utils/commonStyleTraits";
import {
  applyColorStyle,
  applyBorderStyle,
  applyTypographyStyle,
  applyShadowStyle,
} from "../../traits/utils/applyCommonStyles";

const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

/* ----------------------------------------------------------------------- */
/* Définition du block (palette du builder)                                */
/* ----------------------------------------------------------------------- */
export const AllProductsBlock = {
  id: "all-products-block",
  label: "= Tous les produits",
  category: "E-Commerce",
  section: "E-Commerce",
  content: { type: "all-products-component" },
  attributes: { class: "fa fa-th" },
};

/* ----------------------------------------------------------------------- */
/* Définition du composant GrapesJS                                         */
/* ----------------------------------------------------------------------- */
export const AllProductsComponent = {
  isComponent: (el) =>
    el && el.classList && el.classList.contains("all-products-component"),

  model: {
    defaults: {
      type: "all-products-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "all-products-component" },
      styles: `
        .all-products-component {
          padding: var(--ts-section-spacing, 40px) 20px;
          background: var(--ts-color-surface, #f9fafb);
          min-height: 120px;
        }
        .all-products-component .ap-canvas-head { text-align:center; margin-bottom: 18px; }
        .all-products-component .ap-canvas-head h2 { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #111827; }
        .all-products-component .ap-canvas-head p { margin: 0; color: #6b7280; font-size: 14px; }
        .all-products-component .ap-canvas-grid {
          display: grid;
          grid-template-columns: repeat(var(--ap-cols, 4), minmax(0, 1fr));
          gap: 16px;
        }
        .all-products-component .ap-canvas-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .all-products-component .ap-canvas-img { width: 100%; height: 150px; object-fit: cover; background: #f3f4f6; }
        .all-products-component .ap-canvas-body { padding: 10px; }
        .all-products-component .ap-canvas-title { font-size: 13px; font-weight: 600; color: #111827; margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .all-products-component .ap-canvas-price { font-size: 14px; font-weight: 700; color: var(--ts-color-primary, #667eea); }
        .all-products-component .ap-canvas-loading { text-align: center; padding: 40px; color: #6b7280; }
      `,
      // Contenu initial : placeholder qui sera lu par le mounter storefront.
      content: `
        <div class="ap-canvas-head">
          <h2>Nos produits</h2>
          <p>Découvrez notre catalogue</p>
        </div>
        <div class="ap-canvas-grid" id="all-products-items">
          <div class="ap-canvas-loading">Chargement des produits...</div>
        </div>
      `,
      products: [],
      // ---- Valeurs par défaut des traits (synchronisés dans data-config) ----
      columnsDesktop: 4,
      columnsTablet: 2,
      columnsMobile: 1,
      perPage: 12,
      defaultSort: "newest",
      categoryIds: "", // séparation par virgule (multi-select léger)
      showFilters: true,
      filtersPosition: "sidebar",
      showPagination: true,
      displayType: "grid",
      source: "", // "" | products.latest | products.featured
      // Style
      cardGap: 20,
      // Advanced
      cssId: "",
      cssClass: "",
      visibilityConditions: "",
      cacheMs: 60,

      traits: [
        /* ============================= CONTENT ============================= */
        {
          name: "title",
          label: "Titre",
          type: "text",
          default: "Nos produits",
          placeholder: "Titre de la section",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "subtitle",
          label: "Sous-titre",
          type: "text",
          default: "Découvrez notre catalogue",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "columnsDesktop",
          label: "Colonnes (desktop)",
          type: "number",
          default: 4,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Grille",
        },
        {
          name: "columnsTablet",
          label: "Colonnes (tablette)",
          type: "number",
          default: 2,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Grille",
        },
        {
          name: "columnsMobile",
          label: "Colonnes (mobile)",
          type: "number",
          default: 1,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Grille",
        },
        {
          name: "perPage",
          label: "Produits par page",
          type: "number",
          default: 12,
          min: 1,
          max: 60,
          changeProp: 1,
          category: "content",
          section: "Grille",
        },
        {
          name: "displayType",
          label: "Type d'affichage",
          type: "select",
          default: "grid",
          options: [
            { id: "grid", label: "Grille" },
            { id: "list", label: "Liste" },
          ],
          changeProp: 1,
          category: "content",
          section: "Grille",
        },
        {
          name: "defaultSort",
          label: "Tri par défaut",
          type: "select",
          default: "newest",
          options: [
            { id: "newest", label: "Nouveautés" },
            { id: "popular", label: "Meilleures ventes" },
            { id: "rating", label: "Mieux notés" },
            { id: "price-asc", label: "Prix croissant" },
            { id: "price-desc", label: "Prix décroissant" },
          ],
          changeProp: 1,
          category: "content",
          section: "Tri & source",
        },
        {
          name: "source",
          label: "Source de donnés (dynamicData)",
          type: "select",
          default: "",
          options: [
            { id: "", label: "Catalogue complet (/products)" },
            { id: "products.latest", label: "Derniers produits" },
            { id: "products.featured", label: "Produits en vedette" },
          ],
          changeProp: 1,
          category: "content",
          section: "Tri & source",
        },
        {
          name: "categoryIds",
          label: "Catégories (IDs séparés par ,)",
          type: "text",
          default: "",
          placeholder: "ex: 64a1...,64a2...",
          changeProp: 1,
          category: "content",
          section: "Tri & source",
        },
        {
          name: "showFilters",
          label: "Afficher les filtres",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Filtres & pagination",
        },
        {
          name: "filtersPosition",
          label: "Position des filtres",
          type: "select",
          default: "sidebar",
          options: [
            { id: "sidebar", label: "Barre latérale" },
            { id: "top", label: "En haut" },
          ],
          changeProp: 1,
          category: "content",
          section: "Filtres & pagination",
        },
        {
          name: "showPagination",
          label: "Pagination (sinon infinite scroll)",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Filtres & pagination",
        },

        /* ============================= STYLE ============================= */
        ...spacingTraits({ prefix: "allProducts", defaults: { padding: 40, gap: 20 }, section: "Disposition" }),
        {
          name: "cardGap",
          label: "Espacement entre cartes (px)",
          type: "number",
          default: 20,
          min: 0,
          max: 64,
          changeProp: 1,
          category: "style",
          section: "Disposition",
        },
        ...colorTraits({
          prefix: "apCard",
          fields: ["background", "text"],
          defaults: { background: "#ffffff", text: "#111827" },
          section: "Carte",
        }),
        ...borderTraits({ prefix: "apCard", defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 12 }, section: "Carte" }),
        ...shadowTraits({ prefix: "apCard" }, "Carte"),
        ...typographyTraits({ prefix: "apTitle", defaults: { size: 15, weight: "600" }, section: "Titre produit" }),
        ...colorTraits({
          prefix: "apPrice",
          fields: ["background"],
          defaults: { background: "#667eea" },
          section: "Prix",
        }),
        ...colorTraits({
          prefix: "apStock",
          fields: ["background"],
          defaults: { background: "#10b981" },
          section: "Badge stock",
        }),
        ...colorTraits({
          prefix: "apBtn",
          fields: ["background", "text"],
          defaults: { background: "#667eea", text: "#ffffff" },
          section: "Bouton panier",
        }),

        /* ============================ ADVANCED =========================== */
        {
          name: "cssId",
          label: "ID CSS",
          type: "text",
          default: "",
          changeProp: 1,
          category: "advanced",
          section: "Attributs",
        },
        {
          name: "cssClass",
          label: "Classes CSS",
          type: "text",
          default: "",
          changeProp: 1,
          category: "advanced",
          section: "Attributs",
        },
        {
          name: "visibilityConditions",
          label: "Conditions d'affichage",
          type: "select",
          default: "always",
          options: [
            { id: "always", label: "Toujours" },
            { id: "logged-in", label: "Utilisateur connecté" },
            { id: "logged-out", label: "Utilisateur déconnecté" },
            { id: "has-stock", label: "Si stock dispo" },
          ],
          changeProp: 1,
          category: "advanced",
          section: "Attributs",
        },
        {
          name: "cacheMs",
          label: "Duré du cache (secondes)",
          type: "number",
          default: 60,
          min: 0,
          max: 3600,
          changeProp: 1,
          category: "advanced",
          section: "Performance",
        },
      ],
    },

    /* ----------------------------- Lifecycle ---------------------------- */
    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);

      // Re-render du canvas + re-sync du data-config  chaque changement pertinent.
      this.on(
        "change:title change:subtitle change:columnsDesktop change:columnsTablet change:columnsMobile change:perPage change:displayType change:defaultSort change:source change:categoryIds change:showFilters change:filtersPosition change:showPagination",
        this.syncConfigAndPreview
      );
      this.on(
        "change:allProductsPadding change:allProductsGap change:cardGap change:apCardBackgroundColor change:apCardTextColor change:apCardBorderColor change:apCardBorderRadius change:apCardShadow change:apTitleTypography change:apPriceBackgroundColor change:apStockBackgroundColor change:apBtnBackgroundColor change:apBtnTextColor",
        this.updateStyles
      );
      this.on("change:cssId change:cssClass change:cacheMs", this.syncConfigAndPreview);

      // Aperçu initial + première synchro du data-config.
      this.once("added", () => {
        this.syncConfigAndPreview();
        this.updateStyles();
        this.loadPreview();
      });
    },

    getEl() {
      return this.view?.el;
    },

    /* ---------------------- Sérialisation data-config ------------------ */
    buildConfig() {
      const categories = (this.get("categoryIds") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        widgetId: "all-products",
        configVersion: 1,
        storeId: this.get("storeId") || "",
        title: this.get("title") || "",
        subtitle: this.get("subtitle") || "",
        columns: {
          desktop: this.get("columnsDesktop") || 4,
          tablet: this.get("columnsTablet") || 2,
          mobile: this.get("columnsMobile") || 1,
        },
        perPage: this.get("perPage") || 12,
        displayType: this.get("displayType") || "grid",
        defaultSort: this.get("defaultSort") || "newest",
        source: this.get("source") || "",
        categories,
        showFilters: this.get("showFilters") !== false,
        filtersPosition: this.get("filtersPosition") || "sidebar",
        showPagination: this.get("showPagination") !== false,
        infiniteScroll: this.get("showPagination") === false,
        cacheMs: (this.get("cacheMs") || 60) * 1000,
        cardGap: this.get("cardGap") || 20,
        cssId: this.get("cssId") || "",
        cssClass: this.get("cssClass") || "",
        visibilityConditions: this.get("visibilityConditions") || "always",
      };
    },

    syncConfigAndPreview() {
      const el = this.getEl();
      if (!el) return;
      const cfg = this.buildConfig();
      // Donnés lues par le mounter storefront.
      syncWidgetPlaceholder(this, cfg);

      // Aperçu canvas : colonnes + titres.
      el.style.setProperty("--ap-cols", cfg.columns.desktop);
      const head = el.querySelector(".ap-canvas-head");
      if (head) {
        const h2 = head.querySelector("h2");
        const p = head.querySelector("p");
        if (h2) h2.textContent = cfg.title || "Nos produits";
        if (p) p.textContent = cfg.subtitle || "";
      }
      this.loadPreview();
    },

    /* ------------------------- Aperçu canvas (admin) ------------------- */
    loadPreview() {
      const el = this.getEl();
      if (!el || typeof window === "undefined") return;
      const container = el.querySelector("#all-products-items");
      if (!container) return;

      const limit = Math.min(this.get("perPage") || 12, 8); // on limite l'aperçu
      ProductServices.getAllProducts({ page: 1, limit })
        .then((res) => {
          // Le backend renvoie { products, totalDoc, limits, pages } ;
          // on reste défensif pour gérer aussi { data: [...] } ou un tableau brut.
          const products = res?.products || res?.data || (Array.isArray(res) ? res : []) || [];
          this.set("products", products);
          this.renderPreview(products);
        })
        .catch(() => {
          container.innerHTML = `<div class="ap-canvas-loading">Erreur de chargement des produits.</div>`;
        });
    },

    renderPreview(products = []) {
      const el = this.getEl();
      if (!el) return;
      const container = el.querySelector("#all-products-items");
      if (!container) return;
      if (!products.length) {
        container.innerHTML = `<div class="ap-canvas-loading">Aucun produit. Configurez une source/catégorie.</div>`;
        return;
      }
      container.innerHTML = products
        .map(
          (p) => `
          <div class="ap-canvas-card" selectable="false" hoverable="false" editable="false">
            <img class="ap-canvas-img" src="${
              p.thumbnail || p.productImage || p.image?.[0] || placeholderImage
            }" alt="${p.productName || p.title || ""}" />
            <div class="ap-canvas-body">
              <div class="ap-canvas-title">${p.productName || p.title || "Produit"}</div>
              <div class="ap-canvas-price">${Number(p.salePrice ?? p.regularPrice ?? p.price ?? 0).toFixed(2)} </div>
            </div>
          </div>`
        )
        .join("");
    },

    /* ----------------------------- Styles ------------------------------- */
    updateStyles() {
      const el = this.getEl();
      if (!el) return;

      // Espacements / colonnes
      const padding = this.get("allProductsPadding") || 40;
      el.style.setProperty("--ts-section-spacing", `${padding}px`);
      el.style.setProperty("--ap-gap", `${this.get("cardGap") || 20}px`);
      el.style.setProperty("--ap-cols", this.get("columnsDesktop") || 4);

      // Carte : couleurs / bordure / ombre
      applyColorStyle(el, this, {
        prefix: "apCard",
        selector: ".ap-canvas-card",
        fields: ["background", "text"],
      });
      applyBorderStyle(el, this, { prefix: "apCard", selector: ".ap-canvas-card" });
      applyShadowStyle(el, this, { prefix: "apCard", selector: ".ap-canvas-card" });

      // Titre produit
      applyTypographyStyle(el, this, { prefix: "apTitle", selector: ".ap-canvas-title" });

      // Prix / stock / bouton (couleurs)
      applyColorStyle(el, this, { prefix: "apPrice", selector: ".ap-canvas-price", fields: ["background"] });
      applyColorStyle(el, this, { prefix: "apBtn", selector: ".ap-canvas-card .ap-btn", fields: ["background", "text"] });
    },
  },

  /* ------------------------------ View -------------------------------- */
  view: {
    init() {
      this.listenTo(
        this.model,
        "change:columnsDesktop change:columnsTablet change:columnsMobile change:perPage change:displayType change:defaultSort change:source change:categoryIds change:showFilters change:filtersPosition change:showPagination change:title change:subtitle change:cssId change:cssClass change:cacheMs",
        this.model.syncConfigAndPreview
      );
      this.listenTo(this.model, "change:products", () => this.model.renderPreview(this.model.get("products")));
    },
    onRender() {
      this.model.syncConfigAndPreview();
      this.model.updateStyles();
    },
  },
};
