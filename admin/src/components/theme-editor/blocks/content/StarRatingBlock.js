export const StarRatingBlock = {
  id: "star-rating-block",
  label: "P Star Rating",
  category: "Content",
  content: {
    type: "star-rating-component",
  },
  attributes: { class: "fa fa-star" },
};

export const StarRatingComponent = {
  isComponent: (el) => el.classList && el.classList.contains("star-rating-component"),
  model: {
    defaults: {
      type: "star-rating-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "star-rating-component", "data-rating": "4", "data-max-stars": "5" },
      styles: `
        .star-rating-component {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: var(--star-rating-size, 24px);
          color: var(--star-rating-empty, #d1d5db);
        }
        .star-rating-component .star-filled {
          color: var(--star-rating-filled, #f59e0b);
        }
        .star-rating-value {
          font-size: var(--star-rating-value-size, 14px);
          color: var(--star-rating-text-color, #6b7280);
          margin-left: 8px;
          font-weight: 600;
        }
      `,
      traits: [
        {
          name: "rating",
          label: "Note",
          type: "number",
          default: 4,
          min: 0,
          max: 5,
          step: 1,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "maxStars",
          label: "Nombre d'étoiles",
          type: "number",
          default: 5,
          min: 1,
          max: 10,
          step: 1,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showValue",
          label: "Afficher la note",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "starSize",
          label: "Taille des étoiles (px)",
          type: "number",
          default: 24,
          min: 12,
          max: 64,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showValueSize",
          label: "Taille texte note (px)",
          type: "number",
          default: 14,
          min: 10,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "filledColor",
          label: "Couleur étoiles pleines",
          type: "color",
          default: "#f59e0b",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "emptyColor",
          label: "Couleur étoiles vides",
          type: "color",
          default: "#d1d5db",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "textColor",
          label: "Couleur texte note",
          type: "color",
          default: "#6b7280",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "star-rating-value" }, content: "4/5", selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:rating change:maxStars change:showValue change:starSize change:showValueSize change:filledColor change:emptyColor change:textColor", this.updateRating);
    },

    updateRating() {
      const el = this.view?.el;
      if (!el) return;
      const rating = Math.min(5, Math.max(0, Number(this.get("rating")) || 0));
      const maxStars = Math.max(1, Number(this.get("maxStars")) || 5);
      const showValue = this.get("showValue");
      const starSize = this.get("starSize") || 24;
      const showValueSize = this.get("showValueSize") || 14;
      const filledColor = this.get("filledColor") || "#f59e0b";
      const emptyColor = this.get("emptyColor") || "#d1d5db";
      const textColor = this.get("textColor") || "#6b7280";

      el.setAttribute("data-rating", String(rating));
      el.setAttribute("data-max-stars", String(maxStars));
      el.style.setProperty("--star-rating-size", `${starSize}px`);
      el.style.setProperty("--star-rating-value-size", `${showValueSize}px`);
      el.style.setProperty("--star-rating-filled", filledColor);
      el.style.setProperty("--star-rating-empty", emptyColor);
      el.style.setProperty("--star-rating-text-color", textColor);

      let starsHtml = "";
      for (let i = 1; i <= maxStars; i++) {
        const filled = i <= Math.round(rating) ? "star-filled" : "";
        starsHtml += `<span class="${filled}"></span>`;
      }
      el.innerHTML = starsHtml;

      const valueEl = el.querySelector(".star-rating-value");
      if (showValue) {
        if (!valueEl && typeof document !== "undefined") {
          const span = document.createElement("span");
          span.className = "star-rating-value";
          span.textContent = `${rating}/${maxStars}`;
          el.appendChild(span);
        } else if (valueEl) {
          valueEl.textContent = `${rating}/${maxStars}`;
        }
      } else if (valueEl) {
        valueEl.remove();
      }
    },
  },
};
