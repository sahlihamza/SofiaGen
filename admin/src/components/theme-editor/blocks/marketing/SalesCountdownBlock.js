import { colorTraits, spacingTraits, borderTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle } from "../../traits/utils/applyCommonStyles";

export const SalesCountdownBlock = {
  id: "sales-countdown-block",
  label: " Sales Countdown",
  category: "Marketing",
  content: {
    type: "sales-countdown-component",
  },
  attributes: { class: "fa fa-hourglass-half" },
};

export const SalesCountdownComponent = {
  isComponent: (el) => el.classList && el.classList.contains("sales-countdown"),
  model: {
    defaults: {
      type: "sales-countdown-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "sales-countdown", "data-target-date": "", "data-on-expire-action": "message", "data-expired-message": "Offre terminé" },
      styles: `
        .sales-countdown {
          display: flex;
          flex-wrap: wrap;
          gap: var(--sales-countdown-gap, 16px);
          padding: var(--sales-countdown-padding, 24px);
          width: 100%;
          box-sizing: border-box;
          justify-content: center;
        }
        .countdown-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 70px;
        }
        .countdown-value {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 32px;
          font-weight: 700;
          color: var(--sales-countdown-digit-text, #111827);
          background: var(--sales-countdown-digit-background, #f3f4f6);
          padding: 12px 16px;
          border-radius: var(--sales-countdown-digit-border-radius, 8px);
          border: var(--sales-countdown-digit-border, 1px solid #e5e7eb);
          line-height: 1;
        }
        .countdown-label {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 12px;
          font-weight: 500;
          color: var(--ts-color-text-secondary, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .countdown-expired {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 18px;
          font-weight: 600;
          color: #dc2626;
          text-align: center;
        }
      `,
      components: [
        { tagName: "div", attributes: { class: "countdown-unit" }, selectable: false, hoverable: false, editable: false, components: [
          { tagName: "span", attributes: { class: "countdown-value" }, content: "00", selectable: false, hoverable: false, editable: false },
          { tagName: "span", attributes: { class: "countdown-label" }, content: "Jours", selectable: false, hoverable: false, editable: false },
        ]},
        { tagName: "div", attributes: { class: "countdown-unit" }, selectable: false, hoverable: false, editable: false, components: [
          { tagName: "span", attributes: { class: "countdown-value" }, content: "00", selectable: false, hoverable: false, editable: false },
          { tagName: "span", attributes: { class: "countdown-label" }, content: "Heures", selectable: false, hoverable: false, editable: false },
        ]},
        { tagName: "div", attributes: { class: "countdown-unit" }, selectable: false, hoverable: false, editable: false, components: [
          { tagName: "span", attributes: { class: "countdown-value" }, content: "00", selectable: false, hoverable: false, editable: false },
          { tagName: "span", attributes: { class: "countdown-label" }, content: "Min", selectable: false, hoverable: false, editable: false },
        ]},
        { tagName: "div", attributes: { class: "countdown-unit" }, selectable: false, hoverable: false, editable: false, components: [
          { tagName: "span", attributes: { class: "countdown-value" }, content: "00", selectable: false, hoverable: false, editable: false },
          { tagName: "span", attributes: { class: "countdown-label" }, content: "Sec", selectable: false, hoverable: false, editable: false },
        ]},
      ],
      traits: [
        {
          name: "targetDate",
          label: "Date cible",
          type: "text",
          default: "",
          changeProp: 1,
          category: "content",
          section: "Compte  rebours",
        },
        {
          name: "onExpireAction",
          label: "Action  l'expiration",
          type: "select",
          default: "message",
          options: [
            { value: "message", label: "Afficher un message" },
            { value: "hide", label: "Masquer le bloc" },
          ],
          changeProp: 1,
          category: "content",
          section: "Compte  rebours",
        },
        {
          name: "expiredMessage",
          label: "Message si expiré",
          type: "text",
          default: "Offre terminé",
          changeProp: 1,
          category: "content",
          section: "Compte  rebours",
        },
        ...colorTraits({ prefix: "salesCountdown", fields: ["digitBackground", "digitText"], defaults: { digitBackground: "#f3f4f6", digitText: "#111827" }, section: "Chiffres" }),
        ...spacingTraits({ prefix: "salesCountdown", defaults: { padding: 24, gap: 16 }, section: "Espacement" }),
        ...borderTraits({ prefix: "salesCountdown", defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 8 }, section: "Bordure" }),
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:salesCountdownDigitBackgroundColor change:salesCountdownDigitTextColor change:salesCountdownDigitBorderRadius change:salesCountdownPadding change:salesCountdownGap", this.updateStyles);
      this.on("change:targetDate change:onExpireAction change:expiredMessage", this.syncDataAttributes);
      this.syncDataAttributes();
      this.startCountdown();
      this.once("remove", () => {
        if (this._countdownInterval) clearInterval(this._countdownInterval);
      });
    },

    onRemove() {
      this.off("change:salesCountdownDigitBackgroundColor change:salesCountdownDigitTextColor change:salesCountdownDigitBorderRadius change:salesCountdownPadding change:salesCountdownGap");
      this.off("change:targetDate change:onExpireAction change:expiredMessage");
      if (this._countdownInterval) clearInterval(this._countdownInterval);
    },

    syncDataAttributes() {
      const attrs = this.getAttributes() || {};
      attrs["data-target-date"] = String(this.get("targetDate") || "");
      attrs["data-on-expire-action"] = String(this.get("onExpireAction") || "message");
      attrs["data-expired-message"] = String(this.get("expiredMessage") || "Offre terminé");
      this.setAttributes(attrs);
    },

    startCountdown() {
      const target = this.get("targetDate");
      if (!target) return;
      const targetTime = new Date(target).getTime();
      if (isNaN(targetTime)) return;

      const update = () => {
        const now = new Date().getTime();
        const distance = targetTime - now;
        const el = this.view?.el;
        if (!el) return;

        if (distance < 0) {
          const action = this.get("onExpireAction");
          const message = this.get("expiredMessage") || "Offre terminé";
          if (action === "hide") {
            el.style.display = "none";
          } else {
            el.innerHTML = `<div class="countdown-expired">${message}</div>`;
          }
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const values = el.querySelectorAll(".countdown-value");
        const labels = el.querySelectorAll(".countdown-label");
        if (values.length >= 4) {
          values[0].textContent = String(days).padStart(2, "0");
          values[1].textContent = String(hours).padStart(2, "0");
          values[2].textContent = String(minutes).padStart(2, "0");
          values[3].textContent = String(seconds).padStart(2, "0");
        }
        if (labels.length >= 4) {
          labels[0].textContent = days === 1 ? "Jour" : "Jours";
        }
      };

      update();
      this._countdownInterval = setInterval(update, 1000);
    },

    getEl() {
      return this.view?.el;
    },

    updateStyles() {
      const el = this.getEl();
      if (!el) return;
      let padding = this.get("salesCountdownPadding") || 24;
      let gap = this.get("salesCountdownGap") || 16;
      try {
        const composite = this.get("salesCountdownSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--sales-countdown-padding", `${padding}px`);
      el.style.setProperty("--sales-countdown-gap", `${gap}px`);
      applyColorStyle(el, this, { prefix: "salesCountdown", selector: ".countdown-value", fields: ["digitBackground", "digitText"] });
      applyBorderStyle(el, this, { prefix: "salesCountdown", selector: ".countdown-value" });
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:salesCountdownDigitBackgroundColor change:salesCountdownDigitTextColor change:salesCountdownDigitBorderRadius change:salesCountdownPadding change:salesCountdownGap", this.updateStyles);
    },

    onRender() {
      this.updateStyles();
      this.model.startCountdown();
    },

    updateStyles() {
      const el = this.el;
      let padding = this.model.get("salesCountdownPadding") || 24;
      let gap = this.model.get("salesCountdownGap") || 16;
      try {
        const composite = this.model.get("salesCountdownSpacing");
        if (composite) {
          padding = composite.padding ?? composite.top ?? composite.vertical ?? padding;
          gap = composite.gap ?? composite.spacing ?? gap;
        }
      } catch (e) {}
      el.style.setProperty("--sales-countdown-padding", `${padding}px`);
      el.style.setProperty("--sales-countdown-gap", `${gap}px`);
    },
  },
};
