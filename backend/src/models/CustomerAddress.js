
const mongoose = require("mongoose");

const customerAddressSchema = new mongoose.Schema(
  {
    // Multi-store SaaS: copied from the parent customer on create so addresses
    // can be queried per boutique without a join.
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    // Many-to-one: an address always belongs to exactly one customer.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    type: {
      type: String,
      enum: ["billing", "shipping", "other"],
      default: "shipping",
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
    company: {
      type: String,
      required: false,
      trim: true,
    },
    address1: {
      type: String,
      required: true,
      trim: true,
    },
    address2: {
      type: String,
      required: false,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: false,
      trim: true,
    },
    postalCode: {
      type: String,
      required: false,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "customer_addresses",
    // adds createdAt and updatedAt automatically
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Story 10  indexes.
customerAddressSchema.index({ storeId: 1, customerId: 1 });
customerAddressSchema.index({ storeId: 1, customerId: 1, isDefault: 1 });
// Lookups from the storefront are almost always "the default shipping address
// of this customer".
customerAddressSchema.index({ customerId: 1, type: 1, isDefault: 1 });

customerAddressSchema.virtual("fullName").get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(" ");
});

const CustomerAddress = mongoose.model(
  "CustomerAddress",
  customerAddressSchema
);

module.exports = CustomerAddress;
