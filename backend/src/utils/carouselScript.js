/**
 * buildCarouselScript  injects Swiper.js (CDN) + initializes all
 * .carousel-pro-component elements on the storefront.
 *
 * The builder block emits data-* attributes on each carousel root;
 * this script reads them and instantiates a Swiper instance per carousel.
 *
 * Loaded ONLY when the page contains at least one carousel.
 */
function buildCarouselScript() {
  return `<script>
(function(){
  if (typeof window === "undefined") return;
  var CAROUSEL_SELECTOR = ".carousel-pro-component";
  var nodes = document.querySelectorAll(CAROUSEL_SELECTOR);
  if (!nodes.length) return;

  var hasSwiper = typeof window.Swiper === "function";

  function initOne(root) {
    if (root.__swiperInit) return;
    root.__swiperInit = true;

    var json = root.getAttribute("data-swiper-config");
    var cfg = {};
    try { cfg = json ? JSON.parse(json) : {}; } catch(e) { cfg = {}; }

    var track = root.querySelector(".swiper-wrapper");
    if (!track) return;
    var slides = track.querySelectorAll(":scope > .swiper-slide");
    if (!slides.length) return;

    var modules = [];
    if (cfg.navigation) modules.push("Navigation");
    if (cfg.pagination) modules.push("Pagination");
    if (cfg.scrollbar) modules.push("Scrollbar");
    if (cfg.autoplay && cfg.autoplay.delay) modules.push("Autoplay");
    if (cfg.effect && cfg.effect !== "slide") modules.push("Effect" + cfg.effect.charAt(0).toUpperCase() + cfg.effect.slice(1));
    if (cfg.thumbs) modules.push("Thumbs");
    if (cfg.controller) modules.push("Controller");
    if (cfg.virtual) modules.push("Virtual");
    if (cfg.keyboard) modules.push("Keyboard");
    if (cfg.a11y) modules.push("A11Y");
    if (cfg.zoom) modules.push("Zoom");

    var swiperConfig = {
      init: false,
      slidesPerView: cfg.slidesPerView || 1,
      spaceBetween: cfg.spaceBetween || 0,
      loop: cfg.loop !== false,
      speed: cfg.speed || 400,
      centeredSlides: cfg.centeredSlides || false,
      grabCursor: cfg.grabCursor !== false,
      breakpoints: cfg.breakpoints || undefined,
      modules: modules.map(function(name){ return window.Swiper && window.Swiper[name]; }).filter(Boolean)
    };

    if (cfg.navigation !== false) {
      var prevBtn = root.querySelector(".carousel-pro-prev");
      var nextBtn = root.querySelector(".carousel-pro-next");
      swiperConfig.navigation = {
        prevEl: prevBtn || ".carousel-pro-prev",
        nextEl: nextBtn || ".carousel-pro-next"
      };
    }

    if (cfg.pagination !== false) {
      var dotsWrap = root.querySelector(".carousel-pro-dots");
      swiperConfig.pagination = {
        el: dotsWrap || ".carousel-pro-dots",
        clickable: true,
        type: cfg.paginationType || "bullets",
        renderBullet: function(index, className) {
          return '<button type="button" class="' + className + '" aria-label="Slide ' + (index + 1) + '"></button>';
        }
      };
    }

    if (cfg.scrollbar) {
      var sb = root.querySelector(".carousel-pro-scrollbar");
      swiperConfig.scrollbar = { el: sb || ".carousel-pro-scrollbar", draggable: true };
    }

    if (cfg.autoplay && cfg.autoplay.delay) {
      swiperConfig.autoplay = {
        delay: cfg.autoplay.delay,
        disableOnInteraction: cfg.autoplay.disableOnInteraction !== false,
        pauseOnMouseEnter: cfg.autoplay.pauseOnMouseEnter !== false
      };
    }

    if (cfg.effect && cfg.effect !== "slide") {
      swiperConfig.effect = cfg.effect;
      if (cfg.effect === "coverflow") {
        swiperConfig.coverflowEffect = { rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true };
      }
      if (cfg.effect === "cards") {
        swiperConfig.cardsEffect = { slideShadows: true, transformEl: null };
      }
    }

    if (cfg.lazy) {
      swiperConfig.lazy = { loadPrevNext: true, loadPrevNextAmount: 2 };
    }

    if (cfg.zoom) { swiperConfig.zoom = { maxRatio: 3, minRatio: 1 }; }

    if (cfg.keyboard) { swiperConfig.keyboard = { enabled: true, onlyInViewport: true }; }

    if (cfg.a11y !== false) {
      swiperConfig.a11y = {
        enabled: true,
        prevSlideMessage: "Slide précédent",
        nextSlideMessage: "Slide suivant",
        firstSlideMessage: "Premier slide",
        lastSlideMessage: "Dernier slide",
        paginationBulletMessage: "Aller au slide {{index}}"
      };
    }

    try {
      var instance = new window.Swiper(root, swiperConfig);
      instance.init();
      root.__swiper = instance;

      root.addEventListener("keydown", function(e) {
        if (e.key === "ArrowLeft") instance.slidePrev();
        if (e.key === "ArrowRight") instance.slideNext();
      });

      if (cfg.pauseOnHover && cfg.autoplay) {
        root.addEventListener("mouseenter", function() { instance.autoplay.stop(); });
        root.addEventListener("mouseleave", function() { instance.autoplay.start(); });
      }
    } catch(err) {
      if (typeof console !== "undefined") console.warn("Swiper init failed:", err);
    }
  }

  function loadSwiperThenInit() {
    if (hasSwiper) {
      nodes.forEach(initOne);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swiper@11.2.2/swiper-bundle.min.mjs";
    script.onload = function() {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://cdn.jsdelivr.net/npm/swiper@11.2.2/swiper-bundle.min.css";
      css.onload = function() { nodes.forEach(initOne); };
      css.onerror = function() { nodes.forEach(initOne); };
      document.head.appendChild(css);
    };
    script.onerror = function() {
      if (typeof console !== "undefined") console.warn("Swiper CDN failed, carousel will be static.");
    };
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSwiperThenInit);
  } else {
    loadSwiperThenInit();
  }
})();
</script>`;
}

module.exports = { buildCarouselScript };
