/**
 * Section Block - page section wrapper with background controls
 */

import { colorTraits, spacingTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle } from "../../traits/utils/applyCommonStyles";

export const SectionBlock = {
  id: "section-block",
  label: " Section",
  category: "Base",
  content: {
    type: "section-component",
  },
  attributes: { class: "fa fa-square" },
};

export const SectionComponent = {
  isComponent: (el) => el.classList && el.classList.contains("section-component"),
  model: {
    defaults: {
      type: "section-component",
      tagName: "section",
      draggable: true,
      droppable: true,
      attributes: { class: "section-component" },
      styles: `
        .section-component {
          width: 100%;
          padding: var(--section-padding, 60px) 20px;
          box-sizing: border-box;
          background-color: var(--section-background, var(--ts-color-surface, #ffffff));
          color: var(--ts-color-text-primary, #111827);
        }
      `,
      traits: [
        ...colorTraits({ prefix: "section", fields: ["background"], defaults: { background: "var(--ts-color-surface, #ffffff)" } }),
        ...spacingTraits({ prefix: "section", defaults: { padding: 60 } }),
        {
          name: "overlayOpacity",
          label: "Opacité de l'arrière-plan",
          type: "number",
          default: 1,
          min: 0,
          max: 1,
          step: 0.05,
          changeProp: 1,
          category: "style",
          section: "Arrière-plan",
        },
        {
          name: "parallaxIntensity",
          label: "Intensité Parallax",
          type: "number",
          default: 0,
          min: 0,
          max: 100,
          changeProp: 1,
          category: "style",
          section: "Parallax",
        },
      ],
      components: [
        {
          tagName: "div",
          attributes: { class: "section-inner" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            {
              tagName: "p",
              content: "Contenu de la section",
              selectable: false,
              hoverable: false,
              editable: false,
            },
          ],
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:sectionBackgroundColor", this.updateBackground);
      this.on("change:overlayOpacity", this.updateBackground);
      this.on("change:sectionPadding change:sectionSpacing", this.updatePadding);
      this.on("change:parallaxIntensity", this.updateParallax);
    },

    onRemove() {
      this.off("change:sectionBackgroundColor change:overlayOpacity change:sectionPadding change:sectionSpacing change:parallaxIntensity");
    },

    updateBackground() {
      const el = this.view?.el;
      if (!el) return;
      applyColorStyle(el, this, { prefix: "section", selector: ".section-component", fields: ["background"] });
      const opacity = this.get("overlayOpacity");
      el.style.opacity = opacity !== undefined ? opacity : 1;
    },

    updatePadding() {
      let value = this.get("sectionPadding") || 60;
      try {
        const composite = this.get("sectionSpacing");
        if (composite && composite.padding !== undefined) {
          value = composite.padding ?? value;
        }
      } catch (e) {}
      const el = this.view?.el;
      if (el) {
        el.style.paddingTop = `${value}px`;
        el.style.paddingBottom = `${value}px`;
      }
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
};

