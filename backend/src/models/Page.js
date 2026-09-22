const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    // Basic info
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    metaDescription: {
      type: String,
      default: "",
    },
    metaKeywords: {
      type: String,
      default: "",
    },

    // Relationships
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
      required: true,
    },

    // Content
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
      },
    ],

    // GrapesJS content
    projectData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    components: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    renderedHtml: {
      type: String,
      default: null,
    },
    renderedCss: {
      type: String,
      default: null,
    },
    renderedAt: {
      type: Date,
      default: null,
    },
    compiledHtml: {
      type: String,
      default: "",
    },
    compiledCss: {
      type: String,
      default: "",
    },
    seo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Status
    isPublished: {
      type: Boolean,
      default: false,
    },
    isDraft: {
      type: Boolean,
      default: true,
    },
    isHome: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    scheduleStatus: {
      type: String,
      enum: ["none", "scheduled", "published"],
      default: "none",
    },

    // Page type
    pageType: {
      type: String,
      enum: ["home", "product", "category", "about", "contact", "custom"],
      default: "custom",
    },

    linkedProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // SEO
    urlSlug: {
      type: String,
      required: true,
      lowercase: true,
    },

    // Visibility
    isVisible: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Versions
    versions: [
      {
        versionNumber: Number,
        projectData: mongoose.Schema.Types.Mixed,
        components: mongoose.Schema.Types.Mixed,
        createdAt: Date,
        createdBy: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
pageSchema.index({ storeId: 1 });
pageSchema.index({ themeId: 1 });
pageSchema.index({ urlSlug: 1, storeId: 1 }, { unique: true });
pageSchema.index({ isPublished: 1, storeId: 1 });

// Auto-generate URL slug if not provided
pageSchema.pre("save", function (next) {
  const slugSource = (this.urlSlug || "").toString().trim();
  if (!slugSource) {
    const source = this.isHome ? "/" : this.slug || this.title || "page";
    this.urlSlug = source === "/"
      ? "/"
      : (source
          .toString()
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "") || "page");
  }
  next();
});

module.exports = mongoose.model("Page", pageSchema);
