const mongoose = require("mongoose");

const CATEGORIES = [
  "orders",
  "payments",
  "inventory",
  "subscriptions",
  "invoices",
  "users",
  "security",
  "store",
  "system",
  "customers",
  "reviews",
  "tickets",
];

const CRITICAL_CATEGORIES = ["security"];

const channelPrefSchema = new mongoose.Schema(
  {
    in_app: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
  },
  { _id: false }
);

const notificationPreferenceSchema = new mongoose.Schema(
  {
    // SFG-80 Phase 4: originally User-only. notify()/resolveChannelsForRecipient
    // skipped preference lookup entirely for recipientModel !== "User", so a
    // customer had no way to opt out of ticket emails  customerId added
    // (userId now optional) so a customer preference doc can exist alongside
    // the existing per-agent ones. Exactly one of userId/customerId is set.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },
    preferences: {
      type: Map,
      of: channelPrefSchema,
      default: {},
    },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index(
  { userId: 1, storeId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);
notificationPreferenceSchema.index(
  { customerId: 1, storeId: 1 },
  { unique: true, partialFilterExpression: { customerId: { $type: "objectId" } } }
);

const NotificationPreference = mongoose.model("NotificationPreference", notificationPreferenceSchema);

module.exports = NotificationPreference;
module.exports.CATEGORIES = CATEGORIES;
module.exports.CRITICAL_CATEGORIES = CRITICAL_CATEGORIES;
