/**
 * Hero Block - Full width banner with CTA
 * GrapesJS custom block with editable title, subtitle, CTA button and background image
 */

import { ImageTrait, HeightTrait, OpacityTrait, HoverEffectTrait, ClickEffectTrait, ScrollTriggerTrait, ScrollTriggerDelayTrait, ParallaxTrait } from "../../traits";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";
import { Button } from "@sofia/ui";

export const HeroBlock = {
  id: "hero-block",
  label: "ðŸŽ¯ Hero Section",

  category: "Sections",
  content: {
    type: "hero-component",
  },
  attributes: {
    class: "fa fa-image",
  },
};

/**
 * Hero Component - The actual draggable element
 */
export const HeroBlockComponent = {
  isComponent: (el) => {
    return el.classList && el.classList.contains("hero-component");
  },
  model: {
    defaults: {
      type: "hero-component",
      draggable: true,
      droppable: false,
      attributes: {
        class: "hero-component",
        "data-placeholder-content": "true",
      },
      styles: `
        .hero-component {
          min-height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--ts-color-text-primary, #1a1a1a);
          background-color: var(--ts-color-primary, #667eea);
          background-size: cover;
          background-position: center;
          position: relative;
          overflow: hidden;
        }

        .hero-component::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: var(--ts-container-width, 800px);
          padding: var(--ts-spacing-xl, 40px) var(--ts-spacing-lg, 24px);
        }

        .hero-title {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: var(--ts-font-size-2xl, 48px);
          font-weight: bold;
          margin-bottom: var(--ts-spacing-lg, 24px);
          line-height: var(--ts-line-height, 1.2);
          color: #ffffff;
        }

        .hero-subtitle {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: var(--ts-font-size-lg, 20px);
          margin-bottom: var(--ts-spacing-lg, 24px);
          line-height: var(--ts-line-height, 1.6);
          opacity: 0.9;
          color: #ffffff;
        }

        .hero-button {
          display: inline-block;
          padding: var(--ts-btn-padding, 14px 40px);
          background-color: var(--ts-btn-primary-bg, #667eea);
          color: var(--ts-btn-primary-text, #ffffff);
          text-decoration: none;
          border: none;
          border-radius: var(--ts-btn-radius, 8px);
          font-family: var(--ts-font-button, 'Inter', sans-serif);
          font-size: var(--ts-font-size-base, 16px);
          font-weight: 600;
          cursor: pointer;
          transition: opacity var(--ts-anim-speed, 200ms) var(--ts-anim-easing, ease);
        }

        .hero-button:hover {
          opacity: 0.85;
        }
      `,
      content: `
        <div class="hero-content">
          <h1 class="hero-title">Des collections mode inspirantes pour chaque occasion</h1>
          <p class="hero-subtitle">Livraison rapide, retours gratuits et offres exclusives sur tout le catalogue.</p>
          <Button class="hero-button">DÃ©couvrir la sÃ©lection</Button>

        </div>
      `,
      traits: [
        ImageTrait("backgroundImage", "Background Image"),
        HeightTrait("minHeight", "Height (px)", 500),
        OpacityTrait("overlayOpacity", "Overlay Opacity", 0.4),
        HoverEffectTrait(),
        ClickEffectTrait(),
        ScrollTriggerTrait(),
        ScrollTriggerDelayTrait(),
        ParallaxTrait(),
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      attachPlaceholderContentListener(this, ["change:content", "component:update"]);
      this.on("change:backgroundImage", this.updateBg);
      this.on("change:minHeight", this.updateHeight);
      this.on("change:overlayOpacity", this.updateOverlay);
      this.on("change:hoverEffect", this.updateHoverEffect);
      this.on("change:clickEffect", this.updateClickEffect);
      this.on("change:scrollAnimation", this.updateScrollTrigger);
      this.on("change:scrollDelay", this.updateScrollTrigger);
      this.on("change:parallaxIntensity", this.updateParallax);
    },

    onRemove() {
      this.off("change:backgroundImage change:minHeight change:overlayOpacity change:hoverEffect change:clickEffect change:scrollAnimation change:scrollDelay change:parallaxIntensity");
    },

    updateBg() {
      const url = this.get("backgroundImage");
      if (url) {
        this.view.el.style.backgroundImage = `url('${url}')`;
      }
    },

    updateHeight() {
      const height = this.get("minHeight");
      this.view.el.style.minHeight = `${height}px`;
    },

    updateOverlay() {
      const opacity = this.get("overlayOpacity");
      if (this.view.el) {
        this.view.el.style.setProperty("--overlay-opacity", opacity);
      }
    },

    updateHoverEffect() {
      const effect = this.get("hoverEffect");
      // Remove all hover-* classes
      this.removeClass("hover-lift hover-scale hover-glow hover-underline");
      if (effect && effect !== "none") {
        this.addClass(`hover-${effect}`);
      }
    },

    updateScrollTrigger() {
      const anim = this.get("scrollAnimation");
      const delay = this.get("scrollDelay");
      
      if (anim && anim !== "none") {
        this.addAttributes({ "data-scroll-animation": anim });
        if (delay > 0) {
          this.addAttributes({ "data-scroll-delay": delay });
        } else {
          const attrs = this.getAttributes();
          delete attrs["data-scroll-delay"];
          this.setAttributes(attrs);
        }
      } else {
        const attrs = this.getAttributes();
        delete attrs["data-scroll-animation"];
        delete attrs["data-scroll-delay"];
        this.setAttributes(attrs);
      }
    },

    updateClickEffect() {
      const effect = this.get("clickEffect");
      const attrs = this.getAttributes();
      if (effect) {
        attrs["data-click-effect"] = effect;
      } else {
        delete attrs["data-click-effect"];
      }
      this.setAttributes(attrs);
    },

    updateParallax() {
      const intensity = this.get("parallaxIntensity");
      const attrs = this.getAttributes();
      if (intensity > 0) {
        attrs["data-parallax"] = String(intensity);
      } else {
        delete attrs["data-parallax"];
      }
      this.setAttributes(attrs);
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:backgroundImage", this.updateBackground);
      this.listenTo(this.model, "change:minHeight", this.updateHeight);
    },

    updateBackground() {
      const url = this.model.get("backgroundImage");
      if (url) {
        this.el.style.backgroundImage = `url('${url}')`;
      }
    },

    updateHeight() {
      const height = this.model.get("minHeight");
      if (height) {
        this.el.style.minHeight = `${height}px`;
      }
    },
  },
};

