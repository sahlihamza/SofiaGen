const mongoose = require("mongoose");

const localizedStringSchema = new mongoose.Schema(
  {
    fr: { type: String, required: false, default: "" },
    en: { type: String, required: false, default: "" },
    ar: { type: String, required: false, default: "" },
  },
  { _id: false }
);

const notificationTemplateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    channels: {
      in_app: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    title: {
      type: localizedStringSchema,
      required: true,
    },
    message: {
      type: localizedStringSchema,
      required: true,
    },
    variables: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

notificationTemplateSchema.index({ category: 1 });

// A template must be sendable: at least one locale filled for title & message.
notificationTemplateSchema.pre("validate", function (next) {
  const readLocales = (field) =>
    field && typeof field === "object"
      ? [field.fr, field.en, field.ar]
      : [];
  const hasContent = (locales) => locales.some((value) => typeof value === "string" && value.trim().length > 0);

  if (!hasContent(readLocales(this.title))) {
    return next(new Error("Title must have content in at least one language (fr/en/ar)"));
  }
  if (!hasContent(readLocales(this.message))) {
    return next(new Error("Message must have content in at least one language (fr/en/ar)"));
  }
  next();
});

const NotificationTemplate = mongoose.model("NotificationTemplate", notificationTemplateSchema);

module.exports = NotificationTemplate;
