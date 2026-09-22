const mongoose = require("mongoose");

const ticketCategorySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Le nom de la catégorie est obligatoire"],
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ticketCategorySchema.index({ storeId: 1, isActive: 1 });

const TicketCategory = mongoose.model("TicketCategory", ticketCategorySchema);

module.exports = TicketCategory;
