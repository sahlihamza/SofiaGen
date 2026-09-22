const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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
      default: false,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const paymentSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    methods: {
      type: [paymentMethodSchema],
      default: [],
    },
  },
  {
    collection: "payment_settings",
    timestamps: true,
  }
);

const PaymentSettings = mongoose.model("PaymentSettings", paymentSettingsSchema);

module.exports = PaymentSettings;
