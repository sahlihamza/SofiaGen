const OrderItem = require("../models/OrderItem");

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Splits `amount` over `weights` in proportion to each weight, and hands the
// rounding remainder to the heaviest share  so the parts always add up to the
// amount to the cent, which is what makes (item.discount) === order.discount
// and (item.tax) === the VAT charged on the items.
const allocate = (amount, weights) => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const parts = weights.map(() => 0);

  if (!(amount > 0) || !(total > 0)) return parts;

  let allocated = 0;
  weights.forEach((weight, index) => {
    parts[index] = round2((amount * weight) / total);
    allocated = round2(allocated + parts[index]);
  });

  const remainder = round2(amount - allocated);
  if (remainder !== 0) {
    const heaviest = weights.indexOf(Math.max(...weights));
    parts[heaviest] = Math.max(0, round2(parts[heaviest] + remainder));
  }

  return parts;
};

/**
 * Turns the checkout lines into order_items rows.
 *
 * A coupon discounts the cart and the VAT is computed on the cart, so neither
 * exists per line: both are allocated here. The discount goes over every line
 * in proportion to its amount (the same rule checkoutTaxService already uses to
 * shelter VAT), the VAT only over the taxable ones  and never the share of it
 * that belongs to the shipping fee.
 *
 * @param {object|string} orderId
 * @param {object} params
 * @param {Array} params.lines - checkoutCartService.buildCartLines() lines
 * @param {number} params.discount - order-wide discount, already capped
 * @param {object} params.tax - checkoutTaxService.calculateTax() result
 * @param {number} params.shippingCost
 * @param {boolean} params.shippingTaxable
 * @returns {Array} documents ready for OrderItem.insertMany
 */
const buildOrderItems = (
  orderId,
  { lines = [], discount = 0, tax = {}, shippingCost = 0, shippingTaxable = true } = {}
) => {
  if (lines.length === 0) return [];

  const discounts = allocate(
    Math.min(Number(discount) || 0, lines.reduce((sum, line) => sum + line.lineTotal, 0)),
    lines.map((line) => line.lineTotal)
  );

  // The VAT charged on the items is the whole VAT minus the part the shipping
  // fee contributed to the taxable base.
  const taxAmount = Number(tax.amount) || 0;
  const taxableBase = Number(tax.taxableBase) || 0;
  const shippingBase = shippingTaxable ? Number(shippingCost) || 0 : 0;
  const itemsTax =
    taxableBase > 0
      ? round2((taxAmount * Math.max(0, taxableBase - shippingBase)) / taxableBase)
      : 0;

  const taxes = allocate(
    itemsTax,
    // A non-taxable line weighs nothing, so it receives no VAT.
    lines.map((line, index) =>
      line.taxable ? Math.max(0, round2(line.lineTotal - discounts[index])) : 0
    )
  );

  return lines.map((line, index) => ({
    orderId,
    productId: line.productId,
    variationId: line.variationId || null,
    productName: line.name,
    sku: line.sku || "",
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount: discounts[index],
    tax: taxes[index],
    total: Math.max(0, round2(line.lineTotal - discounts[index])),
  }));
};

/**
 * Writes the lines of an order that has just been created. Called before the
 * payment is started: if it fails, the checkout is aborted and nothing has
 * been charged yet.
 */
const createForOrder = async (order, context) => {
  const items = buildOrderItems(order._id, {
    lines: context.cart.lines,
    discount: context.discount,
    tax: context.tax,
    shippingCost: context.shippingCost,
    shippingTaxable: context.selectedShipping ? context.selectedShipping.taxable : true,
  });

  if (items.length === 0) return [];

  return OrderItem.insertMany(items);
};

const getByOrderId = (orderId) => OrderItem.find({ orderId }).sort({ createdAt: 1 });

// Only for an order whose creation failed halfway: a placed order keeps its
// lines forever.
const deleteForOrder = (orderId) => OrderItem.deleteMany({ orderId });

module.exports = {
  buildOrderItems,
  createForOrder,
  getByOrderId,
  deleteForOrder,
  // exported for tests
  allocate,
};
