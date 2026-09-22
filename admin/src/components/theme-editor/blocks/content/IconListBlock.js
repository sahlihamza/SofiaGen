import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

export const IconListBlock = {
  id: "icon-list-block",
  label: "= Icon List",
  category: "Content",
  content: {
    type: "icon-list-component",
  },
  attributes: { class: "fa fa-list-ul" },
};

export const IconListComponent = {
  isComponent: (el) => el.classList && el.classList.contains("icon-list-component"),
  model: {
    defaults: {
      type: "icon-list-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "icon-list-component", "data-placeholder-content": "true" },
      styles: `
        .icon-list-component {
          display: flex;
          flex-direction: column;
          gap: var(--icon-list-gap, 12px);
          padding: var(--icon-list-padding, 16px);
        }
        .icon-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: var(--icon-list-font-size, 15px);
          color: var(--icon-list-text-color, #374151);
        }
        .icon-list-item .list-icon {
          font-size: var(--icon-list-icon-size, 18px);
          color: var(--icon-list-icon-color, #10b981);
          flex-shrink: 0;
          width: var(--icon-list-icon-size, 18px);
          text-align: center;
        }
      `,
      traits: [
        {
          name: "items",
          label: "Éléments",
          type: "list",
          changeProp: 1,
          default: [
            { icon: null, text: "Garantie 2 ans" },
            { icon: null, text: "Livraison gratuite" },
            { icon: null, text: "Support 24/7" },
          ],
          itemSchema: [
            { key: "icon", label: "Icône", type: "icon-picker" },
            { key: "text", label: "Texte", type: "text" },
          ],
          category: "content",
        },
        {
          name: "iconColor",
          label: "Couleur des icônes",
          type: "color",
          default: "#10b981",
          changeProp: 1,
          category: "style",
        },
        {
          name: "textColor",
          label: "Couleur du texte",
          type: "color",
          default: "#374151",
          changeProp: 1,
          category: "style",
        },
        {
          name: "fontSize",
          label: "Taille du texte (px)",
          type: "number",
          default: 15,
          min: 10,
          max: 32,
          changeProp: 1,
          category: "style",
        },
        {
          name: "iconSize",
          label: "Taille des icônes (px)",
          type: "number",
          default: 18,
          min: 10,
          max: 48,
          changeProp: 1,
          category: "style",
        },
        {
          name: "itemGap",
          label: "Espacement (px)",
          type: "number",
          default: 12,
          min: 0,
          max: 48,
          changeProp: 1,
          category: "style",
        },
      ],
      components: [],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:items change:iconColor change:textColor change:fontSize change:iconSize change:itemGap", this.updateIconList);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
      attachPlaceholderContentListener(this, ["change:items"]);
    },

    buildIfFresh() {
      if (this.components().length === 0) this.syncItems();
    },

    parseItems() {
      let items = this.get("items") || [];
      try {
        if (typeof items === "string") items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
      return items.length ? items : [
        { icon: null, text: "Élément 1" },
        { icon: null, text: "Élément 2" },
      ];
    },

    syncItems() {
      const items = this.parseItems();
      this.components().reset();
      this.setAttributes({ "data-placeholder-content": "true" });

      const wrapper = this.append({ tagName: "div", attributes: { class: "icon-list-wrapper", "data-icon-list-root": this.ccid || this.getId() }, selectable: false, hoverable: false, components: [] })[0];

      items.forEach((it) => {
        let iconData = null;
        if (it.icon) {
          try {
            iconData = typeof it.icon === "string" ? JSON.parse(it.icon) : it.icon;
          } catch {
            iconData = null;
          }
        }
        const iconContent = iconData && iconData.svgContent
          ? { tagName: "svg", attributes: { viewBox: iconData.viewBox || "0 0 24 24", style: "width:100%;height:100%;" }, innerHTML: iconData.svgContent }
          : it.icon || """;

        wrapper.append({
          tagName: "div",
          attributes: { class: "icon-list-item" },
          droppable: false,
          components: [
            { tagName: "span", attributes: { class: "list-icon" }, components: [iconContent] },
            { tagName: "span", attributes: { class: "list-text" }, content: it.text || "" },
          ],
        });
      });

      this.updateIconList();
    },

    updateIconList() {
      const el = this.view?.el;
      if (!el) return;
      const iconColor = this.get("iconColor") || "#10b981";
      const textColor = this.get("textColor") || "#374151";
      const fontSize = this.get("fontSize") || 15;
      const iconSize = this.get("iconSize") || 18;
      const itemGap = this.get("itemGap") || 12;

      el.style.setProperty("--icon-list-icon-color", iconColor);
      el.style.setProperty("--icon-list-text-color", textColor);
      el.style.setProperty("--icon-list-font-size", `${fontSize}px`);
      el.style.setProperty("--icon-list-icon-size", `${iconSize}px`);
      el.style.setProperty("--icon-list-gap", `${itemGap}px`);

      el.querySelectorAll(".icon-list-item").forEach((item) => {
        item.style.color = textColor;
        item.style.fontSize = `${fontSize}px`;
        item.style.gap = `${Math.max(4, iconSize / 3)}px`;
      });
    },
  },
};
