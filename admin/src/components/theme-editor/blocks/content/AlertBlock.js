export const AlertBlock = {
  id: "alert-block",
  label: " Alert",
  category: "Content",
  content: {
    type: "alert-component",
  },
  attributes: { class: "fa fa-exclamation-circle" },
};

export const AlertComponent = {
  isComponent: (el) => el.classList && el.classList.contains("alert-component"),
  model: {
    defaults: {
      type: "alert-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "alert-component alert-info", "data-dismissible": "false" },
      styles: `
        .alert-component {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 8px;
          border-left: 4px solid var(--alert-border-color, #3b82f6);
          background: var(--alert-bg, #eff6ff);
          color: var(--alert-text-color, #1e40af);
          font-size: 14px;
          line-height: 1.5;
        }
        .alert-component.alert-info { --alert-border-color: #3b82f6; --alert-bg: #eff6ff; --alert-text-color: #1e40af; }
        .alert-component.alert-success { --alert-border-color: #10b981; --alert-bg: #ecfdf5; --alert-text-color: #065f46; }
        .alert-component.alert-warning { --alert-border-color: #f59e0b; --alert-bg: #fffbeb; --alert-text-color: #92400e; }
        .alert-component.alert-error { --alert-border-color: #ef4444; --alert-bg: #fef2f2; --alert-text-color: #b91c1c; }
        .alert-icon { font-size: 18px; flex-shrink: 0; }
        .alert-content { flex: 1; }
        .alert-close {
          background: none; border: none; cursor: pointer; font-size: 18px; line-height: 1;
          color: inherit; opacity: 0.6; padding: 0; flex-shrink: 0;
        }
        .alert-close:hover { opacity: 1; }
      `,
      traits: [
        {
          name: "alertType",
          label: "Type d'alerte",
          type: "select",
          default: "info",
          options: [
            { value: "info", label: "Information" },
            { value: "success", label: "Succés" },
            { value: "warning", label: "Avertissement" },
            { value: "error", label: "Erreur" },
          ],
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "message",
          label: "Message",
          type: "textarea",
          default: "Ceci est un message d'information.",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "dismissible",
          label: "Fermable",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "icon",
          label: "Icône",
          type: "text",
          default: "9",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "alert-icon" }, content: "9", selectable: false, hoverable: false, editable: false },
        {
          tagName: "div",
          attributes: { class: "alert-content" },
          content: "Ceci est un message d'information.",
          selectable: false,
          hoverable: false,
          editable: false,
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:alertType change:message change:dismissible change:icon", this.updateAlert);
      if (typeof document !== "undefined") {
        this._dismissHandler = (e) => {
          const closeBtn = e.target.closest(".alert-close");
          if (!closeBtn) return;
          const alertEl = closeBtn.closest(".alert-component");
          if (alertEl) alertEl.style.display = "none";
        };
        document.addEventListener("click", this._dismissHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._dismissHandler) {
        document.removeEventListener("click", this._dismissHandler);
        this._dismissHandler = null;
      }
    },

    updateAlert() {
      const el = this.view?.el;
      if (!el) return;
      const type = this.get("alertType") || "info";
      const message = this.get("message") || "";
      const dismissible = this.get("dismissible");
      const icon = this.get("icon") || "9";

      el.className = `alert-component alert-${type}`;
      if (dismissible) {
        el.setAttribute("data-dismissible", "true");
      } else {
        el.removeAttribute("data-dismissible");
      }

      const iconEl = el.querySelector(".alert-icon");
      if (iconEl) iconEl.textContent = icon;

      const contentEl = el.querySelector(".alert-content");
      if (contentEl) contentEl.textContent = message;

      let closeBtn = el.querySelector(".alert-close");
      if (dismissible) {
        if (!closeBtn) {
          closeBtn = document.createElement("button");
          closeBtn.className = "alert-close";
          closeBtn.innerHTML = "&times;";
          closeBtn.setAttribute("type", "button");
          el.appendChild(closeBtn);
        }
      } else if (closeBtn) {
        closeBtn.remove();
      }
    },
  },
};
