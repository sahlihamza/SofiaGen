const stockReservationService = require("../service/stockReservationService");

const handleError = (res, err, fallbackMessage) =>
  res.status(err.statusCode || 500).send({
    message: err.message || fallbackMessage,
  });

// GET /api/stock-reservations?status=&orderId=&productId=&page=&limit=
const getAllStockReservations = async (req, res) => {
  try {
    const result = await stockReservationService.list(req.query);
    res.send(result);
  } catch (err) {
    handleError(res, err, "Error occur when fetching stock reservations");
  }
};

// GET /api/stock-reservations/order/:orderId  what this order is holding.
const getReservationsByOrder = async (req, res) => {
  try {
    const reservations = await stockReservationService.getByOrderId(req.params.orderId);
    res.send(reservations);
  } catch (err) {
    handleError(res, err, "Error occur when fetching the order reservations");
  }
};

// PUT /api/stock-reservations/order/:orderId/release
// Really puts the units back in the catalogue  this is not a status flag, it
// is the stock coming back. Idempotent: a hold already released is left alone.
const releaseOrderReservations = async (req, res) => {
  try {
    const released = await stockReservationService.releaseForOrder(req.params.orderId);

    res.send({
      message: `${released.length} rûrervation(s) libéré(s).`,
      released,
    });
  } catch (err) {
    handleError(res, err, "Error occur when releasing the order reservations");
  }
};

// PUT /api/stock-reservations/order/:orderId/consume
// The order shipped: the holds are closed and the units can no longer come
// back. Nothing moves in the catalogue, they left it when they were reserved.
const consumeOrderReservations = async (req, res) => {
  try {
    const consumed = await stockReservationService.consumeForOrder(req.params.orderId);

    res.send({ message: `${consumed} rûrervation(s) consommé(s).` });
  } catch (err) {
    handleError(res, err, "Error occur when consuming the order reservations");
  }
};

module.exports = {
  getAllStockReservations,
  getReservationsByOrder,
  releaseOrderReservations,
  consumeOrderReservations,
};
