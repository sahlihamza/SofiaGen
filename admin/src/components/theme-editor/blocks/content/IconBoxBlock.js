/**
 * Icon Box Block  convenience widget composing an Icon, a Heading and a
 * short Text inside a Stack. Layout can be vertical or horizontal.
 * No new mechanism: it reuses existing primitives.
 */

import { colorTraits, spacingTraits, borderTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle } from "../../traits/utils/applyCommonStyles";
import { IconPickerTrait } from "../../traits";

export const IconBoxBlock = {
  id: "icon-box-block",
  label: "= Icon Box",
  category: "Content",
  content: {
    type: "icon-box-component",
  },
  attributes: { class: "fa fa-th-large" },
};

export const IconBoxComponent = {
  isComponent: (el) => el.classList && el.classList.contains("icon-box-component"),
  model: {
    defaults: {
      type: "icon-box-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "icon-box-component" },
      styles: `
        .icon-box-component {
          display: flex;
          gap: var(--icon-box-gap, 16px);
          align-items: flex-start;
          padding: var(--icon-box-padding, 20px);
          width: 100%;
          box-sizing: border-box;
          background: var(--icon-box-background, transparent);
          border-radius: var(--icon-box-border-radius, 0px);
        }
        .icon-box-component.layout-horizontal {
          flex-direction: row;
        }
        .icon-box-component.layout-vertical {
          flex-direction: column;
          text-align: center;
          align-items: center;
        }
        .icon-box-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--icon-box-icon-size, 48px);
          height: var(--icon-box-icon-size, 48px);
          color: var(--icon-box-icon-color, #667eea);
          flex: 0 0 auto;
          line-height: 1;
        }
        .icon-box-icon svg {
          width: 100%;
          height: 100%;
        }
        .icon-box-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .icon-box-title {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 20px;
          font-weight: 700;
          color: var(--ts-color-text-primary, #111827);
          margin: 0;
        }
        .icon-box-text {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 15px;
          line-height: 1.6;
          color: var(--ts-color-text-secondary, #4b5563);
          margin: 0;
        }
      `,
      traits: [
        IconPickerTrait("icon", "Icône"),
        {
          name: "title",
          label: "Titre",
          type: "text",
          default: "Fonctionnalité",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "text",
          label: "Texte",
          type: "text",
          default: "Courte description de la fonctionnalité.",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "layout",
          label: "Disposition",
          type: "select",
          default: "vertical",
          options: [
            { id: "vertical", label: "Vertical" },
            { id: "horizontal", label: "Horizontal" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        ...colorTraits({ prefix: "iconBox", fields: ["icon"], defaults: { icon: "#667eea" }, section: "Couleurs" }),
        ...spacingTraits({ prefix: "iconBox", defaults: { padding: 20, gap: 16 }, section: "Espacement" }),
        ...borderTraits({ prefix: "iconBox", defaults: { color: "transparent", width: 0, style: "solid", radius: 0 }, section: "Bordure" }),
        {
          name: "backgroundColor",
          label: "Couleur de fond",
          type: "color",
          default: "transparent",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "icon-box-icon" }, selectable: false, hoverable: false, editable: false },
        {
          tagName: "div",
          attributes: { class: "icon-box-body" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            { tagName: "h3", attributes: { class: "icon-box-title" }, content: "Fonctionnalité", selectable: false, hoverable: false, editable: false },
            { tagName: "p", attributes: { class: "icon-box-text" }, content: "Courte description de la fonctionnalité.", selectable: false, hoverable: false, editable: false },
          ],
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:icon change:title change:text", this.updateContent);
      this.on("change:layout", this.updateLayout);
      this.on("change:iconBoxIconColor change:iconBoxIconSize change:iconBoxPadding change:iconBoxBorderRadius change:backgroundColor change:iconBoxGap change:iconBoxSpacing", this.updateIconBoxStyles);
    },

    getEl() {
      return this.view?.el;
    },

    updateIconBoxStyles() {
      const el = this.getEl();
      if (!el) return;
      applyColorStyle(el, this, { prefix: "iconBox", selector: ".icon-box-icon", fields: ["icon"] });
      let padding = this.get("iconBoxPadding") || 20;
      let gap = this.get("iconBoxGap") || 16;
      try {
        const composite = this.get("iconBoxSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--icon-box-padding", `${padding}px`);
      el.style.setProperty("--icon-box-gap", `${gap}px`);
      el.style.setProperty("--icon-box-icon-size", `${this.get("iconBoxIconSize") || 48}px`);
      applyBorderStyle(el, this, { prefix: "iconBox", selector: ".icon-box-component" });
      try {
        const bgComposite = this.get("iconBoxBg") || this.get("iconBoxBg");
        const bg = (bgComposite && bgComposite.color) ? bgComposite.color : (this.get("backgroundColor") || "transparent");
        el.style.setProperty("--icon-box-background", bg);
      } catch (e) {
        const bg = this.get("backgroundColor") || "transparent";
        el.style.setProperty("--icon-box-background", bg);
      }
    },

    updateContent() {
      const rawIcon = this.get("icon");
      let iconData = null;
      if (rawIcon) {
        try {
          iconData = typeof rawIcon === "string" ? JSON.parse(rawIcon) : rawIcon;
        } catch {
          iconData = null;
        }
      }
      const title = this.get("title") || "";
      const text = this.get("text") || "";

      const iconContainer = this.components().at(0);
      const bodyContainer = this.components().at(1);

      if (iconContainer) {
        if (iconData && iconData.svgContent) {
          const size = this.get("iconBoxIconSize") || 48;
          const color = this.get("iconBoxIconColor") || "#667eea";
          iconContainer.components().reset();
          iconContainer.components().add({
            tagName: "svg",
            attributes: {
              viewBox: iconData.viewBox || "0 0 24 24",
              style: `width:${size}px;height:${size}px;color:${color};`,
              "aria-hidden": "true",
            },
            innerHTML: iconData.svgContent,
          });
          iconContainer.setAttributes({ class: "icon-box-icon" });
        } else {
          iconContainer.components().reset();
        }
      }

      if (bodyContainer) {
        const titleComp = bodyContainer.components().at(0);
        const textComp = bodyContainer.components().at(1);
        if (titleComp) titleComp.set("content", title);
        if (textComp) textComp.set("content", text);
      }
    },

    updateLayout() {
      const layout = this.get("layout") || "vertical";
      const el = this.getEl();
      if (el) {
        el.classList.remove("layout-horizontal", "layout-vertical");
        el.classList.add(`layout-${layout}`);
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:icon change:title change:text", () => this.model.updateContent());
      this.listenTo(this.model, "change:layout", () => this.model.updateLayout());
      this.listenTo(this.model, "change:iconBoxIconColor change:iconBoxIconSize change:iconBoxPadding change:iconBoxBorderRadius change:backgroundColor change:iconBoxGap change:iconBoxSpacing", () => this.model.updateIconBoxStyles());
    },
    onRender() {
      this.model.updateIconBoxStyles();
      this.model.updateLayout();
      this.model.updateContent();
    },
  },
};

