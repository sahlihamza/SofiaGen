const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const gallerySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    images: [
      {
        url: { type: String, trim: true },
        caption: { type: String, trim: true },
        alt: { type: String, trim: true },
        link: { type: String, trim: true },
        category: { type: String, trim: true },
        tags: [{ type: String, trim: true }],
        order: { type: Number, default: 0 },
        width: { type: Number },
        height: { type: Number },
        type: { type: String, enum: ["image", "video"], default: "image" },
        videoUrl: { type: String, trim: true },
      },
    ],
    category: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    settings: {
      layout: { type: String, enum: ["grid", "masonry", "justified", "carousel", "slider"], default: "grid" },
      columns: {
        desktop: { type: Number, default: 3 },
        tablet: { type: Number, default: 2 },
        mobile: { type: Number, default: 1 },
      },
      gap: { type: Number, default: 16 },
      radius: { type: Number, default: 8 },
      hoverEffect: { type: String, enum: ["zoom", "overlay", "caption", "none"], default: "overlay" },
      showCaption: { type: Boolean, default: true },
      showLightbox: { type: Boolean, default: true },
      lazyLoading: { type: Boolean, default: true },
      aspectRatio: { type: String, default: "auto" },
      masonryBreakpoints: {
        desktop: { type: Number, default: 3 },
        tablet: { type: Number, default: 2 },
        mobile: { type: Number, default: 1 },
      },
      justifiedRowHeight: { type: Number, default: 300 },
      carouselAutoplay: { type: Boolean, default: true },
      carouselSpeed: { type: Number, default: 4000 },
      carouselLoop: { type: Boolean, default: true },
      showArrows: { type: Boolean, default: true },
      showDots: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },
    },
    filterSettings: {
      showFilters: { type: Boolean, default: false },
      filterType: { type: String, enum: ["tabs", "dropdown", "none"], default: "tabs" },
      categories: [{ type: String, trim: true }],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

gallerySchema.index({ storeId: 1, isActive: 1, category: 1, createdAt: -1 });

gallerySchema.plugin(storeScopedPlugin);

const Gallery = mongoose.model("Gallery", gallerySchema);
module.exports = Gallery;
