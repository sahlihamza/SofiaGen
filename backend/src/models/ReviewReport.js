const mongoose = require("mongoose");

// Ticket reasons: Spam, Contenu offensant, Faux avis, Langage inappropri, Autre.
const REPORT_REASONS = ["spam", "offensive", "fake", "inappropriate", "other"];

const reviewReportSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductReview",
      required: true,
    },
    // Same anonymous-or-customer identity scheme as ReviewVote.voterKey 
    // it enforces "one report per visitor per review".
    reporterKey: {
      type: String,
      required: [true, "L'identifiant du signaleur est obligatoire"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: [true, "Le motif est obligatoire"],
    },
    comment: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewReportSchema.index({ reviewId: 1, reporterKey: 1 }, { unique: true });
reviewReportSchema.index({ storeId: 1, reviewId: 1 });

const ReviewReport = mongoose.model("ReviewReport", reviewReportSchema, "review_reports");

module.exports = ReviewReport;
module.exports.REPORT_REASONS = REPORT_REASONS;
