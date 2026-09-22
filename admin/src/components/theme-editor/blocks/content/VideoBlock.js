/**
 * Video Block - video embed with autoplay/loop/controls
 */

export const VideoBlock = {
  id: "video-block",
  label: "< Video",
  category: "Base",
  content: {
    type: "video-component",
  },
  attributes: { class: "fa fa-video-camera" },
};

export const VideoComponent = {
  isComponent: (el) => el.classList && el.classList.contains("video-component"),
  model: {
    defaults: {
      type: "video-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "video-component" },
      styles: `
        .video-component {
          width: 100%;
          max-width: 100%;
          position: relative;
          padding-top: 56.25%;
          overflow: hidden;
        }
        .video-component iframe,
        .video-component video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
      `,
      components: [
        {
          tagName: "iframe",
          attributes: {
            src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            class: "video-iframe",
            frameborder: "0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowfullscreen: true,
            selectable: false,
            hoverable: false,
            editable: false,
          },
        },
      ],
      traits: [
        {
          name: "videoSource",
          label: "Source",
          type: "text",
          default: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "autoplay",
          label: "Autoplay",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "loop",
          label: "Loop",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "controls",
          label: "Contrôles",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:videoSource", this.updateSource);
      this.on("change:autoplay", this.updateSource);
      this.on("change:loop", this.updateSource);
      this.on("change:controls", this.updateSource);
    },

    updateSource() {
      const src = this.get("videoSource") || "";
      const autoplay = this.get("autoplay") ? 1 : 0;
      const loop = this.get("loop") ? 1 : 0;
      const controls = this.get("controls") ? 1 : 0;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = new URL(src, origin);
      if (src.includes("youtube.com") || src.includes("youtu.be")) {
        const videoId = src.includes("youtu.be") ? src.split("/").pop() : url.searchParams.get("v");
        if (videoId) {
          const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&loop=${loop}&controls=${controls}&rel=0`;
          this._setIframeSrc(embedUrl);
          return;
        }
      }
      if (src.includes("vimeo.com")) {
        const segments = src.split("/");
        const videoId = segments[segments.length - 1];
        if (videoId) {
          const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay}&loop=${loop}&title=0&byline=0&portrait=0`;
          this._setIframeSrc(embedUrl);
          return;
        }
      }
      this._setIframeSrc(src);
    },

    _setIframeSrc(src) {
      const iframe = this.view?.el?.querySelector("iframe");
      if (iframe) {
        iframe.src = src;
      }
    },
  },
};
