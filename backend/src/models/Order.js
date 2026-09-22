const mongoose = require("mongoose");
const crypto = require("crypto");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const storeScopedPlugin = require("./plugins/storeScoped");


const orderAddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
 
    contact: { type: String, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    zipCode: { type: String, default: "" },
  },
  { _id: false }
);

// Which delivery option was picked, resolved server-side at checkout.
const orderShippingMethodSchema = new mongoose.Schema(
  {
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: "ShippingZone" },
    methodId: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String },
    carrier: { type: String },
    title: { type: String },
    cost: { type: Number, default: 0 },
    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickupLocation",
    },
    estimatedDeliveryMinDate: { type: Date },
    estimatedDeliveryMaxDate: { type: Date },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {

    orderNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },

    invoice: {
      type: Number,
      required: false,
    },
  
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
      alias: "customerId",
    },
    isGuest: {
      type: Boolean,
      default: false,
    },

    // --- Addresses --------------------------------------------------------
    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAddress",
      required: false,
      default: null,
    },
    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAddress",
      required: false,
      default: null,
    },
  
    user_info: {
      type: orderAddressSchema,
      required: false,
    },
    billing_info: {
      type: orderAddressSchema,
      required: false,
    },
    billingSameAsShipping: {
      type: Boolean,
      default: true,
    },

    // SO-14: set once a store's retention window has passed and its orders
    // are anonymized instead of deleted outright  see storePurgeService.
    // The order itself (amounts, dates, tax) is kept for accounting/legal
    // retention; only the customer-identifying fields in user_info/
    // billing_info are stripped.
    anonymizedAt: {
      type: Date,
      default: null,
    },

    // --- Lines ------------------------------------------------------------
    cart: [{}],

    // --- Amounts ----------------------------------------------------------
    subTotal: {
      type: Number,
      required: true,
      min: 0,
      alias: "subtotal",
    },
    shippingCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      alias: "shipping",
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      required: false,
    },
    tax: {
      type: Number,
      required: false,
      default: 0,
    },

    taxRate: {
      type: Number,
      required: false,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
   
    currency: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },


    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
    },

    couponCode: {
      type: String,
      required: false,
      trim: true,
    },

    // --- Shipping ---------------------------------------------------------
    shippingOption: {
      type: String,
      required: false,
    },
    shippingMethod: {
      type: orderShippingMethodSchema,
      required: false,
    },

    // --- Payment ----------------------------------------------------------
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      lowercase: true,
      enum: ["pending", "paid", "failed", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },
    // The attempt that settles this order, in the `payments` collection. The
    // gateway's own reference (Stripe intent id, PayPal order id...) lives on
    // that row as `transactionId`, and `paymentDetails` below keeps the rest of
    // the gateway response.
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: false,
      default: null,
      index: true,
    },
    paymentDetails: {
      type: Object,
      required: false,
    },
    cardInfo: {
      type: Object,
      required: false,
    },

    // --- Fulfilment -------------------------------------------------------
    // The fulfilment lifecycle, in the order an order walks through it. The
    // four original values are kept exactly as they were  every existing
    // document, filter and dashboard aggregation still reads them  and the
    // three the back-office was missing are appended. OrderStatusHistory reads
    // this enum back off the schema, so its own list follows automatically.
    status: {
      type: String,
      enum: [
        "Pending", // en attente de paiement
        "Payment-Accepted", // paiement accepté, pas encore préparé
        "Processing", // en préparation
        "Shipped", // expédié, en cours de livraison
        "Delivered", // terminé
        "Cancel", // annulée
        "Refunded", // remboursé
      ],
      default: "Pending",
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: false,
    },
    trackingId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    trackingStatus: {
      type: String,
      enum: ["Order Placed", "Confirmed", "On The Way", "Delivered"],
      default: "Order Placed",
    },

    // Free-text note left by the customer at checkout (delivery instructions,
    // gift message...).
    notes: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
  },
  {
    // createdAt / updatedAt
    timestamps: true,
    // Aliases are virtuals: without this they disappear from the JSON the API
    // sends back.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// The three lists the back-office and the customer account page page through.
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, status: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });


const reference = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${datePart}-${randomPart}`;
};

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${reference()}`;
  }
  if (!this.trackingId) {
    this.trackingId = `KB-${reference()}`;
  }
  next();
});

orderSchema.plugin(storeScopedPlugin);

const Order = mongoose.model(
  "Order",
  orderSchema.plugin(AutoIncrement, {
    inc_field: "invoice",
    start_seq: 10000,
  })
);

module.exports = Order;
