/**
 * Profitability calculator — shared constants.

 *
 * Centralised so that labels, units, defaults and styling hints are not
 * hard-coded inside the JSX. The currency is NOT hard-coded here; it is
 * provided by the caller via the `currency` prop / `useCurrency()` hook.
 */

export const PROFITABILITY_FIELD_KEYS = Object.freeze({
  costDelivery: "costDelivery",
  costReturn: "costReturn",
  costFulfillment: "costFulfillment",
  costProduct: "costProduct",
  salePrice: "salePrice",
  adCostPerOrder: "adCostPerOrder",
  ordersReceived: "ordersReceived",
  confirmationRate: "confirmationRate",
  deliveryRate: "deliveryRate",
});

/**
 * Default values used when no `initialValues` are passed.
 * Mirrors the values shown in the product spec example so that the modal
 * renders with sensible numbers on first open.
 */
export const PROFITABILITY_DEFAULTS = Object.freeze({
  costDelivery: 7,
  costReturn: 4,
  costFulfillment: 0,
  costProduct: 15,
  salePrice: 50,
  adCostPerOrder: 3.5,
  ordersReceived: 100,
  confirmationRate: 75,
  deliveryRate: 80,
});

/**
 * Field metadata: id, label, secondary label, unit, input type, min/max/step.
 *
 * `unit` is rendered next to the input. For TND it shows "TND"; for
 * percentages it shows "%"; for counts it shows "#". The currency code is
 * NOT hard-coded here — `unit` for monetary fields is provided by the

 * caller (so it follows the configured currency of the SaaS).
 */
export const PROFITABILITY_FIELDS = Object.freeze([
  {
    key: "costDelivery",
    label: "Coût Livraison",
    unit: "TND",
    type: "number",
    min: 0,
    step: 0.001,
  },
  {
    key: "costReturn",
    label: "Coût Retour",
    unit: "TND",
    type: "number",
    min: 0,
    step: 0.001,
  },
  {
    key: "costFulfillment",
    label: "Coût Fulfillment",
    unit: "TND",
    type: "number",
    min: 0,
    step: 0.001,
  },
  {
    key: "costProduct",
    label: "Coût Produit",
    unit: "TND",
    type: "number",
    min: 0,
    step: 0.001,
  },
  {
    key: "salePrice",
    label: "Prix de Vente",
    hint: "(livraison incluse)",
    unit: "TND",
    type: "number",
    min: 0,
    step: 0.001,
  },
  {
    key: "adCostPerOrder",
    label: "Coût par Commande",
    hint: "(pub)",
    unit: "TND",
    type: "number",
    min: 0,
    step: 0.001,
  },
  {
    key: "ordersReceived",
    label: "Total Commandes Reçues",

    unit: "#",
    type: "number",
    min: 0,
    step: 1,
  },
  {
    key: "confirmationRate",
    label: "Taux Confirmation",
    unit: "%",
    type: "number",
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    key: "deliveryRate",
    label: "Taux Livraison",
    hint: "(parmi confirmées)",

    unit: "%",
    type: "number",
    min: 0,
    max: 100,
    step: 0.1,
  },
]);

/**
 * Result-card metadata: id, label, value source key on the result object.
 * The tone drives the colour treatment (positive / negative / neutral).
 */
export const PROFITABILITY_RESULT_CARDS = Object.freeze([
  { key: "confirmedOrders", label: "Commandes Confirmées", tone: "neutral", decimals: 0 },
  { key: "deliveredOrders", label: "Commandes Livrées", tone: "neutral", decimals: 0 },
  { key: "profitPerUnit", label: "Profit / Unité", tone: "auto", decimals: 3 },

  { key: "totalProfit", label: "Profit Total", tone: "auto", decimals: 3 },
  { key: "adCostPerDeliveredOrder", label: "Coût Pub / Livré", tone: "neutral", decimals: 3 },
  { key: "breakEvenPrice", label: "Coût Break-Even", tone: "break-even", decimals: 3 },
]);