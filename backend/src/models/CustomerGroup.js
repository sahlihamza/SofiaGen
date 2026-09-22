const mongoose = require("mongoose");

const customerGroupSchema = new mongoose.Schema(
  {
    // Multi-store SaaS: a group belongs to one boutique. Kept optional while
    // the rest of the app has no storeId resolution yet.
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    // Percentage taken off the cart for members of this group. Consumed later
    // by promotions, pricing and coupons.
    discount: {
      type: Number,
      default: 0,
      min: [0, "La remise ne peut pas être négative"],
      max: [100, "La remise ne peut pas dépasser 100%"],
    },
  },
  {
    collection: "customer_groups",
    // adds createdAt and updatedAt automatically
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A group name is unique inside a boutique, so two stores can both have "VIP".
customerGroupSchema.index({ storeId: 1, name: 1 }, { unique: true });

// One-to-many relation: the members of the group. Populate "customers" to load
// them; use the customerCount returned by the service for plain listings.
customerGroupSchema.virtual("customers", {
  ref: "Customer",
  localField: "_id",
  foreignField: "groupId",
  options: { match: { deletedAt: null }, sort: { _id: -1 } },
});

const CustomerGroup = mongoose.model("CustomerGroup", customerGroupSchema);

module.exports = CustomerGroup;
