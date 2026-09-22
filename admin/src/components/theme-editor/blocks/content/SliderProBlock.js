/**
 * SliderProBlock  slider avancé multi-types pour le visual builder.
 *
 * émet un placeholder <div data-widget="slider-pro" data-config='{...}'>
 * monté côté storefront par WidgetHost (SliderProWidget.jsx).
 *
 * Différent du CarouselBlock (slides libres via Swiper CDN) :
 *  - gère des sources dynamiques (products.latest, products.featured,
 *    testimonials.latest, testimonials.featured)
 *  - types de slides : image, video, product, logo, testimonial, custom
 *  - thumbnails, center mode, hover effects
 *
 * Runtime React : store/src/components/slider-pro-widget/SliderProWidget.jsx
 */

import { colorTraits, borderTraits, shadowTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle, applyShadowStyle } from "../../traits/utils/applyCommonStyles";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect fill='%23f3f4f6' width='400' height='250'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESlide%3C/text%3E%3C/svg%3E";

export const SliderProBlock = {
  id: "slider-pro-block",
  label: "< Slider Pro",
  category: "Sections",
  content: { type: "slider-pro-component" },
  attributes: { class: "fa fa-sliders" },
};

export const SliderProComponent = {
  isComponent: (el) => el.classList && el.classList.contains("slider-pro-component"),

  model: {
    defaults: {
      type: "slider-pro-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: {
        class: "slider-pro-component",
        "data-widget": "slider-pro",
        "data-placeholder-content": "true",
      },

      styles: `
        .slider-pro-component { position: relative; width: 100%; box-sizing: border-box; min-height: 80px; background: #fff; border: var(--sp-slide-border-width, 0px) var(--sp-slide-border-style, solid) var(--sp-slide-border-color, transparent); border-radius: var(--sp-slide-border-radius, 0px); overflow: hidden; padding: var(--sp-padding, 16px); box-shadow: var(--sp-slide-shadow-x, 0) var(--sp-slide-shadow-y, 4px) var(--sp-slide-shadow-blur, 12px) var(--sp-slide-shadow-spread, 0) var(--sp-slide-shadow-color, rgba(0,0,0,0.08)); }
        .slider-pro-component .sp-builder-preview { display: flex; gap: 8px; overflow-x: auto; padding: 8px 0; }
        .slider-pro-component .sp-builder-slide { flex-shrink: 0; width: 200px; min-height: 120px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; position: relative; }
        .slider-pro-component .sp-builder-slide img { width: 100%; height: 120px; object-fit: cover; display: block; }
        .slider-pro-component .sp-builder-slide .sp-builder-caption { padding: 8px; font-size: 12px; color: #374151; }
        .slider-pro-component .sp-builder-empty { text-align: center; color: #9ca3af; padding: 40px 0; font-size: 13px; }
        .slider-pro-component .sp-builder-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 12px; }
        .sp-builder-nav { display: flex; justify-content: center; gap: 6px; padding: 8px 0; }
        .sp-builder-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sp-dot-default, #cbd5e1); }
        .sp-builder-dot--active { background: var(--sp-dot-active, #667eea); }
      `,

      traits: [
        // ==================== CONTENT TAB ====================
        {
          name: "title",
          label: "Titre du slider",
          type: "text",
          default: "",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "sliderType",
          label: "Type de slides",
          type: "select",
          default: "image",
          options: [
            { value: "image", label: "Images" },
            { value: "video", label: "Vidéos" },
            { value: "product", label: "Produits" },
            { value: "logo", label: "Logos" },
            { value: "testimonial", label: "Témoignages" },
            { value: "custom", label: "Personnalisé" },
          ],
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "source",
          label: "Source des donnés",
          type: "select",
          default: "manual",
          options: [
            { value: "manual", label: "Manuel (saisie)" },
            { value: "products.latest", label: "Produits récents" },
            { value: "products.featured", label: "Produits en vedette" },
            { value: "testimonials.latest", label: "Témoignages récents" },
            { value: "testimonials.featured", label: "Témoignages en vedette" },
          ],
          changeProp: 1,
          category: "content",
          section: "Source",
        },
        {
          name: "limit",
          label: "Nombre max d'Éléments",
          type: "number",
          default: 8,
          min: 1,
          max: 100,
          changeProp: 1,
          category: "content",
          section: "Source",
        },
        {
          name: "items",
          label: "Slides (manuel)",
          type: "item-list",
          changeProp: 1,
          itemSchema: [
            { key: "image", label: "Image URL", type: "media-picker" },
            { key: "title", label: "Titre", type: "text" },
            { key: "content", label: "Description", type: "textarea" },
            { key: "videoUrl", label: "Vidéo (YouTube/Vimeo/MP4)", type: "text" },
          ],
          default: [
            { image: placeholderImage, title: "Slide 1", content: "Première diapositive" },
            { image: placeholderImage, title: "Slide 2", content: "Deuxiéme diapositive" },
            { image: placeholderImage, title: "Slide 3", content: "Troisiéme diapositive" },
          ],
          category: "content",
          section: "Slides manuels",
        },
        {
          name: "slidesPerView",
          label: "Slides visibles (desktop)",
          type: "number",
          default: 1,
          min: 1,
          max: 10,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "slidesPerViewTablet",
          label: "Slides visibles (tablette)",
          type: "number",
          default: 1,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "slidesPerViewMobile",
          label: "Slides visibles (mobile)",
          type: "number",
          default: 1,
          min: 1,
          max: 4,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "spaceBetween",
          label: "Espacement (px)",
          type: "number",
          default: 0,
          min: 0,
          max: 100,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "centerMode",
          label: "Mode centré",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "loop",
          label: "Boucle infinie",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "transitionEffect",
          label: "Effet de transition",
          type: "select",
          default: "slide",
          options: [
            { value: "slide", label: "Slide" },
            { value: "fade", label: "Fade" },
          ],
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "animationSpeed",
          label: "Vitesse transition (ms)",
          type: "number",
          default: 400,
          min: 100,
          max: 3000,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "autoplay",
          label: "Lecture automatique",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Autoplay",
        },
        {
          name: "autoplayDelay",
          label: "Délai (ms)",
          type: "number",
          default: 4000,
          min: 1000,
          max: 15000,
          changeProp: 1,
          category: "content",
          section: "Autoplay",
        },
        {
          name: "pauseOnHover",
          label: "Pause au survol",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Autoplay",
        },
        {
          name: "showArrows",
          label: "Fléches de navigation",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "arrowPosition",
          label: "Position fléches",
          type: "select",
          default: "center",
          options: [
            { value: "start", label: "Début" },
            { value: "center", label: "Centre" },
            { value: "end", label: "Fin" },
          ],
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "arrowStyle",
          label: "Style fléches",
          type: "select",
          default: "circle",
          options: [
            { value: "circle", label: "Cercle" },
            { value: "square", label: "Carré" },
            { value: "arrow", label: "Fléche" },
          ],
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "showDots",
          label: "Points de pagination",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "dotStyle",
          label: "Style points",
          type: "select",
          default: "circle",
          options: [
            { value: "circle", label: "Cercle" },
            { value: "square", label: "Carré" },
            { value: "line", label: "Ligne" },
          ],
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "showThumbnails",
          label: "Miniatures",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "hoverEffect",
          label: "Effet au survol",
          type: "select",
          default: "none",
          options: [
            { value: "none", label: "Aucun" },
            { value: "zoom", label: "Zoom" },
            { value: "scale", label: "échelle" },
            { value: "overlay", label: "Overlay" },
          ],
          changeProp: 1,
          category: "content",
          section: "Effets",
        },

        // ==================== STYLE TAB ====================
        {
          name: "heightMode",
          label: "Mode hauteur",
          type: "select",
          default: "auto",
          options: [
            { value: "auto", label: "Auto" },
            { value: "fixed", label: "Fixe" },
            { value: "aspect-ratio", label: "Ratio" },
          ],
          changeProp: 1,
          category: "style",
          section: "Dimensions",
        },
        {
          name: "fixedHeight",
          label: "Hauteur fixe (px)",
          type: "number",
          default: 300,
          min: 100,
          max: 800,
          changeProp: 1,
          category: "style",
          section: "Dimensions",
        },
        {
          name: "aspectRatio",
          label: "Ratio d'aspect",
          type: "select",
          default: "16/9",
          options: [
            { value: "16/9", label: "16:9" },
            { value: "4/3", label: "4:3" },
            { value: "3/4", label: "3:4" },
            { value: "1/1", label: "1:1" },
          ],
          changeProp: 1,
          category: "style",
          section: "Dimensions",
        },
        ...colorTraits({ prefix: "spArrow", fields: ["background", "text"], defaults: { background: "rgba(17,24,39,0.6)", text: "#ffffff" } }),
        ...colorTraits({ prefix: "spDot", fields: ["default", "active"], defaults: { default: "#cbd5e1", active: "#667eea" } }),
        ...borderTraits({ prefix: "spSlide", defaults: { color: "#e5e7eb", width: 0, style: "solid", radius: 8 } }),
        ...shadowTraits({ prefix: "spSlide", defaults: { color: "rgba(0,0,0,0.08)", blur: 12, spread: 0, x: 0, y: 4 } }),
        {
          name: "showCaption",
          label: "Afficher légendes",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Légendes",
        },
        {
          name: "captionPosition",
          label: "Position légende",
          type: "select",
          default: "bottom",
          options: [
            { value: "bottom", label: "Bas" },
            { value: "overlay", label: "Superposé" },
            { value: "top", label: "Haut" },
          ],
          changeProp: 1,
          category: "style",
          section: "Légendes",
        },

        // ==================== ADVANCED TAB ====================
        {
          name: "cssId",
          label: "CSS ID",
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
          name: "lazyLoad",
          label: "Lazy loading images",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "advanced",
          section: "Performance",
        },
        {
          name: "keyboardControl",
          label: "Navigation clavier",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "advanced",
          section: "Accessibilité",
        },
        {
          name: "customCSS",
          label: "CSS personnalisé",
          type: "textarea",
          default: "",
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
      ],
      components: [],
    },

    buildIfFresh() {
      if (this.components().length === 0) {
        this.syncPreview();
        this.syncConfig();
      }
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:title change:sliderType change:source change:items", this.syncPreview);
      this.on("change:slidesPerView change:slidesPerViewTablet change:slidesPerViewMobile change:spaceBetween change:centerMode change:loop change:transitionEffect change:animationSpeed change:autoplay change:autoplayDelay change:pauseOnHover change:showArrows change:arrowPosition change:arrowStyle change:showDots change:dotStyle change:showThumbnails change:hoverEffect change:heightMode change:fixedHeight change:aspectRatio change:showCaption change:captionPosition change:cssId change:cssClass change:lazyLoad change:keyboardControl change:customCSS change:limit", () => { this.syncConfig(); this.syncPreview(); });
      this.on("change:spArrowBackgroundColor change:spArrowTextColor change:spDotColor change:spDotActiveColor change:spSlideBorderColor change:spSlideBorderWidth change:spSlideBorderStyle change:spSlideBorderRadius change:spSlideShadowColor change:spSlideShadowBlur change:spSlideShadowX change:spSlideShadowY", this.updateStyles);
      attachPlaceholderContentListener(this, ["change:items change:source change:sliderType"]);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());

      const itemToComponentDef = (item, idx) => ({
        tagName: "div",
        attributes: { class: "sp-builder-slide", selectable: false, hoverable: false, editable: false },
        components: [
          ...(item.image ? [{ tagName: "img", attributes: { src: item.image, alt: item.title || `Slide ${idx + 1}`, loading: "lazy" } }] : []),
          { tagName: "div", attributes: { class: "sp-builder-caption" }, content: item.title || `Slide ${idx + 1}` },
        ],
      });
      if (typeof bindItemListSync === "function") {
        bindItemListSync(this, "items", ".sp-builder-preview", itemToComponentDef);
      }
    },

    onRemove() {
      this.off("change:title change:sliderType change:source change:items");
      this.off("change:slidesPerView change:slidesPerViewTablet change:slidesPerViewMobile change:spaceBetween change:centerMode change:loop change:transitionEffect change:animationSpeed change:autoplay change:autoplayDelay change:pauseOnHover change:showArrows change:arrowPosition change:arrowStyle change:showDots change:dotStyle change:showThumbnails change:hoverEffect change:heightMode change:fixedHeight change:aspectRatio change:showCaption change:captionPosition change:cssId change:cssClass change:lazyLoad change:keyboardControl change:customCSS change:limit");
      this.off("change:spArrowBackgroundColor change:spArrowTextColor change:spDotColor change:spDotActiveColor change:spSlideBorderColor change:spSlideBorderWidth change:spSlideBorderStyle change:spSlideBorderRadius change:spSlideShadowColor change:spSlideShadowBlur change:spSlideShadowX change:spSlideShadowY");
    },

    syncPreview() {
      const existingPreview = this.find(".sp-builder-preview")[0];
      if (!existingPreview) {
        this.append({ tagName: "div", attributes: { class: "sp-builder-preview" }, droppable: false });
      }
      this.syncConfig();
    },

    syncConfig() {
      const isManual = (this.get("source") || "manual") === "manual";
      const config = {
        widgetId: "slider-pro",
        configVersion: 1,
        title: this.get("title") || "",
        sliderType: this.get("sliderType") || "image",
        source: this.get("source") || "manual",
        limit: Number(this.get("limit")) || 8,
        items: isManual && Array.isArray(this.get("items")) ? this.get("items") : [],
        slidesPerView: { desktop: Number(this.get("slidesPerView")) || 1, tablet: Number(this.get("slidesPerViewTablet")) || 1, mobile: Number(this.get("slidesPerViewMobile")) || 1 },
        spaceBetween: { desktop: Number(this.get("spaceBetween")) || 0, tablet: Number(this.get("spaceBetween")) || 0, mobile: Number(this.get("spaceBetween")) || 0 },
        loop: this.get("loop") !== false,
        centerMode: this.get("centerMode") || false,
        transitionEffect: this.get("transitionEffect") || "slide",
        animationSpeed: Number(this.get("animationSpeed")) || 400,
        autoplay: this.get("autoplay") || false,
        autoplayDelay: Number(this.get("autoplayDelay")) || 4000,
        pauseOnHover: this.get("pauseOnHover") !== false,
        showArrows: this.get("showArrows") !== false,
        arrowPosition: this.get("arrowPosition") || "center",
        arrowStyle: this.get("arrowStyle") || "circle",
        showDots: this.get("showDots") !== false,
        dotStyle: this.get("dotStyle") || "circle",
        showThumbnails: this.get("showThumbnails") || false,
        hoverEffect: this.get("hoverEffect") || "none",
        heightMode: this.get("heightMode") || "auto",
        fixedHeight: Number(this.get("fixedHeight")) || 300,
        aspectRatio: this.get("aspectRatio") || null,
        showCaption: this.get("showCaption") !== false,
        captionPosition: this.get("captionPosition") || "bottom",
        lazyLoad: this.get("lazyLoad") !== false,
        keyboardControl: this.get("keyboardControl") !== false,
        cssId: this.get("cssId") || "",
        cssClass: this.get("cssClass") || "",
        customCSS: this.get("customCSS") || "",
      };
      syncWidgetPlaceholder(this, config);
    },

    updateStyles() {
      const el = this.view?.el;
      if (!el) return;
      applyColorStyle(el, this, { prefix: "spArrow", selector: ".sp-builder-slide", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "spSlide", selector: ".slider-pro-component" });
      applyShadowStyle(el, this, { prefix: "spSlide", selector: ".slider-pro-component" });
      el.style.setProperty("--sp-dot-default", this.get("spDotColor") || "#cbd5e1");
      el.style.setProperty("--sp-dot-active", this.get("spDotActiveColor") || "#667eea");
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:spArrowBackgroundColor change:spArrowTextColor change:spDotColor change:spDotActiveColor change:spSlideBorderColor change:spSlideBorderWidth change:spSlideBorderStyle change:spSlideBorderRadius change:spSlideShadowColor change:spSlideShadowBlur change:spSlideShadowX change:spSlideShadowY", () => this.model.updateStyles());
    },
    onRender() {
      this.model.updateStyles();
    },
  },
};
