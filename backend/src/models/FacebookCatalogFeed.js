const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const SUPPORTED_CURRENCIES = ["TND", "EUR", "USD", "GBP", "MAD", "DZD", "SAR", "AED"];
const SUPPORTED_CONDITIONS = ["new", "refurbished", "used"];
const FEED_CACHE_TTL_SECONDS = 15 * 60;

const facebookCatalogFeedSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },
    enabled: { type: Boolean, default: false },

    includeOutOfStock: { type: Boolean, default: false },
    includeVariations: { type: Boolean, default: true },
    includeInactive: { type: Boolean, default: false },

    currency: { type: String, enum: SUPPORTED_CURRENCIES, default: "TND" },
    defaultCondition: { type: String, enum: SUPPORTED_CONDITIONS, default: "new" },

    lastGeneratedAt: { type: Date, default: null },
    lastGenerationDurationMs: { type: Number, default: 0 },
    lastProductCount: { type: Number, default: 0 },
    lastInvalidCount: { type: Number, default: 0 },
    lastStatus: {
      type: String,
      enum: ["success", "failed", "partial"],
      default: null,
    },
    lastError: { type: String, default: null },

    lastAccessedAt: { type: Date, default: null },
    lastAccessCount: { type: Number, default: 0 },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    collection: "facebook_catalog_feeds",
    timestamps: true,
  }
);

facebookCatalogFeedSchema.plugin(storeScopedPlugin);

facebookCatalogFeedSchema.index({ storeId: 1 }, { unique: true });

const FacebookCatalogFeed = mongoose.model(
  "FacebookCatalogFeed",
  facebookCatalogFeedSchema
);

module.exports = FacebookCatalogFeed;
module.exports.SUPPORTED_CURRENCIES = SUPPORTED_CURRENCIES;
module.exports.SUPPORTED_CONDITIONS = SUPPORTED_CONDITIONS;
module.exports.FEED_CACHE_TTL_SECONDS = FEED_CACHE_TTL_SECONDS;