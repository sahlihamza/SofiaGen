const mongoose = require("mongoose");

const facebookCatalogAccessLogSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    slug: { type: String, required: true, lowercase: true },
    at: { type: Date, default: Date.now, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 512 },
    productCount: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    httpStatus: { type: Number, default: 200 },
    error: { type: String, default: null },
    fromCache: { type: Boolean, default: false },
  },
  {
    collection: "facebook_catalog_access_logs",
    timestamps: false,
  }
);

facebookCatalogAccessLogSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
facebookCatalogAccessLogSchema.index({ storeId: 1, at: -1 });

const blockMutation = function (next) {
  next(new Error("FacebookCatalogAccessLog records are append-only."));
};

facebookCatalogAccessLogSchema.pre("updateOne", blockMutation);
facebookCatalogAccessLogSchema.pre("findOneAndUpdate", blockMutation);
facebookCatalogAccessLogSchema.pre("updateMany", blockMutation);
facebookCatalogAccessLogSchema.pre("deleteOne", blockMutation);
facebookCatalogAccessLogSchema.pre("findOneAndDelete", blockMutation);
facebookCatalogAccessLogSchema.pre("deleteMany", blockMutation);

const FacebookCatalogAccessLog = mongoose.model(
  "FacebookCatalogAccessLog",
  facebookCatalogAccessLogSchema
);

module.exports = FacebookCatalogAccessLog;