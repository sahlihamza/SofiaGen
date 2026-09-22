import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const ImageGalleryBlock = {
  id: "image-gallery-block",
  label: "Galerie Pro",
  category: "Sections",
  content: {
    type: "image-gallery-component",
  },
  attributes: { class: "fa fa-images" },
};

export const ImageGalleryComponent = {
  isComponent: (el) => el.classList && el.classList.contains("image-gallery-component"),
  model: {
    defaults: {
      type: "image-gallery-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "image-gallery-component", "data-widget": "gallery" },
      styles: `
        .image-gallery-component { width: 100%; }
        .image-gallery-component .gw-grid { display: grid; gap: var(--gw-gap, 16px); grid-template-columns: repeat(var(--gw-col-mobile, 1), minmax(0, 1fr)); }
        @media (min-width: 768px) { .image-gallery-component .gw-grid { grid-template-columns: repeat(var(--gw-col-tablet, 2), minmax(0, 1fr)); } }
        @media (min-width: 1024px) { .image-gallery-component .gw-grid { grid-template-columns: repeat(var(--gw-col-desktop, 3), minmax(0, 1fr)); } }
        .image-gallery-component .gw-masonry { column-gap: var(--gw-gap, 16px); }
        .image-gallery-component .gw-masonry-item { break-inside: avoid; margin-bottom: var(--gw-gap, 16px); }
        .image-gallery-component .gw-masonry-item img { border-radius: var(--gw-radius, 8px); display: block; width: 100%; }
        .image-gallery-component .gw-justified { display: flex; flex-wrap: wrap; gap: var(--gw-gap, 16px); align-items: flex-start; }
        .image-gallery-component .gw-justified-item img { border-radius: var(--gw-radius, 8px); width: 100%; height: var(--gw-justified-height, 300px); object-fit: cover; display: block; }
        .image-gallery-component .gw-carousel-track { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; overflow-x: auto; }
        .image-gallery-component .gw-carousel-slide { scroll-snap-align: center; flex-shrink: 0; }
        .image-gallery-component .gw-carousel-arrow { position: absolute; top: 50%; transform: translateY(-50%); }
        .image-gallery-component .gw-carousel-arrow--prev { left: 8px; }
        .image-gallery-component .gw-carousel-arrow--next { right: 8px; }
        .image-gallery-component .gallery-item { position: relative; overflow: hidden; border-radius: var(--gw-radius, 8px); cursor: pointer; background: #f3f4f6; }
        .image-gallery-component .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; display: block; }
        .image-gallery-component .gallery-item:hover img { transform: scale(1.05); }
        .image-gallery-component .gallery-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: white; font-size: 13px; opacity: 0; transition: opacity 0.3s ease; }
        .image-gallery-component .gallery-item:hover .gallery-caption { opacity: 1; }
      `,
      traits: [
        {
          name: "mode",
          label: "Mode",
          type: "select",
          default: "manual",
          options: [
            { value: "manual", label: "Manuel" },
            { value: "dynamic", label: "Dynamique" },
            { value: "mixed", label: "Mixte" },
          ],
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "layout",
          label: "Mise en page",
          type: "select",
          default: "grid",
          options: [
            { value: "grid", label: "Grille" },
            { value: "masonry", label: "Masonry" },
            { value: "justified", label: "Justifié" },
            { value: "carousel", label: "Carrousel" },
            { value: "slider", label: "Slider" },
          ],
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "columns",
          label: "Colonnes",
          type: "select",
          default: "3",
          options: [
            { value: "2", label: "2 colonnes" },
            { value: "3", label: "3 colonnes" },
            { value: "4", label: "4 colonnes" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "columnsTablet",
          label: "Colonnes (Tablette)",
          type: "select",
          default: "2",
          options: [
            { value: "1", label: "1 colonne" },
            { value: "2", label: "2 colonnes" },
            { value: "3", label: "3 colonnes" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "columnsMobile",
          label: "Colonnes (Mobile)",
          type: "select",
          default: "1",
          options: [
            { value: "1", label: "1 colonne" },
            { value: "2", label: "2 colonnes" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "gap",
          label: "Espacement (px)",
          type: "number",
          default: 16,
          min: 0,
          max: 48,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "radius",
          label: "Arrondi (px)",
          type: "number",
          default: 8,
          min: 0,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "hoverEffect",
          label: "Effet au survol",
          type: "select",
          default: "overlay",
          options: [
            { value: "zoom", label: "Zoom" },
            { value: "overlay", label: " superposition" },
            { value: "caption", label: "Légende" },
            { value: "none", label: "Aucun" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showCaption",
          label: "Afficher les légendes",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showLightbox",
          label: "Activer la lightbox",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "showFilters",
          label: "Afficher les filtres",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "filterType",
          label: "Type de filtre",
          type: "select",
          default: "tabs",
          options: [
            { value: "tabs", label: "Onglets" },
            { value: "dropdown", label: "Liste déroulante" },
            { value: "none", label: "Aucun" },
          ],
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "carouselOptions",
          label: "Options carrousel",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "carouselAutoplay",
          label: "Lecture automatique",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "carouselSpeed",
          label: "Vitesse (ms)",
          type: "number",
          default: 4000,
          min: 1000,
          max: 10000,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "carouselLoop",
          label: "Boucle carrousel",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "showArrows",
          label: "Afficher les fléches",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "showDots",
          label: "Afficher les points",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "items",
          label: "Images",
          type: "list",
          changeProp: 1,
          default: [
            { url: placeholderImage, caption: "Image 1" },
            { url: placeholderImage, caption: "Image 2" },
            { url: placeholderImage, caption: "Image 3" },
          ],
          itemSchema: [
            { key: "url", label: "Image", type: "media-picker" },
            { key: "caption", label: "Légende", type: "text" },
            { key: "link", label: "Lien", type: "text" },
          ],
          category: "content",
          section: "Contenu",
        },
        {
          name: "storeId",
          label: "Boutique (dynamique)",
          type: "text",
          default: "",
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "category",
          label: "Catégorie (dynamique)",
          type: "text",
          default: "",
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "limit",
          label: "Limite",
          type: "number",
          default: 12,
          min: 1,
          max: 100,
          changeProp: 1,
          category: "settings",
          section: "Paramètres",
        },
        {
          name: "cssId",
          label: "CSS ID",
          type: "text",
          default: "",
          changeProp: 1,
          category: "settings",
          section: "Avancé",
        },
        {
          name: "cssClass",
          label: "CSS Class",
          type: "text",
          default: "",
          changeProp: 1,
          category: "settings",
          section: "Avancé",
        },
      ],
      components: [],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on(
        "change:items change:columns change:columnsTablet change:columnsMobile change:gap change:radius change:hoverEffect change:showCaption change:showLightbox change:showFilters change:filterType change:carouselAutoplay change:carouselSpeed change:carouselLoop change:showArrows change:showDots change:cssId change:cssClass",
        () => {
          this.syncItems();
          this.syncConfigAndPreview();
        }
      );
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
      attachPlaceholderContentListener(this, ["change:items"]);
    },

    buildIfFresh() {
      if (this.components().length === 0) {
        this.syncItems();
        this.syncConfigAndPreview();
      }
    },

    parseItems() {
      let items = this.get("items") || [];
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch (e) {
          console.warn("ImageGalleryBlock.parseItems: invalid items JSON", e);
          items = [];
        }
      }
      return items.length ? items : [{ url: placeholderImage, caption: "Image 1" }];
    },

    buildConfig() {
      return {
        widgetId: "gallery",
        configVersion: 1,
        mode: this.get("mode") || "manual",
        layout: this.get("layout") || "grid",
        items: this.parseItems(),
        storeId: this.get("storeId") || "",
        category: this.get("category") || "",
        tag: this.get("tag") || "",
        sortBy: this.get("sortBy") || "newest",
        limit: Number(this.get("limit")) || 12,
        columns: {
          desktop: Number(this.get("columns")) || 3,
          tablet: Number(this.get("columnsTablet")) || 2,
          mobile: Number(this.get("columnsMobile")) || 1,
        },
        gap: Number(this.get("gap")) || 16,
        radius: Number(this.get("radius") || 8),
        hoverEffect: this.get("hoverEffect") || "overlay",
        showCaption: this.get("showCaption") !== false,
        showLightbox: this.get("showLightbox") !== false,
        showFilters: this.get("showFilters") !== false,
        filterType: this.get("filterType") || "tabs",
        carouselAutoplay: this.get("carouselAutoplay") !== false,
        carouselSpeed: Number(this.get("carouselSpeed")) || 4000,
        carouselLoop: this.get("carouselLoop") !== false,
        showArrows: this.get("showArrows") !== false,
        showDots: this.get("showDots") !== false,
        cssId: this.get("cssId") || "",
        cssClass: this.get("cssClass") || "",
      };
    },

    syncConfigAndPreview() {
      const el = this.view?.el;
      if (!el) return;
      const cfg = this.buildConfig();
      syncWidgetPlaceholder(this, cfg);
      this.updateGallery();
    },

    syncItems() {
      const items = this.parseItems();
      this.components().reset();

      const grid = this.append({
        tagName: "div",
        attributes: { class: "gw-grid", "data-gallery-root": this.ccid || this.getId() },
        selectable: false,
        hoverable: false,
        components: [],
      })[0];

      items.forEach((it, idx) => {
        const itemDiv = {
          tagName: "div",
          attributes: {
            class: "gallery-item",
            "data-gallery-index": String(idx),
          },
          droppable: false,
          selectable: false,
          hoverable: false,
          components: [
            {
              tagName: "img",
              attributes: { src: it.url || placeholderImage, alt: it.caption || `Image ${idx + 1}`, loading: "lazy" },
              selectable: false,
              hoverable: false,
            },
            it.caption
              ? {
                  tagName: "div",
                  attributes: { class: "gallery-caption" },
                  content: it.caption,
                  selectable: false,
                  hoverable: false,
                  editable: false,
                }
              : undefined,
          ].filter(Boolean),
        };
        grid.append(itemDiv);
      });

      this.updateGallery();
    },

    updateGallery() {
      const el = this.view?.el;
      if (!el) return;
      const columns = this.get("columns") || "3";
      const columnsTablet = this.get("columnsTablet") || "2";
      const columnsMobile = this.get("columnsMobile") || "1";
      const gap = this.get("gap") || 16;
      const radius = this.get("radius") || 8;

      el.style.setProperty("--gw-col-desktop", columns);
      el.style.setProperty("--gw-col-tablet", columnsTablet);
      el.style.setProperty("--gw-col-mobile", columnsMobile);
      el.style.setProperty("--gw-gap", `${gap}px`);
      el.style.setProperty("--gw-radius", `${radius}px`);
    },

    onRemove() {
      if (typeof document !== "undefined") {
        const root = this.view?.el;
        if (root) {
          const overlay = root.querySelector(".gallery-lightbox-overlay");
          if (overlay) overlay.remove();
        }
      }
    },
  },
};
