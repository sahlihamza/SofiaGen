import { IconPickerTrait } from "../../traits";

export const IconBlock = {
  id: "icon-block",
  label: "P Icon",
  category: "Base",
  content: {
    type: "icon-component",
  },
  attributes: { class: "fa fa-star" },
};

export const IconComponent = {
  isComponent: (el) => el.classList && el.classList.contains("icon-component"),
  model: {
    defaults: {
      type: "icon-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "icon-component" },
      styles: `
        .icon-component {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          color: var(--ts-color-primary, #667eea);
          width: 56px;
          height: 56px;
          line-height: 1;
        }
        .icon-component svg {
          width: 100%;
          height: 100%;
        }
      `,
      traits: [
        IconPickerTrait("icon", "Icône"),
      ],
      components: [
        { tagName: "div", attributes: { class: "icon-component-inner" }, selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:icon", this.updateIcon);
    },

    updateIcon() {
      const rawIcon = this.get("icon");
      let iconData = null;
      if (rawIcon) {
        try {
          iconData = typeof rawIcon === "string" ? JSON.parse(rawIcon) : rawIcon;
        } catch {
          iconData = null;
        }
      }
      const inner = this.components().at(0);
      if (!inner) return;

      if (iconData && iconData.svgContent) {
        inner.components().reset();
        inner.components().add({
          tagName: "svg",
          attributes: {
            viewBox: iconData.viewBox || "0 0 24 24",
            style: `width:56px;height:56px;color:${this.get("iconColor") || "var(--ts-color-primary, #667eea)"};`,
            "aria-hidden": "true",
          },
          innerHTML: iconData.svgContent,
        });
      } else {
        inner.components().reset();
      }
    },
  },
};
