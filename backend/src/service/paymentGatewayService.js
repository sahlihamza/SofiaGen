const logger = require("../config/logger");
const { isOfflinePaymentMethod } = require("../utils/paymentMethods");
const paymentProviderFactory = require("./payment/PaymentProviderFactory");

const gatewayError = (message, code = "PAYMENT_INIT_FAILED") => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 502;
  return error;
};

const OFFLINE_INSTRUCTIONS = {
  cod: "Vous réglerez votre commande en espéces à la livraison.",
  bank_transfer:
    "Votre commande est enregistrée. Effectuez le virement en indiquant le numéro de commande en référence.",
  cheque: "Votre commande est enregistrée. Envoyez votre chéque en indiquant le numéro de commande.",
};

/**
 * Starts the payment for an order that has just been created.
 *
 * Offline methods (cash on delivery, bank transfer, check) settle outside the
 * app: nothing is charged, the order simply waits in `pending`. Online
 * gateways return either a client secret (Stripe, paid in-page) or a redirect
 * URL (PayPal, Konnect, Flouci).
 *
 * @param {object} order - the saved Order document
 * @param {object} method - the enabled PaymentSettings method chosen
 */
const initiatePayment = async (order, method) => {
  const key = method?.key;

  if (isOfflinePaymentMethod(key)) {
    return {
      provider: key,
      paymentStatus: "pending",
      requiresAction: false,
      instructions: method?.config?.instructions || OFFLINE_INSTRUCTIONS[key] || "",
    };
  }

  try {
    if (!paymentProviderFactory.has(key)) {
      throw gatewayError(
        `Le moyen de paiement  ${key}  n'est pas pris en charge.`,
        "UNSUPPORTED_PAYMENT_METHOD"
      );
    }
    const adapter = paymentProviderFactory.get(key, method?.config || {});
    return await adapter.createPayment(order, method);
  } catch (err) {
    if (err.code && err.statusCode) throw err;

    logger.error(`Payment initiation failed for ${key}`, err.message);
    throw gatewayError(
      err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        "L'initialisation du paiement a échoué.",
      "PAYMENT_INIT_FAILED"
    );
  }
};

module.exports = { initiatePayment };
