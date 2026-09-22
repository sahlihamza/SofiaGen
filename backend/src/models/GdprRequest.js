const mongoose = require("mongoose");

const gdprRequestSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
   
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
    },
    customerEmailSnapshot: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["export", "delete", "anonymize"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },
    resultSummary: {
      type: Object,
      default: {},
    },
    errorMessage: {
      type: String,
      default: "",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  {
    collection: "gdpr_requests",
    timestamps: true,
  }
);

gdprRequestSchema.index({ storeId: 1, createdAt: -1 });

const GdprRequest = mongoose.model("GdprRequest", gdprRequestSchema);

module.exports = GdprRequest;
