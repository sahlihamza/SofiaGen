import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

export const HotspotBlock = {
  id: "hotspot-block",
  label: "= Hotspot",
  category: "Content",
  content: {
    type: "hotspot-component",
  },
  attributes: { class: "fa fa-map-marker-alt" },
};

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const HotspotComponent = {
  isComponent: (el) => el.classList && el.classList.contains("hotspot-component"),
  model: {
    defaults: {
      type: "hotspot-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "hotspot-component", "data-placeholder-content": "true" },
      styles: `
        .hotspot-component {
          position: relative;
          width: 100%;
          display: inline-block;
        }
        .hotspot-image {
          width: 100%;
          display: block;
          border-radius: var(--hotspot-radius, 8px);
        }
        .hotspot-point {
          position: absolute;
          width: var(--hotspot-point-size, 24px);
          height: var(--hotspot-point-size, 24px);
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          cursor: pointer;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.2s;
          z-index: 2;
        }
        .hotspot-point:hover {
          transform: translate(-50%, -50%) scale(1.2);
        }
        .hotspot-tooltip {
          position: absolute;
          bottom: calc(var(--hotspot-point-size, 24px) + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: #111827;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 3;
        }
        .hotspot-point:hover .hotspot-tooltip {
          opacity: 1;
        }
      `,
      traits: [
        {
          name: "image",
          label: "Image",
          type: "media-picker",
          default: placeholderImage,
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "points",
          label: "Points",
          type: "list",
          changeProp: 1,
          default: [
            { x: 30, y: 40, label: "Produit A", link: "#" },
            { x: 70, y: 60, label: "Produit B", link: "#" },
          ],
          itemSchema: [
            { key: "x", label: "X (%)", type: "number", default: 50 },
            { key: "y", label: "Y (%)", type: "number", default: 50 },
            { key: "label", label: "Label", type: "text", default: "Point" },
            { key: "link", label: "Lien", type: "text", default: "#" },
          ],
          category: "content",
          section: "Contenu",
        },
        {
          name: "pointSize",
          label: "Taille point (px)",
          type: "number",
          default: 24,
          min: 12,
          max: 48,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "radius",
          label: "Arrondi image (px)",
          type: "number",
          default: 8,
          min: 0,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:image change:points change:pointSize change:radius", this.updateHotspots);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());
      attachPlaceholderContentListener(this, ["change:points"]);
    },

    buildIfFresh() {
      if (this.components().length === 0) this.syncHotspots();
    },

    parsePoints() {
      let points = this.get("points") || [];
      try {
        if (typeof points === "string") points = JSON.parse(points);
      } catch (e) {
        points = [];
      }
      return points.length ? points : [{ x: 50, y: 50, label: "Point", link: "#" }];
    },

    syncHotspots() {
      const points = this.parsePoints();
      this.components().reset();
      this.setAttributes({ "data-placeholder-content": "true" });

      const wrapper = this.append({ tagName: "div", attributes: { class: "hotspot-wrapper", "data-hotspot-root": this.ccid || this.getId() }, selectable: false, hoverable: false, components: [] })[0];
      const img = wrapper.append({ tagName: "img", attributes: { class: "hotspot-image", src: this.get("image") || placeholderImage }, droppable: false, selectable: false, hoverable: false })[0];

      points.forEach((pt) => {
        const point = wrapper.append({
          tagName: "div",
          attributes: { class: "hotspot-point", style: `left:${pt.x}%;top:${pt.y}%` },
          droppable: false,
          selectable: false,
          hoverable: false,
          components: [
            { tagName: "div", attributes: { class: "hotspot-tooltip" }, content: pt.label || "Point", selectable: false, hoverable: false, editable: false },
          ],
        })[0];
        if (pt.link) {
          point.setAttributes({ "data-link": pt.link });
        }
      });

      this.updateHotspots();
    },

    updateHotspots() {
      const el = this.view?.el;
      if (!el) return;
      const pointSize = this.get("pointSize") || 24;
      const radius = this.get("radius") || 8;
      const points = this.parsePoints();
      el.style.setProperty("--hotspot-point-size", `${pointSize}px`);
      el.style.setProperty("--hotspot-radius", `${radius}px`);

      const wrapper = el.querySelector(".hotspot-wrapper");
      if (!wrapper) return;

      const img = wrapper.querySelector(".hotspot-image");
      if (img) img.src = this.get("image") || placeholderImage;

      wrapper.querySelectorAll(".hotspot-point").forEach((p, i) => {
        const pt = points[i];
        if (pt) {
          p.style.left = `${pt.x}%`;
          p.style.top = `${pt.y}%`;
          const tooltip = p.querySelector(".hotspot-tooltip");
          if (tooltip) tooltip.textContent = pt.label || "Point";
        }
      });
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:image change:points change:pointSize change:radius", () => {
        this.model.updateHotspots();
      });
    },
    onRender() {
      this.model.updateHotspots();
    },
  },
};
