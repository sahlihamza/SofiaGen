export const GoogleMapsBlock = {
  id: "google-maps-block",
  label: "= Google Maps",
  category: "Content",
  content: {
    type: "google-maps-component",
  },
  attributes: { class: "fa fa-map-marker-alt" },
};

export const GoogleMapsComponent = {
  isComponent: (el) => el.classList && el.classList.contains("google-maps-component"),
  model: {
    defaults: {
      type: "google-maps-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "google-maps-component" },
      styles: `
        .google-maps-component {
          width: 100%;
          border-radius: var(--maps-radius, 8px);
          overflow: hidden;
        }
        .google-maps-component iframe {
          width: 100%;
          border: 0;
          display: block;
        }
      `,
      traits: [
        {
          name: "address",
          label: "Adresse",
          type: "text",
          default: "Paris, France",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "zoom",
          label: "Zoom",
          type: "number",
          default: 14,
          min: 1,
          max: 20,
          step: 1,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "height",
          label: "Hauteur (px)",
          type: "number",
          default: 300,
          min: 100,
          max: 800,
          step: 10,
          changeProp: 1,
          category: "style",
          section: "Style",
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
      ],
      components: [
        {
          tagName: "iframe",
          attributes: {
            src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d83998.94731039496!2l2.2646343082218384!3d48.858823572055216!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e1f06e2b70f%3A0x40b82c3688c9460!2sParis%2C%20France!5e0!3m2!1sfr!2sfr!4v1689999999999!5m2!1sfr!2sfr",
            allowfullscreen: "",
            loading: "lazy",
            referrerpolicy: "no-referrer-when-downgrade",
            style: "width:100%;height:300px;border:0;",
            selectable: false,
            hoverable: false,
            editable: false,
          },
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:address change:zoom change:height change:radius", this.updateMap);
    },

    updateMap() {
      const el = this.view?.el;
      if (!el) return;
      const address = encodeURIComponent(this.get("address") || "Paris, France");
      const zoom = this.get("zoom") || 14;
      const height = this.get("height") || 300;
      const radius = this.get("radius") || 8;

      el.style.setProperty("--maps-radius", `${radius}px`);
      el.style.borderRadius = `${radius}px`;
      el.style.overflow = "hidden";

      const iframe = el.querySelector("iframe");
      if (iframe) {
        iframe.style.height = `${height}px`;
        iframe.src = `https://www.google.com/maps?q=${address}&z=${zoom}&output=embed`;
      }
    },
  },
};
