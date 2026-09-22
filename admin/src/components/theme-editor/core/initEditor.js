import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import outlinesCss from "./editorStructureOutlines.css?raw";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import gjsBlocksBasic from "grapesjs-blocks-basic";
import gjsPluginForms from "grapesjs-plugin-forms";
import gjsNavbar from "grapesjs-navbar";
import gjsCountdown from "grapesjs-component-countdown";
import gjsCustomCode from "grapesjs-custom-code";
import gjsPluginExport from "grapesjs-plugin-export";
import gjsTabs from "grapesjs-tabs";
import gjsTooltip from "grapesjs-tooltip";
import gjsTuiImageEditor from "grapesjs-tui-image-editor";
import gjsStyleGradient from "grapesjs-style-gradient";
import gjsTouch from "grapesjs-touch";

import { DEVICES } from "./editorDevices";
// EDITOR_STORAGE is intentionally not used  persistence is handled by
// EditorProvider's debounced autosave to the backend (PUT /pages/:id).
// GrapesJS's built-in storageManager is disabled (false) to avoid conflicts.
import registerBlocksPlugin from "../plugins/registerBlocks";
import registerAssetsPlugin from "../plugins/registerAssets";
import registerTraitsPlugin from "../plugins/registerTraits";
import registerCommandsPlugin from "../plugins/registerCommands";
import registerPanelsPlugin from "../plugins/registerPanels";

export const initEditor = (containerRef, getStoreId) => {
  const editor = grapesjs.init({
    container: containerRef,
    fromElement: false,
    height: "100%",
    width: "100%",
    // storageManager: false  all persistence is done via EditorProvider autosave
    storageManager: false,

    canvas: {
      styles: [
        "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css",
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
      ],
    },

    panels: { defaults: [] },

    deviceManager: { devices: DEVICES },

    blockManager: { appendTo: "#gjs-blocks" },
    layerManager: { appendTo: "#gjs-layers" },

    styleManager: {
      appendTo: "#gjs-styles",
      sectors: [
        { name: "General", open: false, buildProps: ["float", "display", "position", "top", "right", "left", "bottom"] },
        { name: "Dimension", open: false, buildProps: ["width", "height", "max-width", "min-height", "margin", "padding"] },
        { name: "Typography", open: false, buildProps: ["font-family", "font-size", "font-weight", "letter-spacing", "color", "line-height", "text-align", "text-shadow"] },
        { name: "Decorations", open: false, buildProps: ["opacity", "border-radius", "border", "box-shadow", "background", "background-color"] },
      ],
    },

    traitManager: { appendTo: "#gjs-traits" },

    assetManager: {
      // Must be a non-empty string for GrapesJS to show the upload UI
      // Actual upload is handled by the custom uploadFile override in registerAssets
      upload: "custom",
      uploadName: "file",
      multiUpload: true,
      showUrlInput: true,
      autoAdd: true,
    },

    plugins: [
      gjsPresetWebpage,
      gjsBlocksBasic,
      gjsPluginForms,
      gjsNavbar,
      gjsCountdown,
      gjsCustomCode,
      gjsPluginExport,
      gjsTabs,
      gjsTooltip,
      gjsTuiImageEditor,
      gjsStyleGradient,
      gjsTouch,
    ],
    pluginsOpts: {
      [gjsPresetWebpage]: {
        modalImportTitle: "Import Template",
        modalImportLabel: "<div style='margin-bottom:10px;font-size:13px'>Paste HTML/CSS below</div>",
        modalImportContent: "",
      },
      [gjsBlocksBasic]: { flexGrid: true },
      [gjsPluginForms]: {},
      [gjsNavbar]: {},
      [gjsCountdown]: {},
      [gjsCustomCode]: {},
      [gjsPluginExport]: {},
      [gjsTabs]: { tabsBlock: { category: "Extra" } },
      [gjsTooltip]: {},
      [gjsTuiImageEditor]: {
        script: [
          "https://uicdn.toast.com/tui.code-snippet/v1.5.2/tui-code-snippet.min.js",
          "https://uicdn.toast.com/tui-color-picker/v2.2.7/tui-color-picker.min.js",
          "https://uicdn.toast.com/tui-image-editor/v3.15.2/tui-image-editor.min.js",
        ],
        style: [
          "https://uicdn.toast.com/tui-color-picker/v2.2.7/tui-color-picker.min.css",
          "https://uicdn.toast.com/tui-image-editor/v3.15.2/tui-image-editor.min.css",
        ],
      },
      [gjsStyleGradient]: {},
      [gjsTouch]: {},
    },
  });

  const injectStructureOutlinesInCanvas = (editor) => {
    try {
      const frame = editor.Canvas?.getFrameEl?.();
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc || doc.getElementById("ts-structure-outlines")) return;
      const styleEl = doc.createElement("style");
      styleEl.id = "ts-structure-outlines";
      styleEl.textContent = outlinesCss;
      (doc.head || doc.documentElement).appendChild(styleEl);
    } catch (e) {
      console.debug("injectStructureOutlinesInCanvas failed", e);
    }
  };

  const attachAccordionCanvasDelegation = (editor) => {
    try {
      const frame = editor.Canvas?.getFrameEl?.();
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc || doc.getElementById("ts-accordion-delegation")) return;

      const marker = doc.createElement("div");
      marker.id = "ts-accordion-delegation";
      marker.style.display = "none";
      (doc.body || doc.documentElement).appendChild(marker);

      doc.addEventListener("click", function (event) {
        const header = event.target.closest(".accordion-header");
        if (!header) return;

        const item = header.closest(".accordion-item");
        if (!item) return;

        const root = item.closest(".accordion-component");
        if (!root) return;

        event.preventDefault();

        const multiple = root.getAttribute("data-multiple-open") === "true";
        if (!multiple) {
          root.querySelectorAll(".accordion-item.open").forEach((openItem) => {
            if (openItem !== item) openItem.classList.remove("open");
          });
        }

        item.classList.toggle("open");
      });
    } catch (e) {
      console.debug("attachAccordionCanvasDelegation failed", e);
    }
  };

  const attachGalleryLightbox = (editor) => {
    try {
      const frame = editor.Canvas?.getFrameEl?.();
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc || doc.getElementById("ts-gallery-lightbox")) return;

      const marker = doc.createElement("div");
      marker.id = "ts-gallery-lightbox";
      marker.style.display = "none";
      (doc.body || doc.documentElement).appendChild(marker);

      let lightboxOverlay = null;

      const openLightbox = (images, startIndex) => {
        if (!lightboxOverlay) {
          lightboxOverlay = doc.createElement("div");
          lightboxOverlay.id = "gallery-lightbox-overlay";
          lightboxOverlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:99999;cursor:pointer;";
          const img = doc.createElement("img");
          img.id = "gallery-lightbox-img";
          img.style.cssText = "max-width:90%;max-height:90%;object-fit:contain;border-radius:4px;";
          lightboxOverlay.appendChild(img);
          const closeBtn = doc.createElement("button");
          closeBtn.id = "gallery-lightbox-close";
          closeBtn.textContent = "";
          closeBtn.style.cssText = "position:absolute;top:20px;right:30px;background:none;border:none;color:white;font-size:36px;cursor:pointer;";
          lightboxOverlay.appendChild(closeBtn);
          const prevBtn = doc.createElement("button");
          prevBtn.id = "gallery-lightbox-prev";
          prevBtn.textContent = "9";
          prevBtn.style.cssText = "position:absolute;left:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:20px;border-radius:50%;";
          lightboxOverlay.appendChild(prevBtn);
          const nextBtn = doc.createElement("button");
          nextBtn.id = "gallery-lightbox-next";
          nextBtn.textContent = ":";
          nextBtn.style.cssText = "position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:20px;border-radius:50%;";
          lightboxOverlay.appendChild(nextBtn);
          (doc.body || doc.documentElement).appendChild(lightboxOverlay);

          let currentIndex = startIndex;
          const updateImage = () => {
            const imgEl = lightboxOverlay.querySelector("#gallery-lightbox-img");
            if (imgEl && images[currentIndex]) {
              imgEl.src = images[currentIndex];
            }
          };
          const close = () => { lightboxOverlay.style.display = "none"; };
          const showPrev = () => { currentIndex = (currentIndex - 1 + images.length) % images.length; updateImage(); };
          const showNext = () => { currentIndex = (currentIndex + 1) % images.length; updateImage(); };

          closeBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); });
          lightboxOverlay.addEventListener("click", (e) => { if (e.target === lightboxOverlay) close(); });
          prevBtn.addEventListener("click", (e) => { e.stopPropagation(); showPrev(); });
          nextBtn.addEventListener("click", (e) => { e.stopPropagation(); showNext(); });
          doc.addEventListener("keydown", (e) => {
            if (lightboxOverlay.style.display === "none") return;
            if (e.key === "Escape") close();
            if (e.key === "ArrowLeft") showPrev();
            if (e.key === "ArrowRight") showNext();
          });
        }

        const imgEl = lightboxOverlay.querySelector("#gallery-lightbox-img");
        if (imgEl && images[startIndex]) {
          imgEl.src = images[startIndex];
        }
        lightboxOverlay.style.display = "flex";
      };

      doc.addEventListener("click", function (event) {
        const item = event.target.closest(".gallery-item");
        if (!item) return;
        const root = item.closest(".image-gallery-component");
        if (!root) return;
        event.preventDefault();
        event.stopPropagation();
        const imgs = Array.from(root.querySelectorAll(".gallery-item img")).map((img) => img.getAttribute("src")).filter(Boolean);
        const index = Array.from(root.querySelectorAll(".gallery-item")).indexOf(item);
        if (imgs.length > 0) openLightbox(imgs, Math.max(0, index));
      });
    } catch (e) {
      console.debug("attachGalleryLightbox failed", e);
    }
  };

  const attachProgressBarScroll = (editor) => {
    try {
      const frame = editor.Canvas?.getFrameEl?.();
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc || doc.getElementById("ts-progress-bar-scroll")) return;

      const marker = doc.createElement("div");
      marker.id = "ts-progress-bar-scroll";
      marker.style.display = "none";
      (doc.body || doc.documentElement).appendChild(marker);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.getAttribute("data-progress-target") || "0", 10);
          const duration = parseInt(el.getAttribute("data-progress-duration") || "1500", 10);
          const fill = el.querySelector(".progress-bar-fill");
          if (fill) {
            fill.style.width = "0%";
            requestAnimationFrame(() => {
              fill.style.transition = `width ${duration}ms ease-out`;
              fill.style.width = `${target}%`;
            });
          }
          observer.unobserve(el);
        });
      }, { threshold: 0.2 });

      doc.querySelectorAll(".progress-bar-component").forEach((el) => observer.observe(el));
    } catch (e) {
      console.debug("attachProgressBarScroll failed", e);
    }
  };

  const loadGoogleFontsInCanvas = (editor) => {
    try {
      const frame = editor.Canvas?.getFrameEl?.();
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc) return;
      const fonts = ["Inter:400,500,600,700", "Roboto:400,500,700", "Open Sans:400,600,700", "Poppins:400,500,600,700", "Raleway:400,500,600,700", "Montserrat:400,500,600,700", "Outfit:400,500,600,700", "Space Grotesk:400,500,600,700", "Plus Jakarta Sans:400,500,600,700", "DM Sans:400,500,700", "Playfair Display:400,600,700", "Merriweather:400,700", "Lora:400,500,700", "Work Sans:400,500,600", "Manrope:400,500,600,700", "Urbanist:400,500,600,700", "Sora:400,500,600,700"];
      const url = `https://fonts.googleapis.com/css2?family=${fonts.join("&family=")}&display=swap`;
      let link = doc.getElementById("ts-google-fonts");
      if (!link) {
        link = doc.createElement("link");
        link.id = "ts-google-fonts";
        link.rel = "stylesheet";
        link.href = url;
        (doc.head || doc.documentElement).appendChild(link);
      } else {
        link.href = url;
      }
    } catch (e) {
      console.debug("loadGoogleFontsInCanvas failed", e);
    }
  };

  editor.on("canvas:frame:load", () => {
    injectStructureOutlinesInCanvas(editor);
    attachAccordionCanvasDelegation(editor);
    attachGalleryLightbox(editor);
    attachProgressBarScroll(editor);
    loadGoogleFontsInCanvas(editor);
  });

  editor.on("load", () => {
    injectStructureOutlinesInCanvas(editor);
    attachAccordionCanvasDelegation(editor);
    attachGalleryLightbox(editor);
    attachProgressBarScroll(editor);
    loadGoogleFontsInCanvas(editor);
  });

  editor.on("component:create", (component) => {
    const model = component;
    if (model && typeof model.init === "function" && !model.__initCalled) {
      model.__initCalled = true;
      model.init();
    }
  });

  registerAssetsPlugin(editor);
  registerBlocksPlugin(editor);
  registerTraitsPlugin(editor);
  registerCommandsPlugin(editor, getStoreId);
  registerPanelsPlugin(editor);

  return editor;
};
