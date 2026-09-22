const mongoose = require("mongoose");

const reviewVoteSchema = new mongoose.Schema(
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
    // Stable identifier of the voter: the customerId when logged in, otherwise
    // an anonymous key generated client-side (kept in localStorage). This is
    // what enforces "one vote per user" even for guests.
    voterKey: {
      type: String,
      required: [true, "L'identifiant du votant est obligatoire"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
    },
    vote: {
      type: String,
      enum: ["up", "down"],
      required: [true, "Le vote est obligatoire"],
    },
  },
  {
    timestamps: true,
  }
);

// Ticket rule: a user can only vote once per review (voting again toggles or
// switches the existing vote instead of adding a second one).
reviewVoteSchema.index({ reviewId: 1, voterKey: 1 }, { unique: true });
reviewVoteSchema.index({ storeId: 1, reviewId: 1 });

const ReviewVote = mongoose.model("ReviewVote", reviewVoteSchema, "review_votes");

module.exports = ReviewVote;
