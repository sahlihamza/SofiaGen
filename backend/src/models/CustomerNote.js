const mongoose = require("mongoose");

const customerNoteSchema = new mongoose.Schema(
  {
    // Multi-store SaaS: copied from the parent customer on create so notes can
    // be queried per boutique without a join.
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    // Many-to-one: a note always belongs to exactly one customer.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    // The staff member who wrote it. Null for notes added by the system.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  {
    collection: "customer_notes",
    // adds createdAt and updatedAt automatically
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerNoteSchema.index({ storeId: 1, customerId: 1 });
// "Historique complet": the timeline of a customer, newest first.
customerNoteSchema.index({ customerId: 1, createdAt: -1 });

const CustomerNote = mongoose.model("CustomerNote", customerNoteSchema);

module.exports = CustomerNote;
