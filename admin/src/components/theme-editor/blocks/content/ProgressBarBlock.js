export const ProgressBarBlock = {
  id: "progress-bar-block",
  label: "= Progress Bar",
  category: "Content",
  content: {
    type: "progress-bar-component",
  },
  attributes: { class: "fa fa-tasks" },
};

export const ProgressBarComponent = {
  isComponent: (el) => el.classList && el.classList.contains("progress-bar-component"),
  model: {
    defaults: {
      type: "progress-bar-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "progress-bar-component", "data-progress-target": "75", "data-progress-duration": "1500" },
      styles: `
        .progress-bar-component {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .progress-bar-track {
          width: 100%;
          height: var(--progress-height, 12px);
          background: var(--progress-bg, #e5e7eb);
          border-radius: var(--progress-radius, 999px);
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          width: 0%;
          background: var(--progress-fill, #667eea);
          border-radius: var(--progress-radius, 999px);
          transition: width var(--progress-duration, 1.5s) ease-out;
        }
        .progress-bar-label {
          font-size: var(--progress-label-size, 14px);
          font-weight: 600;
          color: var(--progress-text-color, #374151);
        }
        .progress-bar-percentage {
          font-size: var(--progress-percentage-size, 12px);
          color: var(--progress-text-color, #6b7280);
          text-align: right;
        }
      `,
      traits: [
        {
          name: "percentage",
          label: "Pourcentage",
          type: "number",
          default: 75,
          min: 0,
          max: 100,
          step: 1,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "label",
          label: "Label",
          type: "text",
          default: "Compétence",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showPercentageText",
          label: "Afficher le pourcentage",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "height",
          label: "Hauteur (px)",
          type: "number",
          default: 12,
          min: 4,
          max: 40,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "radius",
          label: "Arrondi (px)",
          type: "number",
          default: 999,
          min: 0,
          max: 999,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "duration",
          label: "Duré animation (ms)",
          type: "number",
          default: 1500,
          min: 200,
          max: 5000,
          step: 100,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "fillColor",
          label: "Couleur de la barre",
          type: "color",
          default: "#667eea",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "bgColor",
          label: "Couleur du fond",
          type: "color",
          default: "#e5e7eb",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "textColor",
          label: "Couleur du texte",
          type: "color",
          default: "#374151",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "labelSize",
          label: "Taille label (px)",
          type: "number",
          default: 14,
          min: 10,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "percentageSize",
          label: "Taille pourcentage (px)",
          type: "number",
          default: 12,
          min: 10,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "progress-bar-label" }, content: "Compétence", selectable: false, hoverable: false, editable: false },
        {
          tagName: "div",
          attributes: { class: "progress-bar-track" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            { tagName: "div", attributes: { class: "progress-bar-fill" }, content: "", selectable: false, hoverable: false, editable: false },
          ],
        },
        { tagName: "div", attributes: { class: "progress-bar-percentage" }, content: "75%", selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:percentage change:label change:showPercentageText change:height change:radius change:duration change:fillColor change:bgColor change:textColor change:labelSize change:percentageSize", this.updateProgressBar);
    },

    updateProgressBar() {
      const el = this.view?.el;
      if (!el) return;
      const percentage = Math.min(100, Math.max(0, Number(this.get("percentage")) || 0));
      const label = this.get("label") || "";
      const showPct = this.get("showPercentageText");
      const height = this.get("height") || 12;
      const radius = this.get("radius") || 999;
      const duration = this.get("duration") || 1500;
      const fillColor = this.get("fillColor") || "#667eea";
      const bgColor = this.get("bgColor") || "#e5e7eb";
      const textColor = this.get("textColor") || "#374151";
      const labelSize = this.get("labelSize") || 14;
      const percentageSize = this.get("percentageSize") || 12;

      el.setAttribute("data-progress-target", String(percentage));
      el.setAttribute("data-progress-duration", String(duration));
      el.style.setProperty("--progress-height", `${height}px`);
      el.style.setProperty("--progress-radius", `${radius}px`);
      el.style.setProperty("--progress-fill", fillColor);
      el.style.setProperty("--progress-bg", bgColor);
      el.style.setProperty("--progress-text-color", textColor);
      el.style.setProperty("--progress-label-size", `${labelSize}px`);
      el.style.setProperty("--progress-percentage-size", `${percentageSize}px`);

      const fill = el.querySelector(".progress-bar-fill");
      if (fill) {
        fill.style.width = `${percentage}%`;
        fill.style.transition = `width ${duration}ms ease-out`;
      }

      const labelEl = el.querySelector(".progress-bar-label");
      if (labelEl) labelEl.textContent = label;

      const pctEl = el.querySelector(".progress-bar-percentage");
      if (pctEl) {
        if (showPct) {
          pctEl.textContent = `${percentage}%`;
          pctEl.style.display = "";
        } else {
          pctEl.style.display = "none";
        }
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:percentage change:label change:showPercentageText change:height change:radius change:duration change:fillColor change:bgColor change:textColor change:labelSize change:percentageSize", () => {
        this.model.updateProgressBar();
      });
    },
    onRender() {
      this.model.updateProgressBar();
    },
  },
};
