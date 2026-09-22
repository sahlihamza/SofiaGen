const mongoose = require("mongoose");
const { EMAIL_NOTIFICATION_KEYS } = require("../utils/emailNotifications");

const emailNotificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: EMAIL_NOTIFICATION_KEYS,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    contentType: {
      type: String,
      enum: ["html", "text"],
      required: true,
      default: "html",
    },
    recipientType: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
    },
    recipients: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    heading: {
      type: String,
      default: "",
    },
    additionalContent: {
      type: String,
      default: "",
    },
    cc: {
      type: String,
      default: "",
    },
    bcc: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const emailTemplateSchema = new mongoose.Schema(
  {
    fromName: {
      type: String,
      default: "",
    },
    fromEmail: {
      type: String,
      default: "",
    },
    emailInsightsEnabled: {
      type: Boolean,
      default: true,
    },
    logo: {
      type: String,
      default: "",
    },
    logoWidth: {
      type: Number,
      default: 120,
    },
    headerAlignment: {
      type: String,
      enum: ["left", "center", "right"],
      default: "left",
    },
    fontFamily: {
      type: String,
      default: "Helvetica",
    },
    footerText: {
      type: String,
      default: "{store_name} - Built with SofiaGen",
    },
    baseColor: {
      type: String,
      default: "#720eec",
    },
    backgroundColor: {
      type: String,
      default: "#f7f7f7",
    },
    bodyBackgroundColor: {
      type: String,
      default: "#ffffff",
    },
    bodyTextColor: {
      type: String,
      default: "#3c3c3c",
    },
    secondaryTextColor: {
      type: String,
      default: "#6b7280",
    },
    syncWithTheme: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const emailSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    notifications: {
      type: [emailNotificationSchema],
      default: [],
    },

    template: {
      type: emailTemplateSchema,
      default: () => ({}),
    },
  },
  {
    collection: "email_settings",
    timestamps: true,
  }
);

const EmailSettings = mongoose.model("EmailSettings", emailSettingsSchema);

module.exports = EmailSettings;
