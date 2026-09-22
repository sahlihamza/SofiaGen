const mongoose = require("mongoose");
const { encrypt, decrypt, isEncrypted } = require("../utils/encryption");

const passwordPolicySchema = new mongoose.Schema(
  {
    minLength: {
      type: Number,
      default: 8,
    },
    requireUppercase: {
      type: Boolean,
      default: true,
    },
    requireLowercase: {
      type: Boolean,
      default: true,
    },
    requireNumbers: {
      type: Boolean,
      default: true,
    },
    requireSpecialChars: {
      type: Boolean,
      default: true,
    },
    expiryDays: {
      type: Number,
      default: 90,
    },
  },
  { _id: false }
);
const platformEmailSchema = new mongoose.Schema(
  {
    fromName: { type: String, default: "" },
    fromEmail: { type: String, default: "" },
    replyTo: { type: String, default: "" },
  },
  { _id: false }
);

const platformSettingsSchema = new mongoose.Schema(
  {
    // Platform-wide SMTP (MAIL-Platform)  DB-first with env fallback in
    // EmailConfigResolver.getPlatformSmtpConfig(). passwordEncrypted uses the
    // exact same AES-256-CBC scheme as FormSetting.smtp (MAIL-02).
    smtp: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: "" },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: "" },
      passwordEncrypted: { type: String, default: "", select: false },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      updatedAt: { type: Date, default: null },
    },
    platformName: {
      type: String,
      required: true,
      default: "SofiaGen",
    },
    logo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    marketingSiteUrl: {
      type: String,
      default: "http://localhost:3002",
      trim: true,
    },
    email: {
      type: platformEmailSchema,
      default: () => ({}),
    },
    supportEmail: {
      type: String,
      required: false,
    },
    supportUrl: {
      type: String,
      required: false,
    },
    whatsappNumber: {
      type: String,
      default: "",
      trim: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    twoFactorRequired: {
      type: Boolean,
      default: false,
    },
    passwordPolicy: passwordPolicySchema,
    sessionTimeout: {
      type: Number,
      default: 480,
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
    },
    lockoutDuration: {
      type: Number,
      default: 30,
    },
    allowUserRegistration: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "platform_settings",
  }
);

platformSettingsSchema.index({ platformName: 1 });

// Encrypt smtp.passwordEncrypted at rest whenever set to a fresh plaintext
// value  identical behaviour to FormSetting.smtp (MAIL-02).
platformSettingsSchema.pre("save", function (next) {
  if (this.isModified("smtp.passwordEncrypted") && this.smtp?.passwordEncrypted) {
    if (!isEncrypted(this.smtp.passwordEncrypted)) {
      this.smtp.passwordEncrypted = encrypt(this.smtp.passwordEncrypted);
    }
  }
  next();
});

platformSettingsSchema.statics.decryptSmtpPassword = function (smtp) {
  if (!smtp?.passwordEncrypted) return "";
  return isEncrypted(smtp.passwordEncrypted)
    ? decrypt(smtp.passwordEncrypted)
    : smtp.passwordEncrypted;
};

const PlatformSettings = mongoose.model("PlatformSettings", platformSettingsSchema);

module.exports = PlatformSettings;
