const mongoose = require("mongoose");

const REQUIRED_FIELD_KEYS = ["lastName", "firstName", "phone", "company", "address"];

const checkoutSchema = new mongoose.Schema(
  {
    allowGuestCheckout: {
      type: Boolean,
      default: true,
    },
    allowLoginAtCheckout: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const accountCreationSchema = new mongoose.Schema(
  {
    allowAtCheckout: {
      type: Boolean,
      default: true,
    },
    allowFromAccountPage: {
      type: Boolean,
      default: true,
    },
    sendPasswordSetupEmail: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: false,
    },
    autoLoginAfterRegistration: {
      type: Boolean,
      default: true,
    },
    requiredFields: {
      type: [String],
      enum: REQUIRED_FIELD_KEYS,
      default: [],
    },
  },
  { _id: false }
);

const passwordPolicySchema = new mongoose.Schema(
  {
    minLength: {
      type: Number,
      default: 8,
    },
    requireSpecialChar: {
      type: Boolean,
      default: false,
    },
    requireNumber: {
      type: Boolean,
      default: true,
    },
    requireUppercase: {
      type: Boolean,
      default: true,
    },
    // 0 = never expires
    passwordExpiryDays: {
      type: Number,
      default: 0,
    },
    // 0 = no history check
    passwordHistoryCount: {
      type: Number,
      default: 0,
    },
    // 0 = unlimited attempts
    maxLoginAttempts: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const privacyPolicySchema = new mongoose.Schema(
  {
    pageUrl: {
      type: String,
      default: "",
    },
    registrationText: {
      type: String,
      default:
        "Vos donnés personnelles seront utilisés pour vous accompagner au cours de votre visite du site web, gérer l'accès à votre compte, et pour d'autres raisons décrites dans notre {{privacy_policy}}.",
    },
    checkoutText: {
      type: String,
      default:
        "Vos donnés personnelles seront utilisés pour le traitement de votre commande, vous accompagner au cours de votre visite du site web, et pour d'autres raisons décrites dans notre {{privacy_policy}}.",
    },
  },
  { _id: false }
);

const dataErasureSchema = new mongoose.Schema(
  {
    deletePersonalDataFromOrders: {
      type: Boolean,
      default: false,
    },
    removeDownloadAccessOnRequest: {
      type: Boolean,
      default: false,
    },
    allowBulkPersonalDataRemoval: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// A retention period: empty/null `value` means "keep indefinitely", matching
// WooCommerce's "empty values mean unlimited retention" convention.
const retentionPeriodSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      enum: ["days", "weeks", "months", "years"],
      default: "days",
    },
  },
  { _id: false }
);

const dataRetentionSchema = new mongoose.Schema(
  {
    inactiveAccounts: {
      type: retentionPeriodSchema,
      default: () => ({ unit: "months" }),
    },
    pendingOrders: {
      type: retentionPeriodSchema,
      default: () => ({ unit: "days" }),
    },
    failedOrders: {
      type: retentionPeriodSchema,
      default: () => ({ unit: "days" }),
    },
    cancelledOrders: {
      type: retentionPeriodSchema,
      default: () => ({ unit: "days" }),
    },
    refundedOrders: {
      type: retentionPeriodSchema,
      default: () => ({ unit: "months" }),
    },
    completedOrders: {
      type: retentionPeriodSchema,
      default: () => ({ unit: "months" }),
    },
  },
  { _id: false }
);

const accountsPrivacySettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    checkout: {
      type: checkoutSchema,
      default: () => ({}),
    },

    accountCreation: {
      type: accountCreationSchema,
      default: () => ({}),
    },

    passwordPolicy: {
      type: passwordPolicySchema,
      default: () => ({}),
    },

    privacyPolicy: {
      type: privacyPolicySchema,
      default: () => ({}),
    },

    dataErasure: {
      type: dataErasureSchema,
      default: () => ({}),
    },

    dataRetention: {
      type: dataRetentionSchema,
      default: () => ({}),
    },
  },
  {
    collection: "accounts_privacy_settings",
    timestamps: true,
  }
);

const AccountsPrivacySettings = mongoose.model(
  "AccountsPrivacySettings",
  accountsPrivacySettingsSchema
);

module.exports = AccountsPrivacySettings;
module.exports.REQUIRED_FIELD_KEYS = REQUIRED_FIELD_KEYS;
