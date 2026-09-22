import ProductServices from "@/services/ProductServices";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";

export const ProductImagesBlock = {
  id: "product-images-block",
  label: "= Product Images",
  category: "E-Commerce",
  content: {
    type: "product-images-component",
  },
  attributes: { class: "fa fa-images" },
};

export const ProductImagesComponent = {
  isComponent: (el) => el.classList && el.classList.contains("product-images-component"),
  model: {
    defaults: {
      type: "product-images-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "product-images-component", "data-placeholder-content": "true" },
      styles: `
        .product-images-component {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .product-main-image-wrap {
          position: relative;
          overflow: hidden;
          border-radius: var(--ts-card-radius, 8px);
          cursor: zoom-in;
          background: #f3f4f6;
        }
        .product-main-image {
          width: 100%;
          aspect-ratio: 1/1;
          object-fit: cover;
          transition: transform 0.3s ease;
          display: block;
        }
        .product-main-image-wrap.zoom-hover .product-main-image:hover {
          transform: scale(1.05);
        }
        .product-image-count {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0,0,0,0.6);
          color: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .product-lightbox {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.9);
          z-index: 99999;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .product-lightbox.open {
          display: flex;
        }
        .product-lightbox img {
          max-width: 90vw;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 8px;
        }
        .product-lightbox-close {
          position: absolute;
          top: 20px;
          right: 30px;
          background: none;
          border: none;
          color: white;
          font-size: 32px;
          cursor: pointer;
          z-index: 1;
        }
        .product-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          font-size: 24px;
          padding: 12px 16px;
          cursor: pointer;
          border-radius: 50%;
        }
        .product-lightbox-nav.prev { left: 20px; }
        .product-lightbox-nav.next { right: 20px; }
        .product-thumbnails {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .product-thumbnail {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid transparent;
          background: #f3f4f6;
          transition: border-color 0.2s;
        }
        .product-thumbnail:hover {
          border-color: #667eea;
        }
        .product-thumbnail.active {
          border-color: var(--ts-color-primary, #667eea);
        }
      `,
      traits: [
        {
          name: "productId",
          label: "Product ID",
          type: "text",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "showThumbnails",
          label: "Afficher les miniatures",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "mainImageRadius",
          label: "Arrondi image principale (px)",
          type: "number",
          default: 8,
          min: 0,
          max: 24,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "zoomOnHover",
          label: "Zoom au survol",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showLightbox",
          label: "Afficher lightbox",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
        {
          name: "showImageCount",
          label: "Afficher compteur d'images",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Style",
        },
      ],
      components: [
        { tagName: "div", attributes: { class: "product-main-image-wrap", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "img", attributes: { class: "product-main-image", src: placeholderImage, alt: "Image du produit" } },
        ]},
        { tagName: "div", attributes: { class: "product-thumbnails", selectable: false, hoverable: false, editable: false } },
        { tagName: "div", attributes: { class: "product-lightbox", selectable: false, hoverable: false, editable: false }, components: [
          { tagName: "button", attributes: { class: "product-lightbox-close", type: "button", selectable: false, hoverable: false, editable: false }, content: "" },
          { tagName: "button", attributes: { class: "product-lightbox-nav prev", type: "button", selectable: false, hoverable: false, editable: false }, content: "9" },
          { tagName: "button", attributes: { class: "product-lightbox-nav next", type: "button", selectable: false, hoverable: false, editable: false }, content: ":" },
          { tagName: "img", attributes: { class: "product-lightbox-img", src: "", alt: "", selectable: false, hoverable: false, editable: false } },
        ]},
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this._lightboxIdx = 0;
      this._lightboxImages = [];
      this.on("change:productId change:showThumbnails change:mainImageRadius change:zoomOnHover change:showLightbox change:showImageCount", this.updateImages);
      this.loadProduct();
      if (typeof document !== "undefined") {
        this._thumbHandler = (e) => {
          const thumb = e.target.closest(".product-thumbnail");
          if (!thumb || !this.view) return;
          const container = this.view.el.querySelector(".product-thumbnails");
          const mainImg = this.view.el.querySelector(".product-main-image");
          if (!container || !mainImg) return;
          const idx = parseInt(thumb.dataset.index, 10);
          container.querySelectorAll(".product-thumbnail").forEach((t) => t.classList.remove("active"));
          thumb.classList.add("active");
          const product = this.get("productData");
          if (product?.productGallery?.[idx]?.image) {
            mainImg.src = product.productGallery[idx].image;
          }
        };
        this._mainImgHandler = (e) => {
          if (!this.get("showLightbox")) return;
          const mainWrap = e.target.closest(".product-main-image-wrap");
          if (!mainWrap) return;
          const img = mainWrap.querySelector(".product-main-image");
          if (!img) return;
          const product = this.get("productData");
          if (!product?.productGallery?.length) return;
          this._lightboxImages = product.productGallery.map((g) => g.image);
          this._lightboxIdx = product.productGallery.findIndex((g) => g.image === img.src);
          if (this._lightboxIdx < 0) this._lightboxIdx = 0;
          this.openLightbox();
        };
        this._lightboxCloseHandler = (e) => {
          if (e.target.closest(".product-lightbox-close") || e.target.classList.contains("product-lightbox")) {
            this.closeLightbox();
          }
        };
        this._lightboxNavHandler = (e) => {
          const prev = e.target.closest(".product-lightbox-nav.prev");
          const next = e.target.closest(".product-lightbox-nav.next");
          if (prev) this.navigateLightbox(-1);
          if (next) this.navigateLightbox(1);
        };
        document.addEventListener("click", this._thumbHandler);
        document.addEventListener("click", this._mainImgHandler);
        document.addEventListener("click", this._lightboxCloseHandler);
        document.addEventListener("click", this._lightboxNavHandler);
        document.addEventListener("keydown", this._lightboxKeyHandler = (e) => {
          if (e.key === "Escape") this.closeLightbox();
          if (e.key === "ArrowLeft") this.navigateLightbox(-1);
          if (e.key === "ArrowRight") this.navigateLightbox(1);
        });
      }
    },

    onRemove() {
      if (typeof document !== "undefined") {
        document.removeEventListener("click", this._thumbHandler);
        document.removeEventListener("click", this._mainImgHandler);
        document.removeEventListener("click", this._lightboxCloseHandler);
        document.removeEventListener("click", this._lightboxNavHandler);
        document.removeEventListener("keydown", this._lightboxKeyHandler);
        this._thumbHandler = null;
        this._mainImgHandler = null;
        this._lightboxCloseHandler = null;
        this._lightboxNavHandler = null;
        this._lightboxKeyHandler = null;
      }
      this.closeLightbox();
    },

    openLightbox() {
      const lightbox = this.view?.el?.querySelector(".product-lightbox");
      if (!lightbox || !this._lightboxImages.length) return;
      const img = lightbox.querySelector(".product-lightbox-img");
      if (img) img.src = this._lightboxImages[this._lightboxIdx] || "";
      lightbox.classList.add("open");
      if (typeof document !== "undefined") document.body.style.overflow = "hidden";
    },

    closeLightbox() {
      const lightbox = this.view?.el?.querySelector(".product-lightbox");
      if (lightbox) lightbox.classList.remove("open");
      if (typeof document !== "undefined") document.body.style.overflow = "";
    },

    navigateLightbox(delta) {
      if (!this._lightboxImages.length) return;
      this._lightboxIdx = (this._lightboxIdx + delta + this._lightboxImages.length) % this._lightboxImages.length;
      const lightbox = this.view?.el?.querySelector(".product-lightbox");
      const img = lightbox?.querySelector(".product-lightbox-img");
      if (img) img.src = this._lightboxImages[this._lightboxIdx];
    },

    loadProduct() {
      const productId = this.get("productId");
      if (!productId) return;
      ProductServices.getProductById(productId)
        .then((response) => {
          const product = response?.data || response;
          if (product) {
            this.set("productData", product);
            this.updateImages();
          }
        })
        .catch((err) => console.error("Failed to load product images:", err));
    },

    getPrimaryImage(product) {
      if (!product || !product.productGallery) return placeholderImage;
      const primary = product.productGallery.find((img) => img.isPrimary);
      return primary?.image || product.productGallery[0]?.image || placeholderImage;
    },

    updateImages() {
      const product = this.get("productData");
      const showThumbs = this.get("showThumbnails");
      const radius = this.get("mainImageRadius") || 8;
      const zoom = this.get("zoomOnHover");
      const showLightbox = this.get("showLightbox");
      const showCount = this.get("showImageCount");
      if (!product || !this.view) return;
      const el = this.view.el;
      if (!el) return;

      const mainImg = el.querySelector(".product-main-image");
      if (mainImg) {
        mainImg.src = this.getPrimaryImage(product);
        mainImg.style.borderRadius = `${radius}px`;
      }

      const mainWrap = el.querySelector(".product-main-image-wrap");
      if (mainWrap) {
        mainWrap.classList.toggle("zoom-hover", zoom);
        mainWrap.style.cursor = (zoom || showLightbox) ? "pointer" : "default";
      }

      const countEl = el.querySelector(".product-image-count");
      if (countEl) {
        const count = product.productGallery?.length || 1;
        countEl.textContent = showCount && count > 1 ? `${count} photos` : "";
        countEl.style.display = (showCount && count > 1) ? "" : "none";
      }

      const thumbsContainer = el.querySelector(".product-thumbnails");
      if (thumbsContainer) {
        thumbsContainer.style.display = showThumbs ? "flex" : "none";
        if (showThumbs && product.productGallery && product.productGallery.length > 0) {
          thumbsContainer.innerHTML = product.productGallery
            .map(
              (img, idx) =>
                `<img class="product-thumbnail${idx === 0 ? " active" : ""}" src="${img.image}" alt="Miniature ${idx + 1}" data-index="${idx}" selectable="false" hoverable="false" editable="false" />`
            )
            .join("");
        } else if (thumbsContainer) {
          thumbsContainer.innerHTML = "";
        }
      }

      const attrs = this.getAttributes() || {};
      if (attrs["data-placeholder-content"]) {
        const next = { ...attrs };
        delete next["data-placeholder-content"];
        this.setAttributes(next);
      }
    },
  },

  view: {
    onRender() {
      const model = this.model;
      const product = model.get("productData");
      if (!product || !this.el) return;
      const mainImg = this.el.querySelector(".product-main-image");
      if (mainImg) {
        const gallery = product.productGallery || [];
        const primary = gallery.find((img) => img.isPrimary);
        mainImg.src = primary?.image || gallery[0]?.image || placeholderImage;
      }
    },
  },
};
