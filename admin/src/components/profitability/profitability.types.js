/**
 * JSDoc typedefs for the Profitability calculator.
 *
 * The admin project is pure JavaScript (no `tsconfig.json`); we still get
 * IDE intellisense and runtime safety by exposing these typedefs and
 * importing them via `@typedef`.
 *
 * @typedef {Object} ProfitabilityInput
 * @property {number} costDelivery          Shipping cost paid by the merchant per order.
 * @property {number} costReturn            Return cost paid by the merchant per failed order.
 * @property {number} costFulfillment       Fulfillment cost paid by the merchant per order.
 * @property {number} costProduct           Product / COGS for one unit.
 * @property {number} salePrice             Sale price, **shipping included**.
 * @property {number} adCostPerOrder        Ad spend per received order.
 * @property {number} ordersReceived        Number of orders received (raw, pre-confirmation).
 * @property {number} confirmationRate      Confirmation rate in percent (0–100).
 * @property {number} deliveryRate          Delivery rate in percent (0–100), applied **on top of confirmed** orders.
 *
 * @typedef {Object} ProfitabilityResult
 * @property {number} confirmedOrders                OrdersReceived × confirmationRate/100
 * @property {number} deliveredOrders                ConfirmedOrders × deliveryRate/100
 * @property {number} profitPerUnit                  SalePrice − costProduct − costDelivery
 * @property {number} totalProfit                    See {@link calculateProfitability}
 * @property {number} adCostPerDeliveredOrder        (OrdersReceived × adCostPerOrder) / deliveredOrders

 * @property {number} breakEvenPrice                 Minimum sale price to cover all costs at the configured rates.
 *
 * @typedef {Object} ProfitabilityFieldMeta
 * @property {string} key
 * @property {string} label
 * @property {string} [hint]
 * @property {string} unit
 * @property {"number"} type
 * @property {number} min
 * @property {number} [max]
 * @property {number} step
 */

export {};