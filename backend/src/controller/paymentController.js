const paymentService = require("../service/paymentService");

const handleError = (res, err, fallbackMessage) =>
  res.status(err.statusCode || 500).send({
    message: err.message || fallbackMessage,
  });

// GET /api/payments?status=&method=&orderId=&startDate=&endDate=&page=&limit=
const getAllPayments = async (req, res) => {
  try {
    const result = await paymentService.list(req.query);
    res.send(result);
  } catch (err) {
    handleError(res, err, "Error occur when fetching payments");
  }
};

// GET /api/payments/order/:orderId  every attempt made on one order.
const getPaymentsByOrder = async (req, res) => {
  try {
    const payments = await paymentService.getByOrderId(req.params.orderId);
    res.send(payments);
  } catch (err) {
    handleError(res, err, "Error occur when fetching the order payments");
  }
};

// GET /api/payments/:id
const getPaymentById = async (req, res) => {
  try {
    const payment = await paymentService.getById(req.params.id);

    if (!payment) {
      return res.status(404).send({ message: "Payment not found" });
    }

    res.send(payment);
  } catch (err) {
    handleError(res, err, "Error occur when fetching the payment");
  }
};

// POST /api/payments/add
// Records a payment the app didn't take itself: cash on delivery handed to the
// rider, a bank transfer seen on the statement, a check cashed.
const addPayment = async (req, res) => {
  try {
    const payment = await paymentService.create(req.body);
    res.status(201).send(payment);
  } catch (err) {
    handleError(res, err, "Error occur when adding the payment");
  }
};

// PUT /api/payments/:id/status  { status, paidAt? }
// The order's paymentStatus follows the payment, see paymentService.
const updatePaymentStatus = async (req, res) => {
  try {
    if (!req.body.status) {
      return res.status(400).send({ message: "Le statut du paiement est obligatoire." });
    }

    const payment = await paymentService.updateStatus(req.params.id, req.body.status, {
      paidAt: req.body.paidAt,
    });

    if (!payment) {
      return res.status(404).send({ message: "Payment not found" });
    }

    res.send(payment);
  } catch (err) {
    handleError(res, err, "Error occur when updating the payment status");
  }
};

module.exports = {
  getAllPayments,
  getPaymentsByOrder,
  getPaymentById,
  addPayment,
  updatePaymentStatus,
};
