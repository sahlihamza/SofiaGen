const StockMovementService = require("../service/StockMovementService");

const addStockMovement = async (req, res) => {
  try {
    const movement = await StockMovementService.createStockMovement(req.body);
    res.send(movement);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllStockMovements = async (req, res) => {
  try {
    const movements = await StockMovementService.getAllStockMovements();
    res.send(movements);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getMovementsByProduct = async (req, res) => {
  try {
    const movements = await StockMovementService.getMovementsByProduct(
      req.params.productId
    );
    res.send(movements);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getStockMovementById = async (req, res) => {
  try {
    const movement = await StockMovementService.getStockMovementById(
      req.params.id
    );
    res.send(movement);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStockMovement = async (req, res) => {
  try {
    const movement = await StockMovementService.updateStockMovement(
      req.params.id,
      req.body
    );

    if (movement) {
      res.send({
        data: movement,
        message: "Stock movement updated successfully!",
      });
    } else {
      res.status(404).send({
        message: "Stock Movement Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteStockMovement = async (req, res) => {
  try {
    await StockMovementService.deleteStockMovement(req.params.id);
    res.status(200).send({
      message: "Stock Movement Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteMovementsByProduct = async (req, res) => {
  try {
    await StockMovementService.deleteMovementsByProduct(req.params.productId);
    res.status(200).send({
      message: "Stock Movements Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addStockMovement,
  getAllStockMovements,
  getMovementsByProduct,
  getStockMovementById,
  updateStockMovement,
  deleteStockMovement,
  deleteMovementsByProduct,
};
