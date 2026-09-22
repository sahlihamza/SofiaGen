const mongoose = require("mongoose");

const themeSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },

    // Store relationship
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    // Theme metadata
    version: {
      type: String,
      default: "1.0.0",
    },
    thumbnail: {
      type: String,
      default: null,
    },

    // Configuration
    colors: {
      primary: { type: String, default: "#667eea" },
      secondary: { type: String, default: "#764ba2" },
      accent: { type: String, default: "#f0f0f0" },
      text: { type: String, default: "#333" },
      background: { type: String, default: "#ffffff" },
    },

    fonts: {
      heading: { type: String, default: "Arial" },
      body: { type: String, default: "Arial" },
    },

    spacing: {
      xs: { type: String, default: "4px" },
      sm: { type: String, default: "8px" },
      md: { type: String, default: "16px" },
      lg: { type: String, default: "24px" },
      xl: { type: String, default: "40px" },
      "2xl": { type: String, default: "64px" },
    },

    radius: {
      none: { type: String, default: "0px" },
      sm: { type: String, default: "4px" },
      md: { type: String, default: "8px" },
      lg: { type: String, default: "16px" },
      full: { type: String, default: "9999px" },
    },

    shadows: {
      sm: { type: String, default: "0 1px 2px rgba(0,0,0,0.05)" },
      md: { type: String, default: "0 4px 8px rgba(0,0,0,0.1)" },
      lg: { type: String, default: "0 12px 24px rgba(0,0,0,0.15)" },
    },

    breakpoints: {
      mobile: { type: Number, default: 480 },
      tablet: { type: Number, default: 992 },
      laptop: { type: Number, default: 1280 },
      desktop: { type: Number, default: 0 },
    },

    typography: {
      scale: {
        xs: { type: String, default: "12px" },
        sm: { type: String, default: "14px" },
        base: { type: String, default: "16px" },
        lg: { type: String, default: "20px" },
        xl: { type: String, default: "28px" },
        "2xl": { type: String, default: "40px" },
      },
    },

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Status
    isActive: {
      type: Boolean,
      default: false,
    },
    isDraft: {
      type: Boolean,
      default: true,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    catalogFeature: {
      type: String,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
themeSchema.index({ storeId: 1 });
themeSchema.index({ slug: 1, storeId: 1 });

// Generate slug before save
themeSchema.pre("save", async function (next) {
  if (!this.slug || this.isModified("name")) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    let slug = baseSlug;
    let counter = 1;

    while (
      await mongoose.model("Theme").findOne({
        slug,
        storeId: this.storeId,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

module.exports = mongoose.model("Theme", themeSchema);
