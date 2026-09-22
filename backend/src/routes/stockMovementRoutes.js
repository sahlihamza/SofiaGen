const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  addStockMovement,
  getAllStockMovements,
  getMovementsByProduct,
  getStockMovementById,
  updateStockMovement,
  deleteStockMovement,
  deleteMovementsByProduct,
} = require("../controller/stockMovementController");

//add a stock movement
router.post("/add", addStockMovement);

//get all stock movements
router.get("/", getAllStockMovements);

//get all movements of a product
router.get("/product/:productId", getMovementsByProduct);

//get a stock movement by id
router.get("/:id", getStockMovementById);

//update a stock movement
router.patch("/:id", updateStockMovement);

//delete a stock movement
router.delete("/:id", deleteStockMovement);

//delete all movements of a product
router.delete("/product/:productId", deleteMovementsByProduct);

module.exports = router;
