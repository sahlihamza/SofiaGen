export const FlipBoxBlock = {
  id: "flip-box-block",
  label: "= Flip Box",
  category: "Content",
  content: {
    type: "flip-box-component",
  },
  attributes: { class: "fa fa-exchange-alt" },
};

export const FlipBoxComponent = {
  isComponent: (el) => el.classList && el.classList.contains("flip-box-component"),
  model: {
    defaults: {
      type: "flip-box-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "flip-box-component", "data-placeholder-content": "true" },
      styles: `
        .flip-box-component {
          width: 100%;
          perspective: 1000px;
        }
        .flip-box-inner {
          position: relative;
          width: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-box-component:hover .flip-box-inner {
          transform: rotateY(180deg);
        }
        .flip-box-front,
        .flip-box-back {
          width: 100%;
          backface-visibility: hidden;
          border-radius: var(--flip-radius, 8px);
          overflow: hidden;
        }
        .flip-box-back {
          position: absolute;
          top: 0;
          left: 0;
          transform: rotateY(180deg);
        }
      `,
      traits: [
        {
          name: "frontTitle",
          label: "Titre recto",
          type: "text",
          default: "Recto",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "frontContent",
          label: "Contenu recto",
          type: "textarea",
          default: "Contenu de la face avant.",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "backTitle",
          label: "Titre verso",
          type: "text",
          default: "Verso",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "backContent",
          label: "Contenu verso",
          type: "textarea",
          default: "Contenu de la face arrière.",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "frontBgColor",
          label: "Couleur fond recto",
          type: "color",
          default: "#ffffff",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "backBgColor",
          label: "Couleur fond verso",
          type: "color",
          default: "#667eea",
          changeProp: 1,
          category: "style",
          section: "Couleurs",
        },
        {
          name: "radius",
          label: "Arrondi (px)",
          type: "number",
          default: 8,
          min: 0,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "height",
          label: "Hauteur (px)",
          type: "number",
          default: 250,
          min: 100,
          max: 600,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "flip-box-inner" }, selectable: false, hoverable: false, editable: false, components: [
          { tagName: "div", attributes: { class: "flip-box-front" }, selectable: false, hoverable: false, editable: false, components: [
            { tagName: "h3", content: "Recto", selectable: false, hoverable: false, editable: false },
            { tagName: "p", content: "Contenu de la face avant.", selectable: false, hoverable: false, editable: false },
          ]},
          { tagName: "div", attributes: { class: "flip-box-back" }, selectable: false, hoverable: false, editable: false, components: [
            { tagName: "h3", content: "Verso", selectable: false, hoverable: false, editable: false },
            { tagName: "p", content: "Contenu de la face arrière.", selectable: false, hoverable: false, editable: false },
          ]},
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:frontTitle change:frontContent change:backTitle change:backContent change:frontBgColor change:backBgColor change:radius change:height", this.updateFlipBox);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
    },

    buildIfFresh() {
      if (this.components().length === 0) this.syncFlipBox();
    },

    syncFlipBox() {
      this.components().reset();
      this.setAttributes({ "data-placeholder-content": "true" });

      const inner = this.append({ tagName: "div", attributes: { class: "flip-box-inner" }, droppable: false, components: [
        { tagName: "div", attributes: { class: "flip-box-front" }, droppable: false, components: [
          { tagName: "h3", content: this.get("frontTitle") || "Recto" },
          { tagName: "p", content: this.get("frontContent") || "Contenu de la face avant." },
        ]},
        { tagName: "div", attributes: { class: "flip-box-back" }, droppable: false, components: [
          { tagName: "h3", content: this.get("backTitle") || "Verso" },
          { tagName: "p", content: this.get("backContent") || "Contenu de la face arrière." },
        ]},
      ] })[0];

      this.updateFlipBox();
    },

    updateFlipBox() {
      const el = this.view?.el;
      if (!el) return;
      const frontBg = this.get("frontBgColor") || "#ffffff";
      const backBg = this.get("backBgColor") || "#667eea";
      const radius = this.get("radius") || 8;
      const height = this.get("height") || 250;
      const frontTitle = this.get("frontTitle") || "Recto";
      const frontContent = this.get("frontContent") || "";
      const backTitle = this.get("backTitle") || "Verso";
      const backContent = this.get("backContent") || "";

      el.style.setProperty("--flip-radius", `${radius}px`);
      const frontEl = el.querySelector(".flip-box-front");
      const backEl = el.querySelector(".flip-box-back");
      if (frontEl) {
        frontEl.style.background = frontBg;
        frontEl.style.height = `${height}px`;
        frontEl.style.padding = "24px";
        frontEl.style.display = "flex";
        frontEl.style.flexDirection = "column";
        frontEl.style.justifyContent = "center";
        const h3 = frontEl.querySelector("h3");
        const p = frontEl.querySelector("p");
        if (h3) h3.textContent = frontTitle;
        if (p) p.textContent = frontContent;
      }
      if (backEl) {
        backEl.style.background = backBg;
        backEl.style.height = `${height}px`;
        backEl.style.padding = "24px";
        backEl.style.display = "flex";
        backEl.style.flexDirection = "column";
        backEl.style.justifyContent = "center";
        backEl.style.color = "white";
        const h3 = backEl.querySelector("h3");
        const p = backEl.querySelector("p");
        if (h3) h3.textContent = backTitle;
        if (p) { p.textContent = backContent; p.style.color = "rgba(255,255,255,0.9)"; }
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:frontTitle change:frontContent change:backTitle change:backContent change:frontBgColor change:backBgColor change:radius change:height", () => {
        this.model.updateFlipBox();
      });
    },
    onRender() {
      this.model.updateFlipBox();
    },
  },
};
