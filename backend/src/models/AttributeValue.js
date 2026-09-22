const mongoose = require("mongoose");

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// One-to-many relation: a single attribute (attributes._id) owns many values.
// e.g. the "Color" attribute owns the values Red, Green, Blue.
const attributeValueSchema = new mongoose.Schema(
  {
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    value: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      required: false,
      default: null,
    },
    image: {
      type: String,
      required: false,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    // adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

// A slug is unique within a given attribute (not across the whole collection),
// so two attributes can each own a value that slugifies the same way.
attributeValueSchema.index({ attributeId: 1, slug: 1 }, { unique: true });

// Auto-generate the slug from the label when it is missing or the label changed.
attributeValueSchema.pre("validate", function (next) {
  if (this.label && (!this.slug || this.isModified("label"))) {
    this.slug = slugify(this.label);
  }
  next();
});

const AttributeValue = mongoose.model("AttributeValue", attributeValueSchema);

module.exports = AttributeValue;
