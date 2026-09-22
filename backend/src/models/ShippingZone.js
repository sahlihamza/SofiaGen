const mongoose = require("mongoose");
const shippingMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["flat_rate", "free_shipping", "local_pickup"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    // flat_rate / local_pickup: the amount charged. free_shipping: unused.
    cost: {
      type: Number,
      default: 0,
    },
   
    taxStatus: {
      type: String,
      enum: ["taxable", "none"],
      default: "taxable",
    },

    freeShippingRequirement: {
      type: String,
      enum: [
        "no_requirement",
        "coupon",
        "min_amount",
        "min_amount_or_coupon",
        "min_amount_and_coupon",
      ],
      default: "no_requirement",
    },
   
    minOrderAmount: {
      type: Number,
      default: null,
    },
   
    applyMinBeforeCouponDiscount: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const shippingZoneSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    countries: {
      type: [String],
      default: [],
    },

    zipCodes: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
    methods: {
      type: [shippingMethodSchema],
      default: [],
    },
    mode: {
      type: String,
      enum: ["manual", "live"],
      default: "manual",
    },
    carrierProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreCarrierProvider",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

shippingZoneSchema.pre('validate', function (next) {
  if (this.mode === 'live' && !this.carrierProviderId) {
    this.invalidate('carrierProviderId', 'Carrier provider is required when mode is "live"');
  }
  next();
});

const ShippingZone = mongoose.model("ShippingZone", shippingZoneSchema);

module.exports = ShippingZone;
