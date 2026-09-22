/**
 * Counter Block  number that animates from 0 to a target value when scrolled
 * into view. Reuses the storefront IntersectionObserver (data-counter-target).
 */

import { colorTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyTypographyStyle } from "../../traits/utils/applyCommonStyles";

export const CounterBlock = {
  id: "counter-block",
  label: "=" Counter",
  category: "Content",
  content: {
    type: "counter-component",
  },
  attributes: { class: "fa fa-sort-numeric-up" },
};

export const CounterComponent = {
  isComponent: (el) => el.classList && el.classList.contains("counter-component"),
  model: {
    defaults: {
      type: "counter-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "counter-component", "data-counter-target": "100", "data-counter-duration": "2000", "data-counter-suffix": "" },
      styles: `
        .counter-component {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: var(--counter-font-size, 48px);
          font-weight: var(--counter-font-weight, 800);
          color: var(--counter-text-color, #667eea);
          text-align: center;
          padding: 24px;
          line-height: 1.1;
        }
      `,
      content: "0",
      components: [
        { tagName: "div", attributes: { class: "counter-component", selectable: false, hoverable: false, editable: false }, content: "0" },
      ],
      traits: [
        {
          name: "targetValue",
          label: "Valeur cible",
          type: "number",
          default: 100,
          min: 0,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "duration",
          label: "Duré (ms)",
          type: "number",
          default: 2000,
          min: 100,
          max: 10000,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "suffix",
          label: "Suffixe",
          type: "text",
          default: "",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "alignment",
          label: "Alignement",
          type: "select",
          default: "center",
          options: [
            { id: "left", label: "Gauche" },
            { id: "center", label: "Centré" },
            { id: "right", label: "Droite" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        ...colorTraits({ prefix: "counter", fields: ["text"], defaults: { text: "#667eea" }, section: "Couleurs" }),
        ...typographyTraits({ prefix: "counter", defaults: { size: 48, weight: "800", transform: "none" }, section: "Typographie" }),
        {
          name: "letterSpacing",
          label: "Espacement lettres (px)",
          type: "number",
          default: 0,
          min: -2,
          max: 10,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:targetValue change:duration change:suffix change:alignment", this.updateAttributes);
      this.on("change:counterTextColor change:counterFontSize change:counterFontWeight change:counterTextTransform change:letterSpacing", this.updateStyles);
    },

    updateStyles() {
      const el = this.view?.el;
      if (el) {
        applyColorStyle(el, this, { prefix: "counter", selector: ".counter-component", fields: ["text"] });
        applyTypographyStyle(el, this, { prefix: "counter", selector: ".counter-component" });
        el.style.letterSpacing = `${this.get("letterSpacing") || 0}px`;
      }
    },

    updateAttributes() {
      const attrs = this.getAttributes();
      attrs["data-counter-target"] = String(this.get("targetValue") ?? 0);
      attrs["data-counter-duration"] = String(this.get("duration") ?? 2000);
      attrs["data-counter-suffix"] = String(this.get("suffix") ?? "");
      this.setAttributes(attrs);

      const el = this.view?.el;
      if (el) {
        el.style.textAlign = this.get("alignment") || "center";
        el.textContent = `0${this.get("suffix") || ""}`;
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:targetValue change:duration change:suffix change:alignment", () => this.model.updateAttributes());
      this.listenTo(this.model, "change:counterTextColor change:counterFontSize change:counterFontWeight change:counterTextTransform change:letterSpacing", () => this.model.updateStyles());
    },
    onRender() {
      this.model.updateAttributes();
      this.model.updateStyles();
    },
  },
};
