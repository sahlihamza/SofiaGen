// A preview of what the API will compute when an edited order is saved.
//
// The server is the authority  src/service/orderEditService.js recomputes
// every amount from the lines and sends them back  but an admin changing a
// quantity should not have to save to find out what it costs. The formulas are
// deliberately the same ones, and the two are only allowed to disagree by
// staying identical.

export const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const num = (value) => Number(value) || 0;

// checkoutService writes
//   total = subTotal  discount + shipping + (pricesIncludeTax ? 0 : tax)
// and the order does not remember which of the two it was, so it is read back
// off the amounts that were charged.
export const taxIsAddedOnTop = (order) => {
  const base = round2(
    num(order?.subTotal) - num(order?.discount) + num(order?.shippingCost)
  );
  const withTax = round2(base + num(order?.tax));

  return (
    Math.abs(num(order?.total) - withTax) <= Math.abs(num(order?.total) - base)
  );
};

export const lineTotal = (line) =>
  round2(num(line?.unitPrice) * num(line?.quantity));

export const lineNetTotal = (line) =>
  Math.max(0, round2(lineTotal(line) - num(line?.discount)));

/**
 * @param {object} order - the order as the API last sent it
 * @param {Array} lines - the draft lines
 * @param {number} shippingCost - the draft shipping cost
 */
export const previewAmounts = (order, lines = [], shippingCost = 0) => {
  const subTotal = round2(
    lines.reduce((sum, line) => sum + lineTotal(line), 0)
  );
  const discount = round2(
    lines.reduce((sum, line) => sum + num(line?.discount), 0)
  );

  const previousBase = round2(
    num(order?.subTotal) - num(order?.discount) + num(order?.shippingCost)
  );
  const base = Math.max(0, round2(subTotal - discount + num(shippingCost)));

  // Scaled with the taxable base rather than recomputed from a rate: the order
  // does not carry which lines were exempt, nor whether the prices already
  // contained the VAT.
  const tax =
    previousBase > 0
      ? Math.max(0, round2((num(order?.tax) * base) / previousBase))
      : 0;

  const total = Math.max(
    0,
    round2(base + (taxIsAddedOnTop(order) ? tax : 0))
  );

  return { subTotal, discount, tax, total };
};
