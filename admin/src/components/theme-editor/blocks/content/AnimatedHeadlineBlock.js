export const AnimatedHeadlineBlock = {
  id: "animated-headline-block",
  label: "( Animated Headline",
  category: "Content",
  content: {
    type: "animated-headline-component",
  },
  attributes: { class: "fa fa-font" },
};

export const AnimatedHeadlineComponent = {
  isComponent: (el) => el.classList && el.classList.contains("animated-headline-component"),
  model: {
    defaults: {
      type: "animated-headline-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "animated-headline-component", "data-placeholder-content": "true" },
      styles: `
        .animated-headline-component {
          width: 100%;
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 36px;
          font-weight: 700;
          color: var(--ts-color-text-primary, #111827);
        }
        .animated-headline-static {
          display: inline;
        }
        .animated-headline-rotating {
          display: inline-block;
          color: var(--ts-color-primary, #667eea);
          position: relative;
        }
        .animated-headline-rotating::after {
          content: '|';
          animation: blink 1s step-start infinite;
          margin-left: 2px;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `,
      traits: [
        {
          name: "staticText",
          label: "Texte statique",
          type: "text",
          default: "Nous vendons des",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "rotatingWords",
          label: "Mots rotatifs (séparés par virgule)",
          type: "text",
          default: "vétements, chaussures, accessoires",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "rotationInterval",
          label: "Intervalle (ms)",
          type: "number",
          default: 2000,
          min: 500,
          max: 10000,
          step: 500,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
      ],
      components: [
        { tagName: "span", attributes: { class: "animated-headline-static" }, content: "Nous vendons des ", selectable: false, hoverable: false, editable: false },
        { tagName: "span", attributes: { class: "animated-headline-rotating" }, content: "vétements", selectable: false, hoverable: false, editable: false },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:staticText change:rotatingWords change:rotationInterval", this.updateHeadline);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
      this._interval = null;
    },

    buildIfFresh() {
      if (this.components().length === 0) this.syncHeadline();
    },

    syncHeadline() {
      this.components().reset();
      this.setAttributes({ "data-placeholder-content": "true" });

      const words = (this.get("rotatingWords") || "vétements, chaussures, accessoires").split(",").map((w) => w.trim()).filter(Boolean);
      const staticText = this.get("staticText") || "Nous vendons des";

      const staticSpan = { tagName: "span", attributes: { class: "animated-headline-static" }, content: staticText };
      const rotatingSpan = { tagName: "span", attributes: { class: "animated-headline-rotating" }, content: words[0] || "mot" };

      const wrapper = this.append({ tagName: "div", attributes: { class: "animated-headline-component" }, droppable: false, components: [staticSpan, rotatingSpan] })[0];

      this.updateHeadline();
    },

    updateHeadline() {
      const el = this.view?.el;
      if (!el) return;
      const rotatingEl = el.querySelector(".animated-headline-rotating");
      if (!rotatingEl) return;
      const words = (this.get("rotatingWords") || "vétements, chaussures, accessoires").split(",").map((w) => w.trim()).filter(Boolean);
      const interval = this.get("rotationInterval") || 2000;

      if (this._interval) clearInterval(this._interval);
      let idx = 0;
      rotatingEl.textContent = words[0] || "mot";
      this._interval = setInterval(() => {
        idx = (idx + 1) % words.length;
        if (rotatingEl) rotatingEl.textContent = words[idx] || "mot";
      }, interval);
    },
  },

  view: {
    onRender() {
      const model = this.model;
      const words = (model.get("rotatingWords") || "vétements, chaussures, accessoires").split(",").map((w) => w.trim()).filter(Boolean);
      const rotatingEl = this.el?.querySelector(".animated-headline-rotating");
      if (rotatingEl && words.length > 0) {
        rotatingEl.textContent = words[0];
        if (model._interval) clearInterval(model._interval);
        const interval = model.get("rotationInterval") || 2000;
        let idx = 0;
        model._interval = setInterval(() => {
          idx = (idx + 1) % words.length;
          if (rotatingEl) rotatingEl.textContent = words[idx];
        }, interval);
      }
    },

    onRemove() {
      if (this.model._interval) clearInterval(this.model._interval);
    },
  },
};
