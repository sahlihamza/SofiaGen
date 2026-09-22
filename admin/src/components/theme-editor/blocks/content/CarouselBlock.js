/**
 * CarouselBlock  Pro carousel widget for the visual builder.
 *
 * Uses Swiper.js (loaded on storefront via CDN) for GPU-accelerated
 * transitions, touch/swipe, keyboard nav, ARIA, autoplay, and effects.
 *
 * Builder emits:
 *   <div class="carousel-pro-component" data-swiper-config='{...}'>
 *     <div class="swiper-wrapper">
 *       <div class="swiper-slide">...</div>
 *     </div>
 *     <div class="carousel-pro-prev"></div>
 *     <div class="carousel-pro-next"></div>
 *     <div class="carousel-pro-dots"></div>
 *   </div>
 *
 * Runtime: backend/src/utils/carouselScript.js (Swiper init)
 */

import { colorTraits, borderTraits, shadowTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle, applyShadowStyle } from "../../traits/utils/applyCommonStyles";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect fill='%23f3f4f6' width='400' height='250'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESlide%3C/text%3E%3C/svg%3E";

export const CarouselBlock = {
  id: "carousel-pro-block",
  label: "< Carousel Pro",
  category: "Sections",
  content: { type: "carousel-pro-component" },
  attributes: { class: "fa fa-images" },
};

export const CarouselComponent = {
  isComponent: (el) => el.classList && el.classList.contains("carousel-pro-component"),

  model: {
    defaults: {
      type: "carousel-pro-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: {
        class: "carousel-pro-component",
        "data-widget": "carousel-pro",
        "data-swiper-config": '{"slidesPerView":1,"spaceBetween":0,"loop":true,"speed":400,"autoplay":{"delay":4000}}',
        "data-placeholder-content": "true",
      },

      styles: `
        .carousel-pro-component { position: relative; width: 100%; overflow: hidden; box-sizing: border-box; }
        .carousel-pro-component .swiper-wrapper { display: flex; }
        .carousel-pro-component .swiper-slide { flex-shrink: 0; width: 100%; box-sizing: border-box; padding: 20px; min-height: 80px; background: #fff; border: var(--cp-slide-border-width, 0px) var(--cp-slide-border-style, solid) var(--cp-slide-border-color, transparent); border-radius: var(--cp-slide-border-radius, 0px); overflow: hidden; }
        .carousel-pro-component .swiper-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .carousel-pro-component .slide-placeholder { text-align: center; color: #9ca3af; padding: 40px 0; }
        .carousel-pro-prev, .carousel-pro-next {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
          background: var(--cp-arrow-bg, rgba(17,24,39,0.6)); color: var(--cp-arrow-text, #fff); border: none;
          width: var(--cp-arrow-size, 44px); height: var(--cp-arrow-size, 44px); border-radius: 50%; cursor: pointer;
          font-size: calc(var(--cp-arrow-size, 44px) * 0.5); display: flex; align-items: center; justify-content: center;
          transition: opacity 0.2s, background 0.2s;
        }
        .carousel-pro-prev { left: 10px; }
        .carousel-pro-next { right: 10px; }
        .carousel-pro-prev:hover, .carousel-pro-next:hover { opacity: 0.85; }
        .carousel-pro-dots { display: flex; justify-content: center; gap: 8px; padding: 12px 0; position: relative; z-index: 10; }
        .carousel-pro-dots .swiper-pagination-bullet { width: var(--cp-dot-size, 10px); height: var(--cp-dot-size, 10px); border-radius: 50%; border: none; background: var(--cp-dot-default, #cbd5e1); cursor: pointer; padding: 0; opacity: 1; transition: background 0.2s; }
        .carousel-pro-dots .swiper-pagination-bullet-active { background: var(--cp-dot-active, #667eea); }
        .carousel-pro-scrollbar { position: relative; margin-top: 8px; height: 4px; background: #e5e7eb; border-radius: 2px; }
        .carousel-pro-component .swiper-slide-shadow-left, .carousel-pro-component .swiper-slide-shadow-right { background: rgba(0,0,0,0.2); }
      `,

      traits: [
        // ==================== CONTENT TAB ====================
        {
          name: "slides",
          label: "Slides",
          type: "item-list",
          changeProp: 1,
          itemSchema: [
            { key: "image", label: "Image URL", type: "media-picker" },
            { key: "title", label: "Titre", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "link", label: "Lien", type: "text" },
            { key: "videoUrl", label: "Vidéo (YouTube/Vimeo/MP4)", type: "text" },
          ],
          default: [
            { image: placeholderImage, title: "Slide 1", description: "Première diapositive" },
            { image: placeholderImage, title: "Slide 2", description: "Deuxiéme diapositive" },
            { image: placeholderImage, title: "Slide 3", description: "Troisiéme diapositive" },
          ],
          category: "content",
          section: "Slides",
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
          name: "effect",
          label: "Effet de transition",
          type: "select",
          default: "slide",
          options: [
            { value: "slide", label: "Slide" },
            { value: "fade", label: "Fade" },
            { value: "coverflow", label: "Coverflow" },
            { value: "cube", label: "Cube" },
            { value: "flip", label: "Flip" },
            { value: "cards", label: "Cards" },
          ],
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
          name: "centeredSlides",
          label: "Slides centrés",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Layout",
        },
        {
          name: "speed",
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
          default: true,
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
          name: "showDots",
          label: "Points de pagination",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "showScrollbar",
          label: "Scrollbar",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Navigation",
        },
        {
          name: "lazyLoading",
          label: "Lazy loading images",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Performance",
        },
        {
          name: "grabCursor",
          label: "Curseur grab",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Performance",
        },
        {
          name: "keyboardNav",
          label: "Navigation clavier",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "content",
          section: "Accessibilité",
        },

        // ==================== STYLE TAB ====================
        {
          name: "slideHeight",
          label: "Hauteur slide (px)",
          type: "number",
          default: 300,
          min: 100,
          max: 800,
          changeProp: 1,
          category: "style",
          section: "Dimensions",
        },
        ...colorTraits({ prefix: "cpArrow", fields: ["background", "text"], defaults: { background: "rgba(17,24,39,0.6)", text: "#ffffff" } }),
        {
          name: "arrowSize",
          label: "Taille fléches (px)",
          type: "number",
          default: 44,
          min: 24,
          max: 80,
          changeProp: 1,
          category: "style",
          section: "Fléches",
        },
        ...colorTraits({ prefix: "cpDot", fields: ["default", "active"], defaults: { default: "#cbd5e1", active: "#667eea" } }),
        {
          name: "dotSize",
          label: "Taille points (px)",
          type: "number",
          default: 10,
          min: 6,
          max: 20,
          changeProp: 1,
          category: "style",
          section: "Pagination",
        },
        ...borderTraits({ prefix: "cpSlide", defaults: { color: "#e5e7eb", width: 0, style: "solid", radius: 12 } }),
        ...shadowTraits({ prefix: "cpSlide", defaults: { color: "rgba(0,0,0,0.08)", blur: 12, spread: 0, x: 0, y: 4 } }),
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
          name: "zoomEnabled",
          label: "Zoom image au clic",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "freeMode",
          label: "Mode libre (scroll snap)",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
      ],
      components: [],
    },

    buildIfFresh() {
      if (this.components().length === 0) {
        this.syncSlides();
        this.syncControls();
        this.syncConfig();
      }
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:slides", this.syncSlides);
      this.on("change:showArrows change:showDots change:showScrollbar", this.syncControls);
      this.on("change:slidesPerView change:slidesPerViewTablet change:slidesPerViewMobile change:spaceBetween change:effect change:loop change:centeredSlides change:speed change:autoplay change:autoplayDelay change:pauseOnHover change:lazyLoading change:grabCursor change:keyboardNav change:zoomEnabled change:freeMode", () => { this.syncConfig(); this.syncSlides(); });
      this.on("change:slideHeight change:showCaption change:captionPosition", this.updateSlideStyles);
      this.on("change:cpArrowBackgroundColor change:cpArrowIconColor change:arrowSize change:cpDotColor change:cpDotActiveColor change:dotSize change:cpSlideBorderColor change:cpSlideBorderWidth change:cpSlideBorderStyle change:cpSlideBorderRadius change:cpSlideShadowColor change:cpSlideShadowBlur change:cpSlideShadowX change:cpSlideShadowY", this.updateCarouselStyles);
      attachPlaceholderContentListener(this, ["change:slides"]);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());

      const itemToComponentDef = (item, idx) => {
        const children = [];
        if (item.image) {
          children.push({
            tagName: "img",
            attributes: { src: item.image, alt: item.title || `Slide ${idx + 1}`, class: "slide-image", loading: "lazy", selectable: false, hoverable: false, editable: false },
          });
        }
        if (item.title || item.description) {
          const capChildren = [];
          if (item.title) capChildren.push({ tagName: "h3", attributes: { class: "slide-title", selectable: false, hoverable: false, editable: false }, content: item.title });
          if (item.description) capChildren.push({ tagName: "p", attributes: { class: "slide-desc", selectable: false, hoverable: false, editable: false }, content: item.description });
          children.push({ tagName: "div", attributes: { class: "slide-caption", selectable: false, hoverable: false, editable: false }, components: capChildren });
        }
        if (children.length === 0) {
          children.push({ tagName: "div", attributes: { class: "slide-placeholder", selectable: false, hoverable: false, editable: false }, content: `Slide ${idx + 1}` });
        }
        return {
          tagName: "div",
          attributes: { class: "swiper-slide", "data-gjs-droppable": "true", "data-gjs-type": "swiper-slide" },
          droppable: true,
          components: children,
        };
      };
      if (typeof bindItemListSync === "function") {
        bindItemListSync(this, "slides", ".swiper-wrapper", itemToComponentDef);
      }
    },

    onRemove() {
      this.off("change:slides change:showArrows change:showDots change:showScrollbar");
      this.off("change:slidesPerView change:slidesPerViewTablet change:slidesPerViewMobile change:spaceBetween change:effect change:loop change:centeredSlides change:speed change:autoplay change:autoplayDelay change:pauseOnHover change:lazyLoading change:grabCursor change:keyboardNav change:zoomEnabled change:freeMode");
      this.off("change:slideHeight change:showCaption change:captionPosition");
      this.off("change:cpArrowBackgroundColor change:cpArrowIconColor change:arrowSize change:cpDotColor change:cpDotActiveColor change:dotSize change:cpSlideBorderColor change:cpSlideBorderWidth change:cpSlideBorderStyle change:cpSlideBorderRadius change:cpSlideShadowColor change:cpSlideShadowBlur change:cpSlideShadowX change:cpSlideShadowY");
    },

    syncSlides() {
      const existingWrapper = this.find(".swiper-wrapper")[0];
      if (!existingWrapper) {
        this.append({ tagName: "div", attributes: { class: "swiper-wrapper" }, droppable: false });
      }
      this.syncControls();
      this.syncConfig();
    },

    syncControls() {
      this.components()
        .filter((c) => {
          const cls = c.getClasses?.() || [];
          return cls.includes("carousel-pro-prev") || cls.includes("carousel-pro-next") || cls.includes("carousel-pro-dots") || cls.includes("carousel-pro-scrollbar");
        })
        .forEach((c) => c.remove());

      if (this.get("showArrows")) {
        this.append({ tagName: "button", attributes: { type: "button", class: "carousel-pro-prev", "aria-label": "Slide précédent" }, content: "9", droppable: false });
        this.append({ tagName: "button", attributes: { type: "button", class: "carousel-pro-next", "aria-label": "Slide suivant" }, content: ":", droppable: false });
      }

      if (this.get("showDots")) {
        this.append({ tagName: "div", attributes: { class: "carousel-pro-dots", role: "tablist" }, droppable: false });
      }

      if (this.get("showScrollbar")) {
        this.append({ tagName: "div", attributes: { class: "carousel-pro-scrollbar" }, droppable: false });
      }
    },

    syncConfig() {
      const config = {
        widgetId: "carousel-pro",
        configVersion: 1,
        slides: Array.isArray(this.get("slides")) ? this.get("slides") : [],
        slidesPerView: Number(this.get("slidesPerView")) || 1,
        slidesPerViewTablet: Number(this.get("slidesPerViewTablet")) || 1,
        slidesPerViewMobile: Number(this.get("slidesPerViewMobile")) || 1,
        spaceBetween: Number(this.get("spaceBetween")) || 0,
        loop: this.get("loop") !== false,
        speed: Number(this.get("speed")) || 400,
        centeredSlides: this.get("centeredSlides") || false,
        effect: this.get("effect") || "slide",
        grabCursor: this.get("grabCursor") !== false,
        lazyLoading: this.get("lazyLoading") !== false,
        keyboardNav: this.get("keyboardNav") !== false,
        zoomEnabled: this.get("zoomEnabled") || false,
        freeMode: this.get("freeMode") || false,
        showArrows: this.get("showArrows") !== false,
        showDots: this.get("showDots") !== false,
        showScrollbar: this.get("showScrollbar") || false,
        autoplay: this.get("autoplay") !== false,
        autoplayDelay: Number(this.get("autoplayDelay")) || 4000,
        pauseOnHover: this.get("pauseOnHover") !== false,
        captionPosition: this.get("captionPosition") || "bottom",
        arrowBg: this.get("cpArrowBackgroundColor") || "rgba(17,24,39,0.6)",
        arrowColor: this.get("cpArrowIconColor") || "#ffffff",
        arrowSize: Number(this.get("arrowSize")) || 44,
        dotColor: this.get("cpDotColor") || "#cbd5e1",
        dotActiveColor: this.get("cpDotActiveColor") || "#667eea",
        dotSize: Number(this.get("dotSize")) || 10,
        cssId: this.get("cssId") || "",
        cssClass: this.get("cssClass") || "",
      };
      const attrs = this.getAttributes();
      attrs["data-swiper-config"] = JSON.stringify({
        slidesPerView: config.slidesPerView,
        spaceBetween: config.spaceBetween,
        loop: config.loop,
        speed: config.speed,
        centeredSlides: config.centeredSlides,
        effect: config.effect,
        grabCursor: config.grabCursor,
        lazy: config.lazyLoading,
        keyboard: config.keyboardNav,
        a11y: true,
        zoom: config.zoomEnabled,
        freeMode: config.freeMode,
        navigation: config.showArrows,
        pagination: config.showDots,
        paginationType: "bullets",
        scrollbar: config.showScrollbar,
        autoplay: config.autoplay ? {
          delay: config.autoplayDelay,
          disableOnInteraction: false,
          pauseOnMouseEnter: config.pauseOnHover,
        } : false,
        pauseOnHover: config.pauseOnHover,
        breakpoints: {
          640: { slidesPerView: config.slidesPerViewMobile, spaceBetween: config.spaceBetween },
          768: { slidesPerView: config.slidesPerViewTablet, spaceBetween: config.spaceBetween },
          1024: { slidesPerView: config.slidesPerView, spaceBetween: config.spaceBetween },
        },
      });
      this.setAttributes(attrs);
      syncWidgetPlaceholder(this, config);
    },

    updateSlideStyles() {
      const el = this.view?.el;
      if (!el) return;
      const height = this.get("slideHeight") || 300;
      const showCaption = this.get("showCaption");
      const capPos = this.get("captionPosition") || "bottom";

      el.querySelectorAll(".swiper-slide").forEach((slide) => {
        slide.style.minHeight = `${height}px`;
        const img = slide.querySelector(".slide-image");
        if (img) img.style.height = `${height}px`;

        const caption = slide.querySelector(".slide-caption");
        if (caption) {
          caption.style.display = showCaption === false ? "none" : "";
          if (capPos === "overlay") {
            caption.style.position = "absolute";
            caption.style.bottom = "0";
            caption.style.left = "0";
            caption.style.right = "0";
            caption.style.background = "linear-gradient(transparent, rgba(0,0,0,0.7))";
            caption.style.color = "#fff";
            caption.style.padding = "16px";
          } else {
            caption.style.position = "";
            caption.style.background = "";
            caption.style.color = "";
            caption.style.padding = "";
          }
        }
      });
    },

    updateCarouselStyles() {
      const el = this.view?.el;
      if (!el) return;
      const arrowBg = this.get("cpArrowBackgroundColor") || "rgba(17,24,39,0.6)";
      const arrowColor = this.get("cpArrowIconColor") || "#ffffff";
      const arrowSize = this.get("arrowSize") || 44;
      const dotColor = this.get("cpDotColor") || "#cbd5e1";
      const dotActiveColor = this.get("cpDotActiveColor") || "#667eea";
      const dotSize = this.get("dotSize") || 10;

      el.style.setProperty("--cp-arrow-bg", arrowBg);
      el.style.setProperty("--cp-arrow-text", arrowColor);
      el.style.setProperty("--cp-arrow-size", `${arrowSize}px`);
      el.style.setProperty("--cp-dot-default", dotColor);
      el.style.setProperty("--cp-dot-active", dotActiveColor);
      el.style.setProperty("--cp-dot-size", `${dotSize}px`);

      applyColorStyle(el, this, { prefix: "cpArrow", selector: ".carousel-pro-prev, .carousel-pro-next", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "cpSlide", selector: ".swiper-slide" });
      applyShadowStyle(el, this, { prefix: "cpSlide", selector: ".swiper-slide" });

      const slideBorder = this.get("cpSlideBorder");
      if (slideBorder && typeof slideBorder === "object") {
        const col = slideBorder.color ?? this.get("cpSlideBorderColor") ?? "transparent";
        const w = slideBorder.width ?? this.get("cpSlideBorderWidth") ?? 0;
        const st = slideBorder.style ?? this.get("cpSlideBorderStyle") ?? "solid";
        const r = slideBorder.radius ?? this.get("cpSlideBorderRadius") ?? 0;
        el.style.setProperty("--cp-slide-border-color", col);
        el.style.setProperty("--cp-slide-border-width", `${w}px`);
        el.style.setProperty("--cp-slide-border-style", st);
        el.style.setProperty("--cp-slide-border-radius", `${r}px`);
      }

      this.updateSlideStyles();
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:slideHeight change:showCaption change:captionPosition", () => this.model.updateSlideStyles());
      this.listenTo(this.model, "change:cpArrowBackgroundColor change:cpArrowIconColor change:arrowSize change:cpDotColor change:cpDotActiveColor change:dotSize change:cpSlideBorderColor change:cpSlideBorderWidth change:cpSlideBorderStyle change:cpSlideBorderRadius change:cpSlideShadowColor change:cpSlideShadowBlur change:cpSlideShadowX change:cpSlideShadowY", () => this.model.updateCarouselStyles());
    },
    onRender() {
      this.model.updateCarouselStyles();
      this.model.updateSlideStyles();
    },
  },
};
