const StockMovement = require("../models/StockMovement");

const createStockMovement = async (data) => {
  const newStockMovement = new StockMovement(data);
  return newStockMovement.save();
};

const getAllStockMovements = async () => {
  return StockMovement.find()
    .populate({ path: "product", select: "_id title sku" })
    .populate({ path: "createdBy", select: "_id name email" })
    .sort({ movementDate: -1 });
};

const getMovementsByProduct = async (productId) => {
  return StockMovement.find({ product: productId })
    .populate({ path: "createdBy", select: "_id name email" })
    .sort({ movementDate: -1 });
};

const getStockMovementById = async (id) => {
  return StockMovement.findById(id)
    .populate({ path: "product", select: "_id title sku" })
    .populate({ path: "createdBy", select: "_id name email" });
};

const updateStockMovement = async (id, data) => {
  const movement = await StockMovement.findById(id);

  if (!movement) return null;

  if (data.quantity !== undefined) movement.quantity = data.quantity;
  if (data.previousQuantity !== undefined)
    movement.previousQuantity = data.previousQuantity;
  if (data.currentQuantity !== undefined)
    movement.currentQuantity = data.currentQuantity;
  if (data.reference !== undefined) movement.reference = data.reference;
  if (data.note !== undefined) movement.note = data.note;
  if (data.movementDate !== undefined)
    movement.movementDate = data.movementDate;
  if (data.createdBy !== undefined) movement.createdBy = data.createdBy;

  return movement.save();
};

const deleteStockMovement = async (id) => {
  return StockMovement.deleteOne({ _id: id });
};

const deleteMovementsByProduct = async (productId) => {
  return StockMovement.deleteMany({ product: productId });
};

module.exports = {
  createStockMovement,
  getAllStockMovements,
  getMovementsByProduct,
  getStockMovementById,
  updateStockMovement,
  deleteStockMovement,
  deleteMovementsByProduct,
};
