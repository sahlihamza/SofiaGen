const mongoose = require("mongoose");
const { encrypt, decrypt, isEncrypted } = require("../utils/encryption");

/**
 * FormSetting  configuration par boutique : SMTP + clés d'intégration.
 * Une seule entré par store (upsert).
 *
 * smtp.passwordEncrypted is the password at rest (see MAIL-02)  encrypted
 * the same way StorePaymentProvider encrypts payment credentials
 * (utils/encryption.js, AES-256-CBC). smtp.pass is the old plaintext field,
 * kept only so already-stored values can be read and migrated (see
 * script/migrateSmtpPasswords.js)  new writes never touch it again.
 */
const integrationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mailchimp", "brevo", "convertkit", "hubspot", "googleSheets"],
    },
    enabled: { type: Boolean, default: false },
    config: { type: mongoose.Schema.Types.Mixed, default: {} }, // apiKey, listId, etc.
  },
  { _id: false }
);

const formSettingSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
      index: true,
    },
    smtp: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: "" },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: "" },
      // Deprecated plaintext password  read-only fallback for records not
      // yet migrated. Never written to by new code (see MAIL-02).
      pass: { type: String, default: "", select: false },
      passwordEncrypted: { type: String, default: "", select: false },
      fromName: { type: String, default: "" },
      fromEmail: { type: String, default: "" },
    },
    recaptcha: {
      provider: { type: String, enum: ["none", "recaptcha", "turnstile"], default: "none" },
      siteKey: { type: String, default: "" },
      secretKey: { type: String, default: "" },
    },
    integrations: { type: [integrationSchema], default: [] },
  },
  { timestamps: true }
);

// Encrypts smtp.passwordEncrypted at rest whenever it's set to a fresh
// plaintext value (not already our own ciphertext  `save()` is called
// again, for instance, by unrelated updates to the same document).
formSettingSchema.pre("save", function (next) {
  if (this.isModified("smtp.passwordEncrypted") && this.smtp?.passwordEncrypted) {
    if (!isEncrypted(this.smtp.passwordEncrypted)) {
      this.smtp.passwordEncrypted = encrypt(this.smtp.passwordEncrypted);
    }
  }
  next();
});

// Returns the SMTP password in the clear: the encrypted field if migrated,
// falling back to the legacy plaintext field for records not migrated yet.
formSettingSchema.methods.getSmtpPassword = function () {
  if (this.smtp?.passwordEncrypted) {
    return decrypt(this.smtp.passwordEncrypted);
  }
  return this.smtp?.pass || "";
};

// Same as the instance method above, but usable on a plain object from a
// .lean() query (EmailConfigResolver and formEmailService read this way for
// performance  a hydrated document isn't needed just to send an email).
formSettingSchema.statics.decryptSmtpPassword = function (smtp) {
  if (!smtp) return "";
  if (smtp.passwordEncrypted) return decrypt(smtp.passwordEncrypted);
  return smtp.pass || "";
};

const FormSetting = mongoose.model("FormSetting", formSettingSchema);
module.exports = FormSetting;
