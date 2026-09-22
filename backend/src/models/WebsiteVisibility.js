const mongoose = require("mongoose");

const VISIBILITY_MODES = [
  "public",
  "private",
  "password",
  "maintenance",
  "comingSoon",
];
const DEFAULT_EXCEPTIONS = ["/health", "/api/*", "/webhooks/*"];

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const passwordPageSchema = new mongoose.Schema(
  {
    welcomeMessage: {
      type: String,
      default: "Ce site est protég. Saisissez le mot de passe pour continuer.",
    },
    logo: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const maintenanceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Site en maintenance" },
    description: {
      type: String,
      default:
        "Nous effectuons actuellement une maintenance. Merci de revenir dans quelques instants.",
    },
    image: { type: String, default: "" },
    color: { type: String, default: "#720eec" },
    contactButtonLabel: { type: String, default: "" },
    contactButtonUrl: { type: String, default: "" },
    allowAdmins: { type: Boolean, default: true },
    allowedIps: { type: [String], default: [] },
  },
  { _id: false }
);

const comingSoonSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Bientît disponible" },
    description: {
      type: String,
      default: "Notre boutique ouvre trés prochainement. Restez connecté !",
    },
    logo: { type: String, default: "" },
    launchDate: { type: Date, default: null },
    countdown: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
    backgroundImage: { type: String, default: "" },
    socialLinks: { type: [socialLinkSchema], default: [] },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    generateRobots: { type: Boolean, default: true },
    generateSitemap: { type: Boolean, default: true },
  },
  { _id: false }
);

const websiteVisibilitySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },
    visibility: {
      type: String,
      enum: VISIBILITY_MODES,
      default: "public",
    },
    password: {
      type: String,
      default: null,
      select: false,
    },
    passwordSessionsResetAt: {
      type: Date,
      default: null,
    },
    passwordPage: { type: passwordPageSchema, default: () => ({}) },

    allowSearchEngines: { type: Boolean, default: true },
    robotsNoIndex: { type: Boolean, default: false },

    maintenance: { type: maintenanceSchema, default: () => ({}) },
    comingSoon: { type: comingSoonSchema, default: () => ({}) },
    seo: { type: seoSchema, default: () => ({}) },

    exceptions: { type: [String], default: DEFAULT_EXCEPTIONS },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    collection: "website_visibility",
    timestamps: true,
  }
);

const WebsiteVisibility = mongoose.model(
  "WebsiteVisibility",
  websiteVisibilitySchema
);

module.exports = WebsiteVisibility;
module.exports.VISIBILITY_MODES = VISIBILITY_MODES;
module.exports.DEFAULT_EXCEPTIONS = DEFAULT_EXCEPTIONS;
