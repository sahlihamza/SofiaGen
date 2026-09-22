const checkoutService = require("../service/checkoutService");
const logger = require("../config/logger");
const { resolveStoreId } = require("../utils/requestContext");

const handleError = (res, err, fallbackMessage) => {
  const status = err.statusCode || 500;

  if (status >= 500) {
    logger.error(fallbackMessage, err.message);
  }

  return res.status(status).json({
    success: false,
    code: err.code,
    message: err.message || fallbackMessage,
    ...(err.errors ? { errors: err.errors } : {}),
    ...(err.summary ? { summary: err.summary } : {}),
    ...(err.orderId ? { orderId: err.orderId } : {}),
  });
};

// GET /api/checkout
// Everything the checkout page needs before the customer types anything:
// account, saved addresses, delivery options for a destination, enabled
// payment methods and the store's currency/tax configuration.
const getCheckout = async (req, res) => {
  try {
    const context = await checkoutService.getCheckoutContext({
      customer: req.customer,
      query: req.query,
      storeId: resolveStoreId(req),
    });

    return res.json({ success: true, ...context });
  } catch (err) {
    return handleError(res, err, "Failed to build the checkout context");
  }
};

// POST /api/checkout/validate
// Dry run: recomputes prices, stock, shipping, coupon and VAT server-side and
// answers with everything that would block the order. Creates nothing.
const validateCheckout = async (req, res) => {
  try {
    const result = await checkoutService.validateCheckout(req.body, {
      customer: req.customer,
      storeId: resolveStoreId(req),
    });

    return res.status(result.valid ? 200 : 422).json({ success: result.valid, ...result });
  } catch (err) {
    return handleError(res, err, "Failed to validate the checkout");
  }
};

// POST /api/checkout/place-order
// Same validation, then the order is created, the stock reserved, the payment
// started and the confirmation e-mail sent.
const placeOrder = async (req, res) => {
  try {
    const { order, payment, summary } = await checkoutService.placeOrder(req.body, {
      customer: req.customer,
      storeId: resolveStoreId(req),
    });

    return res.status(201).json({
      success: true,
      order,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      payment,
      summary,
    });
  } catch (err) {
    return handleError(res, err, "Failed to place the order");
  }
};

// GET /api/checkout/order/:id?email=
// Order confirmation page. /api/order/:id needs a customer token, which a
// guest doesn't have, so the order is served here against the e-mail it was
// placed with  the id alone is never enough.
const getOrderConfirmation = async (req, res) => {
  try {
    const order = await checkoutService.getOrderForConfirmation(req.params.id, {
      customer: req.customer,
      email: req.query.email,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Commande introuvable." });
    }

    return res.json({ success: true, order });
  } catch (err) {
    return handleError(res, err, "Failed to load the order confirmation");
  }
};

module.exports = { getCheckout, validateCheckout, placeOrder, getOrderConfirmation };

