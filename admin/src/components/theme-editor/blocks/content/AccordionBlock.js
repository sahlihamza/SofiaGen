/**
 * Accordion Block  generic collapsible items. Each item has a title and a
 * droppable content area (free widgets). Distinct from FaqBlock, which is a
 * fixed question/answer section. Items edited via the reusable "listField" trait.
 *
 * Structure is built as MODEL components for correct server-side rendering.
 */

import { colorTraits, borderTraits, typographyTraits, animationTraits, gradientTraits, shadowTraits, transformTraits, backgroundImageTraits, withHoverVariant } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle, applyTypographyStyle, applyGradientStyle, applyShadowStyle, applyTransformStyle, applyBackgroundImageStyle } from "../../traits/utils/applyCommonStyles";
import { generateHoverCss, ensureInstanceStyleTag } from "../../traits/utils/generateHoverCss";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

export const AccordionBlock = {
  id: "accordion-block",
  label: "= Accordion",
  category: "Content",
  content: {
    type: "accordion-component",
  },
  attributes: { class: "fa fa-list-ul" },
};

const defaultItems = () => [
  {
    id: `acc-${Date.now()}`,
    title: "Quels sont les délais de livraison ?",
    content: "Ajoutez votre réponse ici.",
  },
  {
    id: `acc-${Date.now() + 1}`,
    title: "Puis-je retourner un article ?",
    content: "Ajoutez votre réponse ici.",
  },
  {
    id: `acc-${Date.now() + 2}`,
    title: "Comment suivre ma commande ?",
    content: "Ajoutez votre réponse ici.",
  },
];

export const AccordionComponent = {
  isComponent: (el) => el.classList && el.classList.contains("accordion-component"),
  model: {
      defaults: {
      type: "accordion-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "accordion-component", "data-placeholder-content": "true", "data-multiple-open": "false" },
      styles: `
        .accordion-component { width: 100%; display: flex; flex-direction: column; gap: var(--accordion-gap,8px); }
        .accordion-item { border: 1px solid var(--accordion-border-color,#e5e7eb); border-radius: var(--accordion-border-radius,8px); overflow: hidden; }
        .accordion-header {
          width: 100%;
          text-align: left;
          background: var(--accordion-header-bg,#f9fafb);
          padding: var(--accordion-header-pad,16px);
          font-size: var(--accordion-header-font-size,16px);
          font-weight: var(--accordion-header-font-weight,600);
          color: var(--accordion-header-color,#111827);
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-transform: var(--accordion-header-text-transform,none);
        }
        .accordion-header .chevron { transition: transform 0.2s, color 0.2s; color: var(--accordion-icon-color,#374151); font-size: var(--accordion-icon-size,18px); line-height: 1; }
        .accordion-item.open .accordion-header { background: var(--accordion-active-header-bg,#f0f1f3); color: var(--accordion-active-header-color,#111827); }
        .accordion-item.open .accordion-header .chevron { transform: rotate(180deg); color: var(--accordion-icon-active-color,#111827); }
        .accordion-body {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height var(--accordion-duration,300ms) ease, opacity var(--accordion-duration,300ms) ease, padding var(--accordion-duration,300ms) ease;
          padding: 0 var(--accordion-body-pad,16px);
          border-top: 1px solid var(--accordion-border-color,#e5e7eb);
          background: var(--accordion-body-bg,#ffffff);
          color: var(--accordion-body-color,#666666);
        }
        .accordion-item.open .accordion-body {
          max-height: 9999px;
          opacity: 1;
        }
      `,
      traits: [
        {
          name: "items",
          label: "Questions & Réponses",
          type: "list",
          changeProp: 1,
          default: defaultItems(),
          itemSchema: [
            { key: "title", label: "Question", type: "text" },
            { key: "content", label: "Contenu", type: "textarea" },
          ],
          category: "content",
        },
        {
          name: "icon_position",
          label: "Position icône",
          type: "select",
          options: [
            { value: "left", label: "Gauche" },
            { value: "right", label: "Droite" },
          ],
          default: "right",
          category: "style",
        },
        {
          name: "multiple_open",
          label: "Plusieurs ouverts",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
        },
        {
          name: "start_open_first",
          label: "Ouvrir le premier au départ",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "advanced",
        },
        ...withHoverVariant(colorTraits, { prefix: "header", fields: ["background", "text"], defaults: { background: "#f9fafb", text: "#111827" }, section: "En-tête" }),
        ...colorTraits({ prefix: "header", fields: ["activeBackground", "activeText"], defaults: { activeBackground: "#f0f1f3", activeText: "#111827" }, section: "En-tête" }),
        ...colorTraits({ prefix: "content", fields: ["background", "text"], defaults: { background: "#ffffff", text: "#666666" }, section: "Contenu" }),
        {
          name: "iconColor",
          label: "Couleur icône",
          type: "color",
          default: "#374151",
          changeProp: 1,
          category: "style",
        },
        {
          name: "iconActiveColor",
          label: "Couleur icône actif",
          type: "color",
          default: "#111827",
          changeProp: 1,
          category: "style",
        },
        {
          name: "iconSize",
          label: "Taille icône (px)",
          type: "number",
          default: 18,
          min: 8,
          max: 48,
          changeProp: 1,
          category: "style",
        },
        {
          name: "headerPadding",
          label: "Padding header (px)",
          type: "number",
          default: 16,
          min: 8,
          max: 40,
          changeProp: 1,
          category: "style",
        },
        {
          name: "bodyPadding",
          label: "Padding contenu (px)",
          type: "number",
          default: 16,
          min: 8,
          max: 40,
          changeProp: 1,
          category: "style",
        },
        ...shadowTraits({ prefix: "header", section: "Ombre" }),
        ...gradientTraits({ prefix: "header", section: "Dégradé" }),
        ...backgroundImageTraits({ prefix: "header", section: "Image de fond" }),
        ...transformTraits({ prefix: "header", section: "Transformation" }),
        ...borderTraits({ prefix: "", defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 8 }, section: "Bordure de l'item" }),
        ...typographyTraits({ prefix: "header", defaults: { size: 16, weight: "600", transform: "none" }, section: "Typographie" }),
        ...animationTraits({ defaults: { type: "slide", duration: 300 }, section: "Animation" }),
        {
          name: "itemGap",
          label: "Espace entre items (px)",
          type: "number",
          default: 8,
          min: 0,
          max: 64,
          changeProp: 1,
          category: "style",
        },
      ],
      components: [],
    },

    buildIfFresh() {
      if (this.components().length === 0) this.syncItems();
    },

    init() {
      this.on("change:items change:multiple_open change:start_open_first", this.syncItems);
      this.on("change:icon_position", this.syncItems);
      this.on("change:headerBackgroundColor change:activeHeaderBackgroundColor change:headerTextColor change:activeHeaderTextColor change:headerBackgroundColorHover change:headerTextColorHover change:headerPadding change:bodyPadding change:borderColor change:borderWidth change:borderStyle change:borderRadius change:contentBackgroundColor change:contentTextColor change:iconColor change:iconActiveColor change:iconSize change:headerFontSize change:headerFontWeight change:headerTextTransform change:animationType change:itemGap change:animation_duration change:animationDuration", this.updateAccordionStyles);

      if (this.get("animation_duration") !== undefined && this.get("animationDuration") === undefined) {
        this.set("animationDuration", this.get("animation_duration"));
      }

      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());

      attachPlaceholderContentListener(this, ["change:items"]);

      const resolveContentComponents = (content) =>
        Array.isArray(content)
          ? content.length
            ? content
            : [{ tagName: "p", content: "Contenu de l'accordéon. Ajoutez votre texte ici." }]
          : [{ tagName: "p", content: content || "Contenu de l'accordéon. Ajoutez votre texte ici." }];

      try {
        const iconPos = this.get("icon_position") || "right";
        const chevronFirst = iconPos === "left";
        const itemToComponentDef = (it, i) => {
          const isOpen = i === 0;
          const titleSpan = `<span>${it.title || `Élément ${i + 1}`}</span>`;
          const chevronSpan = `<span class="chevron"></span>`;
          const titleHtml = chevronFirst ? `${chevronSpan}${titleSpan}` : `${titleSpan}${chevronSpan}`;
          return {
            tagName: "div",
            attributes: {
              class: "accordion-item" + (isOpen ? " open" : ""),
              "data-acc-id": it.id || `acc-${Date.now() + i}`,
            },
            droppable: false,
            selectable: false,
            hoverable: false,
            components: [
              {
                tagName: "button",
                attributes: {
                  type: "button",
                  class: "accordion-header",
                  "aria-expanded": isOpen ? "true" : "false",
                  role: "button",
                  tabindex: "0",
                },
                content: titleHtml,
                selectable: false,
                hoverable: false,
                editable: false,
              },
              {
                tagName: "div",
                attributes: {
                  class: "accordion-body",
                  "data-gjs-droppable": "true",
                  "data-gjs-type": "accordion-body",
                  "aria-hidden": isOpen ? "false" : "true",
                },
                droppable: true,
                selectable: true,
                components: resolveContentComponents(it.content),
              },
            ],
          };
        };

        bindItemListSync && bindItemListSync(this, "items", ".accordion-wrapper", itemToComponentDef);
      } catch (e) {}
    },

    updateAccordionStyles() {
      const el = this.view?.el;
      if (!el) return;

      const headerBg = this.get("headerBackgroundColor") || "#f9fafb";
      const activeHeaderBg = this.get("activeHeaderBackgroundColor") || "#f0f1f3";
      const headerText = this.get("headerTextColor") || "#111827";
      const activeHeaderText = this.get("activeHeaderTextColor") || headerText;
      const headerPad = this.get("headerPadding") || 16;
      const bodyPad = this.get("bodyPadding") || 16;
      let borderCol = this.get("borderColor") || "#e5e7eb";
      let borderWidth = Number(this.get("borderWidth") || 1);
      let borderStyle = this.get("borderStyle") || "solid";
      let radius = this.get("borderRadius") || 8;
      const animDur = Number(this.get("animationDuration") || this.get("animation_duration") || 300);
      const animType = this.get("animationType") || "slide";
      const contentBg = this.get("contentBackgroundColor") || "#ffffff";
      const contentText = this.get("contentTextColor") || "#666666";
      const iconColor = this.get("iconColor") || "#374151";
      const iconActiveColor = this.get("iconActiveColor") || "#111827";
      const iconSize = Number(this.get("iconSize") || 18);
      const itemGap = Number(this.get("itemGap") || 8);
      const headerFontSize = Number(this.get("headerFontSize") || 16);
      const headerFontWeight = this.get("headerFontWeight") || "600";
      const headerTextTransform = this.get("headerTextTransform") || "none";

      el.setAttribute("data-animation-type", animType);
      el.setAttribute("data-multiple-open", this.get("multiple_open") ? "true" : "false");
      el.style.setProperty("--accordion-gap", `${itemGap}px`);
      el.style.setProperty("--accordion-active-header-bg", activeHeaderBg);
      el.style.setProperty("--accordion-active-header-color", activeHeaderText);
      el.style.setProperty("--accordion-body-bg", contentBg);
      el.style.setProperty("--accordion-body-color", contentText);
      el.style.setProperty("--accordion-body-pad", `${bodyPad}px`);
      el.style.setProperty("--accordion-duration", `${animDur}ms`);
      el.style.setProperty("--accordion-icon-color", iconColor);
      el.style.setProperty("--accordion-icon-active-color", iconActiveColor);
      el.style.setProperty("--accordion-icon-size", `${iconSize}px`);
      el.style.setProperty("--accordion-header-font-size", `${headerFontSize}px`);
      el.style.setProperty("--accordion-header-font-weight", `${headerFontWeight}`);
      el.style.setProperty("--accordion-header-text-transform", headerTextTransform);

      // Allow composite traits to override legacy primitives when present
      try {
        const headerBgComposite = this.get("headerBg");
        if (headerBgComposite && headerBgComposite.color) {
          el.style.setProperty("--accordion-header-bg", headerBgComposite.color);
        }
      } catch (e) {}

      try {
        const headerTypography = this.get("headerTypography");
        if (headerTypography) {
          if (headerTypography.fontSize) el.style.setProperty("--accordion-header-font-size", `${headerTypography.fontSize}px`);
          if (headerTypography.fontWeight) el.style.setProperty("--accordion-header-font-weight", `${headerTypography.fontWeight}`);
          if (headerTypography.textTransform) el.style.setProperty("--accordion-header-text-transform", headerTypography.textTransform);
        }
      } catch (e) {}

      try {
        const borderComposite = this.get("border");
        if (borderComposite) {
          borderCol = borderComposite.color ?? borderCol;
          borderWidth = Number(borderComposite.width ?? borderWidth);
          borderStyle = borderComposite.style ?? borderStyle;
          radius = borderComposite.radius ?? radius;
        }
      } catch (e) {}

      applyColorStyle(el, this, { prefix: "header", selector: ".accordion-header", fields: ["background"] });
      applyColorStyle(el, this, { prefix: "header", selector: ".accordion-header", fields: ["text"] });
      applyGradientStyle(el, this, { prefix: "header", selector: ".accordion-header" });
      applyBackgroundImageStyle(el, this, { prefix: "header", selector: ".accordion-header" });
      applyShadowStyle(el, this, { prefix: "header", selector: ".accordion-item" });
      applyTransformStyle(el, this, { prefix: "header", selector: ".accordion-header" });
      applyColorStyle(el, this, { prefix: "content", selector: ".accordion-body", fields: ["background", "text"] });

      applyBorderStyle(el, this, { prefix: "", selector: ".accordion-item" });
      applyTypographyStyle(el, this, { prefix: "header", selector: ".accordion-header" });

      el.querySelectorAll(".accordion-item").forEach((item) => {
        item.style.borderColor = borderCol;
        item.style.borderWidth = `${borderWidth}px`;
        item.style.borderStyle = borderStyle;
        item.style.borderRadius = `${radius}px`;
        const header = item.querySelector(".accordion-header");
        if (header) {
          header.style.padding = `${headerPad}px`;
        }
        const body = item.querySelector(".accordion-body");
        if (body) {
          body.style.borderTopColor = borderCol;
          body.setAttribute("aria-hidden", item.classList.contains("open") ? "false" : "true");
        }
        if (header) {
          header.setAttribute("aria-expanded", item.classList.contains("open") ? "true" : "false");
        }
      });
      this.updateHoverStyles();
    },

    updateHoverStyles() {
      const el = this.view?.el;
      if (!el) return;
      const rootId = this.ccid || this.getId();
      const uniqueClass = `acc-${rootId}`;
      // Persist the unique class on the model so it is serialized in projectData
      this.addClass(uniqueClass);
      // Also ensure the DOM element has the class for immediate visual feedback
      if (!el.classList.contains(uniqueClass)) {
        el.classList.add(uniqueClass);
      }

      const doc = el.ownerDocument;
      const styleTag = ensureInstanceStyleTag(doc, rootId);

      const css = generateHoverCss(this, {
        prefix: "header",
        selector: ".accordion-header",
        componentUniqueClass: uniqueClass,
        hoverTraits: [
          { traitSuffix: "BackgroundColor", cssProperty: "background-color" },
          { traitSuffix: "TextColor", cssProperty: "color" },
        ],
      });

      styleTag.textContent = css || "";
    },

    parseItems() {
      let items = this.get("items") || [];
      try {
        if (typeof items === "string") items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
      return items.length ? items : defaultItems();
    },

    syncItems() {
      const items = this.parseItems();
      const rootId = this.ccid || this.getId();
      this.components().reset();

      this.setAttributes({ "data-multiple-open": this.get("multiple_open") ? "true" : "false" });

      const wrapper = this.append({ tagName: "div", attributes: { class: "accordion-wrapper", "data-acc-root": rootId }, selectable: false, hoverable: false, components: [] })[0];

      const uniqueClass = `acc-${rootId}`;
      this.setAttributes({ class: `accordion-component ${uniqueClass}`.trim() });

      const resolveContentComponents = (content) =>
        Array.isArray(content)
          ? content.length
            ? content
            : [{ tagName: "p", content: "Contenu de l'accordéon. Ajoutez votre texte ici." }]
          : [{ tagName: "p", content: content || "Contenu de l'accordéon. Ajoutez votre texte ici." }];

      const iconPos = this.get("icon_position") || "right";
      const chevronFirst = iconPos === "left";

      items.forEach((it, i) => {
        const isOpen = i === 0 && this.get("start_open_first");
        const openClass = isOpen ? " open" : "";
        const titleSpan = `<span>${it.title || `Élément ${i + 1}`}</span>`;
        const chevronSpan = `<span class="chevron"></span>`;
        const titleHtml = chevronFirst ? `${chevronSpan}${titleSpan}` : `${titleSpan}${chevronSpan}`;
        wrapper.append({
          tagName: "div",
          attributes: {
            class: "accordion-item" + openClass,
            "data-acc-root": rootId,
          },
          droppable: false,
          selectable: false,
          hoverable: false,
          components: [
            {
              tagName: "button",
              attributes: {
                type: "button",
                class: "accordion-header",
                "data-acc-toggle": rootId,
                "aria-expanded": isOpen ? "true" : "false",
              },
              content: titleHtml,
              selectable: false,
              hoverable: false,
              editable: false,
            },
            {
              tagName: "div",
              attributes: {
                class: "accordion-body",
                "data-acc-body": rootId,
                "aria-hidden": isOpen ? "false" : "true",
                "data-gjs-droppable": "true",
                "data-gjs-type": "accordion-body",
                role: "region",
              },
              droppable: true,
              selectable: true,
              components: resolveContentComponents(it.content),
            },
          ],
        });
      });

      this.updateAccordionStyles();
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:headerBackgroundColor change:activeHeaderBackgroundColor change:headerTextColor change:activeHeaderTextColor change:headerBackgroundColorHover change:headerTextColorHover change:headerPadding change:bodyPadding change:borderColor change:borderWidth change:borderStyle change:borderRadius change:contentBackgroundColor change:contentTextColor change:iconColor change:iconActiveColor change:iconSize change:headerFontSize change:headerFontWeight change:headerTextTransform change:animationType change:itemGap change:animation_duration change:animationDuration", () => {
        this.model.updateAccordionStyles();
      });
    },
    onRender() {
      this.model.updateAccordionStyles();
    },
  },
};
