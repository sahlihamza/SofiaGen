const mongoose = require("mongoose");
const { encrypt, decrypt, isEncrypted } = require("../utils/encryption");

const ENCRYPTED_FIELDS = ["capiAccessToken"];

const maskSecret = (value) => {
  if (!value || typeof value !== "string") return value;
  const plain = value.length > 4 ? value.slice(-4) : value;
  return `****${plain}`;
};

const marketingSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
      index: true,
    },

    meta: {
      pixelEnabled: { type: Boolean, default: false },
      pixelId: {
        type: String,
        trim: true,
        default: "",
        validate: {
          validator: (v) => !v || /^\d{6,20}$/.test(String(v).trim()),
          message: "Pixel ID invalide (6  20 chiffres)",
        },
      },

      capiEnabled: { type: Boolean, default: false },
      capiPixelId: {
        type: String,
        trim: true,
        default: "",
        validate: {
          validator: (v) => !v || /^\d{6,20}$/.test(String(v).trim()),
          message: "Pixel ID CAPI invalide (6  20 chiffres)",
        },
      },
      capiAccessToken: {
        type: String,
        select: false,
        default: "",
      },
      capiTestEventCode: { type: String, trim: true, default: "" },

      domainVerificationCode: {
        type: String,
        trim: true,
        default: "",
        validate: {
          validator: (v) => !v || /^[A-Za-z0-9_-]{8,128}$/.test(String(v).trim()),
          message: "Code de vérification Facebook invalide",
        },
      },

      lastTestAt: { type: Date, default: null },
      lastTestStatus: {
        type: String,
        enum: ["unknown", "ok", "failed"],
        default: "unknown",
      },
      lastTestMessage: { type: String, default: "" },
    },

    google: {
      analyticsEnabled: { type: Boolean, default: false },
      measurementId: {
        type: String,
        trim: true,
        default: "",
        validate: {
          validator: (v) => !v || /^G-[A-Z0-9]{4,12}$/.test(String(v).trim()),
          message: "Measurement ID invalide (format G-XXXXXXXX)",
        },
      },
      searchConsoleVerification: {
        type: String,
        trim: true,
        default: "",
        validate: {
          validator: (v) => !v || /^[A-Za-z0-9_-]{8,128}$/.test(String(v).trim()),
          message: "Code de vérification Search Console invalide",
        },
      },
      lastTestAt: { type: Date, default: null },
      lastTestStatus: {
        type: String,
        enum: ["unknown", "ok", "failed"],
        default: "unknown",
      },
      lastTestMessage: { type: String, default: "" },
    },

    sitemap: {
      enabled: { type: Boolean, default: true },
      includeProducts: { type: Boolean, default: true },
      includeCategories: { type: Boolean, default: true },
      customUrls: {
        type: [String],
        default: [],
        validate: {
          validator: (arr) =>
            Array.isArray(arr) &&
            arr.every((u) => typeof u === "string" && /^https?:\/\//i.test(u.trim())),
          message: "Chaque URL doit commencer par http(s)://",
        },
      },
      lastGeneratedAt: { type: Date, default: null },
    },

    consent: {
      requireAnalyticsConsent: { type: Boolean, default: false },
      requireMarketingConsent: { type: Boolean, default: true },
    },
  },
  {
    collection: "marketing_settings",
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        if (ret.meta && ENCRYPTED_FIELDS.some((f) => f.startsWith("capi"))) {
          ret.meta = { ...ret.meta };
        }
        return ret;
      },
    },
  }
);

const encryptField = (value) => {
  if (!value || typeof value !== "string") return value;
  if (isEncrypted(value)) return value;
  return encrypt(value);
};

marketingSettingsSchema.pre("save", function (next) {
  if (this.isModified("meta.capiAccessToken") && this.meta?.capiAccessToken) {
    this.meta.capiAccessToken = encryptField(this.meta.capiAccessToken);
  }
  next();
});

marketingSettingsSchema.methods.getCapiAccessToken = function () {
  const raw = this.get("meta.capiAccessToken");
  if (!raw) return "";
  try {
    return decrypt(raw);
  } catch (err) {
    return "";
  }
};

marketingSettingsSchema.methods.hasCapiToken = function () {
  const raw = this.get("meta.capiAccessToken");
  return Boolean(raw);
};

marketingSettingsSchema.methods.publicProjection = function () {
  const obj = this.toObject();
  delete obj.meta?.capiAccessToken;
  return {
    meta: {
      pixelEnabled: Boolean(obj.meta?.pixelEnabled),
      pixelId: obj.meta?.pixelId || "",
      capiEnabled: Boolean(obj.meta?.capiEnabled),
      capiConfigured: this.hasCapiToken(),
      capiPixelId: obj.meta?.capiPixelId || "",
      domainVerificationCode: obj.meta?.domainVerificationCode || "",
    },
    google: {
      analyticsEnabled: Boolean(obj.google?.analyticsEnabled),
      measurementId: obj.google?.measurementId || "",
      searchConsoleVerification: obj.google?.searchConsoleVerification || "",
    },
    sitemap: {
      enabled: Boolean(obj.sitemap?.enabled),
    },
  };
};

const MarketingSettings = mongoose.model("MarketingSettings", marketingSettingsSchema);

module.exports = MarketingSettings;
module.exports.ENCRYPTED_FIELDS = ENCRYPTED_FIELDS;
module.exports.maskSecret = maskSecret;