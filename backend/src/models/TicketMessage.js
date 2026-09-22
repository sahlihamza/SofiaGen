const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
    },
    // Denormalized from the ticket so isolation filters don't need a populate.
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    // Same polymorphic-author pattern as SupportTicket.createdByType/createdBy:
    // author points to either the Customer or User collection depending on
    // authorType.
    authorType: {
      type: String,
      enum: ["customer", "agent"],
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    content: {
      type: String,
      required: [true, "Le contenu du message est obligatoire"],
    },
    isInternalNote: {
      type: Boolean,
      default: false,
    },
    isSolution: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: String,
      enum: ["up", "down", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ticketMessageSchema.index({ ticket: 1, createdAt: 1 });
ticketMessageSchema.index({ storeId: 1 });

const TicketMessage = mongoose.model("TicketMessage", ticketMessageSchema);

module.exports = TicketMessage;
