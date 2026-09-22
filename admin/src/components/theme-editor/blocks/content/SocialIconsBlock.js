/**
 * Social Icons Block  list of social links rendered as FontAwesome icons.
 * Uses the reusable "listField" trait (ListFieldEditor).
 *
 * Links are built as MODEL components so server-side getHtml() renders them.
 */

import { colorTraits, spacingTraits, borderTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle } from "../../traits/utils/applyCommonStyles";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

export const SocialIconsBlock = {
  id: "social-icons-block",
  label: "= Social Icons",
  category: "Content",
  content: {
    type: "social-icons-component",
  },
  attributes: { class: "fa fa-share-alt" },
};

const defaultItems = () => [
  { platform: "facebook", icon: null, url: "#", id: `soc-${Date.now()}` },
  { platform: "instagram", icon: null, url: "#", id: `soc-${Date.now() + 1}` },
  { platform: "twitter", icon: null, url: "#", id: `soc-${Date.now() + 2}` },
];

export const SocialIconsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("social-icons-component"),
  model: {
    defaults: {
      type: "social-icons-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "social-icons-component", "data-placeholder-content": "true" },
      styles: `
        .social-icons-component { display: flex; flex-wrap: wrap; gap: var(--social-icons-gap, 12px); padding: var(--social-icons-padding, 16px); width: 100%; box-sizing: border-box; }
        .social-icon-link {
          display: inline-flex; align-items: center; justify-content: center;
          width: var(--social-icon-size, 42px); height: var(--social-icon-size, 42px); border-radius: var(--social-icons-border-radius, 50%);
          background: var(--social-icon-bg, #f3f4f6); color: var(--social-icon-color, #374151); font-size: calc(var(--social-icon-size, 42px) * 0.42);
          text-decoration: none; transition: background 0.2s, color 0.2s;
        }
        .social-icon-link:hover { background: var(--ts-color-primary, #667eea); color: #fff; }
        .social-icons-component.align-center { justify-content: center; }
        .social-icons-component.align-end { justify-content: flex-end; }
      `,
      traits: [
        {
          name: "items",
          label: "Réseaux sociaux",
          type: "item-list",
          changeProp: 1,
          default: defaultItems(),
          itemSchema: [
            { key: "platform", label: "Plateforme", type: "text" },
            { key: "icon", label: "Icône", type: "icon-picker" },
            { key: "url", label: "URL", type: "url" },
            { key: "id", label: "ID", type: "text" },
          ],
          category: "content",
          section: "Contenu",
        },
        {
          name: "alignment",
          label: "Alignement",
          type: "select",
          default: "start",
          options: [
            { id: "start", label: "Gauche" },
            { id: "center", label: "Centré" },
            { id: "end", label: "Droite" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        ...spacingTraits({ prefix: "socialIcons", defaults: { padding: 16, gap: 12 }, section: "Espacement" }),
        ...colorTraits({ prefix: "socialIcon", fields: ["background", "text", "hoverBackground", "hoverText"], defaults: { background: "#f3f4f6", text: "#374151", hoverBackground: "#667eea", hoverText: "#ffffff" }, section: "Couleurs" }),
        ...borderTraits({ prefix: "socialIcons", defaults: { color: "#f3f4f6", width: 0, style: "solid", radius: 50 }, section: "Bordure" }),
        {
          name: "iconSize",
          label: "Taille icône (px)",
          type: "number",
          default: 42,
          min: 24,
          max: 80,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [],
    },

    buildIfFresh() {
      if (this.components().length === 0) {
        this.syncItems();
        this.syncAlignment();
      }
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:items", this.syncItems);
      this.on("change:alignment", this.syncAlignment);
      this.on("change:socialIconBackgroundColor change:socialIconTextColor change:socialIconHoverBackgroundColor change:socialIconHoverTextColor change:socialIconsBorderRadius change:iconSize change:socialIconsPadding change:socialIconsGap", this.updateStyles);
      attachPlaceholderContentListener(this, ["change:items"]);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
    },

    updateStyles() {
      const el = this.view?.el;
      if (!el) return;
      const size = this.get("iconSize") || 42;
      const bg = this.get("socialIconBackgroundColor") || "#f3f4f6";
      const color = this.get("socialIconTextColor") || "#374151";
      const hoverBg = this.get("socialIconHoverBackgroundColor") || "#667eea";
      const hoverColor = this.get("socialIconHoverTextColor") || "#ffffff";
      const radius = this.get("socialIconsBorderRadius") || 50;

      // spacing: prefer composite `socialIconsSpacing` then fall back to primitives
      let padding = this.get("socialIconsPadding") || 16;
      let gap = this.get("socialIconsGap") || 12;
      try {
        const composite = this.get("socialIconsSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}

      el.style.setProperty("--social-icons-padding", `${padding}px`);
      el.style.setProperty("--social-icons-gap", `${gap}px`);
      el.style.setProperty("--social-icon-size", `${size}px`);

      applyColorStyle(el, this, { prefix: "socialIcon", selector: ".social-icon-link", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "socialIcons", selector: ".social-icon-link" });

      // Prefer composite border trait for social icons
      try {
        const borderComposite = this.get("socialIconsBorder");
        if (borderComposite) {
          const col = borderComposite.color ?? this.get("socialIconsBorderColor") ?? "transparent";
          const w = borderComposite.width ?? this.get("socialIconsBorderWidth") ?? 0;
          const st = borderComposite.style ?? this.get("socialIconsBorderStyle") ?? "solid";
          const r = borderComposite.radius ?? this.get("socialIconsBorderRadius") ?? 50;
          el.querySelectorAll('.social-icon-link').forEach((s) => {
            s.style.borderColor = col;
            s.style.borderWidth = `${w}px`;
            s.style.borderStyle = st;
            s.style.borderRadius = `${r}px`;
          });
        }
      } catch (e) {}

      // Inject CSS for hover state
      if (!el.__socialStylesInjected && typeof document !== "undefined") {
        el.__socialStylesInjected = true;
        const style = document.createElement("style");
        const rootId = this.getId();
        style.textContent = `
          [data-social-styles="${rootId}"] .social-icon-link:hover {
            background: ${hoverBg} !important;
            color: ${hoverColor} !important;
          }
        `;
        el.dataset.socialStyles = rootId;
        document.head.appendChild(style);
      }
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
      this.components().reset();
      this.append({ tagName: "div", attributes: { class: "social-icons-list" }, components: [] });
      const wrapper = this.components().filter((c) => c.getClasses?.().includes("social-icons-list"))[0];
      if (!wrapper) return;

      const renderIcon = (it) => {
        let iconData = null;
        if (it.icon) {
          try {
            iconData = typeof it.icon === "string" ? JSON.parse(it.icon) : it.icon;
          } catch {
            iconData = null;
          }
        }
        if (iconData && iconData.svgContent) {
          return { tagName: "span", components: [{ tagName: "svg", attributes: { viewBox: iconData.viewBox || "0 0 24 24", style: "width:100%;height:100%;" }, innerHTML: iconData.svgContent }] };
        }
        return { tagName: "i", attributes: { class: it.icon || "fa fa-link" } };
      };

      (items || []).forEach((it) => {
        wrapper.append({
          tagName: "a",
          attributes: { class: "social-icon-link", href: it.url || "#", "aria-label": it.platform || "social" },
          droppable: false,
          components: [renderIcon(it)],
        });
      });
    },

    syncAlignment() {
      const align = this.get("alignment") || "start";
      const attrs = this.getAttributes();
      attrs["class"] = `social-icons-component align-${align === "center" ? "center" : align === "end" ? "end" : "start"}`;
      this.setAttributes(attrs);
    },
  },
};
