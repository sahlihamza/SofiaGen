const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const customerSchema = new mongoose.Schema(
  {
    // Multi-store SaaS: every customer belongs to one store and is only ever
    // visible from that store. Kept optional for now because the storefront
    // sign-up flows do not send it yet.
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Format d'email invalide",
      },
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    avatar: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    role: {
      type: String,
      default: "customer",
    },
    language: {
      type: String,
      default: "en",
    },
    currency: {
      type: String,
      default: "USD",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    marketingConsent: {
      type: Boolean,
      default: false,
    },
    newsletter: {
      type: Boolean,
      default: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerGroup",
      required: false,
      default: null,
    },
 
    deletedAt: {
      type: Date,
      default: null,
    },
    anonymizedAt: {
      type: Date,
      default: null,
    },

    image: { type: String, required: false },
    address: { type: String, required: false },
    country: { type: String, required: false },
    city: { type: String, required: false },
    shippingAddress: { type: Object, required: false },
  },
  {
    // adds createdAt and updatedAt automatically
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);


customerSchema.index({ storeId: 1, email: 1 }, { unique: true });
customerSchema.index({ storeId: 1, phone: 1 });
customerSchema.index({ storeId: 1, status: 1 });
customerSchema.index({ storeId: 1, createdAt: -1 });


customerSchema.virtual("addresses", {
  ref: "CustomerAddress",
  localField: "_id",
  foreignField: "customerId",
  options: { sort: { isDefault: -1, _id: -1 } },
});


customerSchema.virtual("notes", {
  ref: "CustomerNote",
  localField: "_id",
  foreignField: "customerId",
  options: { sort: { createdAt: -1, _id: -1 } },
});


customerSchema.virtual("sessions", {
  ref: "CustomerSession",
  localField: "_id",
  foreignField: "customerId",
  options: { sort: { lastLogin: -1, _id: -1 } },
});


customerSchema
  .virtual("name")
  .get(function () {
    return [this.firstName, this.lastName].filter(Boolean).join(" ");
  })
  .set(function (value) {
    const parts = (value || "").toString().trim().split(/\s+/);
    this.firstName = parts.shift() || "";
    this.lastName = parts.join(" ");
  });

customerSchema.plugin(storeScopedPlugin);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
