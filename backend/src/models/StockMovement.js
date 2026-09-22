const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: false,
    },
    currentQuantity: {
      type: Number,
      required: false,
    },
    reference: {
      type: String,
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    movementDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.plugin(storeScopedPlugin);

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);

module.exports = StockMovement;
