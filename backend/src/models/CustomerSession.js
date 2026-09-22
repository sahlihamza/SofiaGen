const mongoose = require("mongoose");

const customerSessionSchema = new mongoose.Schema(
  {
    // Multi-store SaaS: copied from the parent customer on create so sessions
    // can be queried per boutique without a join.
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    // Many-to-one: a session always belongs to exactly one customer.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    // Holds a SHA-256 digest of the access token, never the token itself: a
    // dump of this collection must not hand over live sessions. The service
    // hashes on write and on lookup, so callers still pass the raw token.
    token: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    ip: {
      type: String,
      required: false,
      trim: true,
    },
    browser: {
      type: String,
      required: false,
      trim: true,
    },
    device: {
      type: String,
      required: false,
      trim: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "customer_sessions",
    // adds createdAt and updatedAt automatically
    timestamps: true,
    toJSON: {
      virtuals: true,
      // select:false only hides the digest on reads; a freshly created document
      // still holds it, so strip it on the way out too.
      transform: (doc, ret) => {
        delete ret.token;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

customerSessionSchema.index({ storeId: 1, customerId: 1 });
// "Sessions actives" listing: a customer's sessions, most recent first.
customerSessionSchema.index({ customerId: 1, lastLogin: -1 });
// MongoDB drops each document once expiresAt passes, so dead sessions do not
// pile up and cannot be replayed.
customerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

customerSessionSchema.virtual("isExpired").get(function () {
  return !!this.expiresAt && this.expiresAt.getTime() <= Date.now();
});

const CustomerSession = mongoose.model(
  "CustomerSession",
  customerSessionSchema
);

module.exports = CustomerSession;
