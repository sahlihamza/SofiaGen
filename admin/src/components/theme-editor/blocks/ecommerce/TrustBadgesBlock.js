import { colorTraits, spacingTraits, borderTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle } from "../../traits/utils/applyCommonStyles";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

const defaultItems = () => [
  { icon: null, label: "Paiement sécurisé", id: `trust-${Date.now()}` },
  { icon: null, label: "Livraison rapide", id: `trust-${Date.now() + 1}` },
  { icon: null, label: "Retours gratuits sous 30 jours", id: `trust-${Date.now() + 2}` },
];

export const TrustBadgesBlock = {
  id: "trust-badges-block",
  label: "= Trust Badges",
  category: "E-Commerce",
  section: "E-Commerce",
  content: {
    type: "trust-badges-component",
  },
  attributes: { class: "fa fa-shield-alt" },
};

export const TrustBadgesComponent = {
  isComponent: (el) => el.classList && el.classList.contains("trust-badges-component"),
  model: {
    defaults: {
      type: "trust-badges-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "trust-badges-component", "data-placeholder-content": "true" },
      styles: `
        .trust-badges-component {
          display: flex;
          flex-wrap: wrap;
          gap: var(--trust-badges-gap, 16px);
          padding: var(--trust-badges-padding, 20px);
          width: 100%;
          box-sizing: border-box;
        }
        .trust-badge-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--trust-badge-bg, #f9fafb);
          border: var(--trust-badge-border, 1px solid #e5e7eb);
          border-radius: var(--trust-badge-radius, 8px);
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 14px;
          color: var(--trust-badge-text, #374151);
        }
        .trust-badge-icon {
          font-size: 20px;
          line-height: 1;
        }
        .trust-payment-icons {
          display: flex;
          gap: 12px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          width: 100%;
        }
        .trust-payment-icon {
          height: 24px;
          opacity: 0.7;
        }
      `,
      traits: [
        {
          name: "items",
          label: "Badges de confiance",
          type: "item-list",
          changeProp: 1,
          default: defaultItems(),
          itemSchema: [
            { key: "icon", label: "Icône", type: "icon-picker" },
            { key: "label", label: "Texte", type: "text" },
            { key: "id", label: "ID", type: "text" },
          ],
          category: "content",
          section: "Contenu",
        },
        {
          name: "showPaymentIcons",
          label: "Afficher les icônes de paiement",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        ...spacingTraits({ prefix: "trustBadges", defaults: { padding: 20, gap: 16 } }),
        ...colorTraits({ prefix: "trustBadge", fields: ["background", "text"], defaults: { background: "#f9fafb", text: "#374151" } }),
        ...borderTraits({ prefix: "trustBadge", defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 8 } }),
      ],
      components: [],
    },

    buildIfFresh() {
      if (this.components().length === 0) {
        this.syncItems();
        this.syncPaymentIcons();
      }
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:items", this.syncItems);
      this.on("change:showPaymentIcons", this.syncPaymentIcons);
      this.on("change:trustBadgeBackgroundColor change:trustBadgeTextColor change:trustBadgeBorderRadius change:trustBadgesPadding change:trustBadgesGap", this.updateStyles);
      attachPlaceholderContentListener(this, ["change:items"]);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
    },

    updateStyles() {
      const el = this.view?.el;
      if (!el) return;
      let padding = this.get("trustBadgesPadding") || 20;
      let gap = this.get("trustBadgesGap") || 16;
      try {
        const composite = this.get("trustBadgesSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--trust-badges-padding", `${padding}px`);
      el.style.setProperty("--trust-badges-gap", `${gap}px`);
      applyColorStyle(el, this, { prefix: "trustBadge", selector: ".trust-badge-item", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "trustBadge", selector: ".trust-badge-item" });
    },

    syncItems() {
      const items = this.get("items") || [];
      this.components().reset();
      this.setAttributes({ "data-placeholder-content": "true" });

      const wrapper = this.append({ tagName: "div", attributes: { class: "trust-badges-list" }, selectable: false, hoverable: false, components: [] })[0];

      (items || []).forEach((it) => {
        let iconData = null;
        if (it.icon) {
          try {
            iconData = typeof it.icon === "string" ? JSON.parse(it.icon) : it.icon;
          } catch {
            iconData = null;
          }
        }
        const iconComponent = iconData && iconData.svgContent
          ? { tagName: "svg", attributes: { viewBox: iconData.viewBox || "0 0 24 24", style: "width:100%;height:100%;" }, innerHTML: iconData.svgContent }
          : { tagName: "span", attributes: { class: "trust-badge-icon", selectable: false, hoverable: false, editable: false }, content: it.icon || "" };

        wrapper.append({
          tagName: "div",
          attributes: { class: "trust-badge-item" },
          droppable: false,
          components: [
            iconComponent,
            { tagName: "span", attributes: { class: "trust-badge-label", selectable: false, hoverable: false, editable: false }, content: it.label || "" },
          ],
        });
      });
    },

    syncPaymentIcons() {
      const show = this.get("showPaymentIcons");
      const el = this.view?.el;
      if (!el) return;
      let container = el.querySelector(".trust-payment-icons");
      if (show) {
        if (!container && typeof document !== "undefined") {
          container = document.createElement("div");
          container.className = "trust-payment-icons";
          el.appendChild(container);
        }
        if (container) {
          container.innerHTML = `
            <svg class="trust-payment-icon" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#1A1F71"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">VISA</text></svg>
            <svg class="trust-payment-icon" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#000"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">MC</text></svg>
            <svg class="trust-payment-icon" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#003087"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">PayPal</text></svg>
          `;
        }
      } else if (container) {
        container.remove();
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:showPaymentIcons", this.syncPaymentIcons);
      this.listenTo(this.model, "change:trustBadgeBackgroundColor change:trustBadgeTextColor change:trustBadgeBorderRadius change:trustBadgesPadding change:trustBadgesGap", this.updateStyles);
    },

    onRender() {
      this.syncPaymentIcons();
      this.updateStyles();
    },

    syncPaymentIcons() {
      const show = this.model.get("showPaymentIcons");
      let container = this.el.querySelector(".trust-payment-icons");
      if (show) {
        if (!container && typeof document !== "undefined") {
          container = document.createElement("div");
          container.className = "trust-payment-icons";
          this.el.appendChild(container);
        }
        if (container) {
          container.innerHTML = `
            <svg class="trust-payment-icon" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#1A1F71"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">VISA</text></svg>
            <svg class="trust-payment-icon" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#000"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">MC</text></svg>
            <svg class="trust-payment-icon" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#003087"/><text x="24" y="21" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">PayPal</text></svg>
          `;
        }
      } else if (container) {
        container.remove();
      }
    },

    updateStyles() {
      const el = this.el;
      let padding = this.model.get("trustBadgesPadding") || 20;
      let gap = this.model.get("trustBadgesGap") || 16;
      try {
        const composite = this.model.get("trustBadgesSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--trust-badges-padding", `${padding}px`);
      el.style.setProperty("--trust-badges-gap", `${gap}px`);
    },
  },
};
