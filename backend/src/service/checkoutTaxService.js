const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * VAT for one checkout. The project has no tax-rate engine (no rate table, no
 * per-jurisdiction lookup): the store configures a single rate in its general
 * settings and it applies to every taxable line. Products flagged
 * `taxStatus: "none"` and shipping methods flagged `taxStatus: "none"` stay out
 * of the taxable base.
 *
 * With `pricesIncludeTax` the catalogue prices already contain the VAT, so the
 * tax is extracted from the taxable base instead of being added on top  the
 * order total is unchanged, only the `tax` line differs.
 *
 * @param {object} params
 * @param {Array<{lineTotal: number, taxable: boolean}>} params.lines
 * @param {number} params.shippingCost
 * @param {boolean} params.shippingTaxable
 * @param {number} params.discount - already applied to the cart, reduces the base
 * @param {object} params.settings - GeneralSettings document (may be null)
 * @returns {{enabled: boolean, rate: number, amount: number, taxableBase: number, pricesIncludeTax: boolean}}
 */
const calculateTax = ({
  lines = [],
  shippingCost = 0,
  shippingTaxable = true,
  discount = 0,
  settings,
} = {}) => {
  const rate = Number(settings?.taxRate) || 0;
  const enabled = !!settings?.enableTaxes && rate > 0;
  const pricesIncludeTax = !!settings?.pricesIncludeTax;

  if (!enabled) {
    return { enabled: false, rate: 0, amount: 0, taxableBase: 0, pricesIncludeTax };
  }

  const taxableItems = lines.reduce(
    (sum, line) => sum + (line.taxable ? line.lineTotal : 0),
    0
  );
  const itemsTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  // A cart-wide discount is spread over the taxable lines in proportion to
  // their share of the cart, so a coupon never shelters more VAT than it
  // actually discounted.
  const taxableShare = itemsTotal > 0 ? taxableItems / itemsTotal : 0;
  const discountedTaxableItems = Math.max(0, taxableItems - discount * taxableShare);

  const taxableBase = round2(
    discountedTaxableItems + (shippingTaxable ? Number(shippingCost) || 0 : 0)
  );

  const amount = pricesIncludeTax
    ? round2(taxableBase - taxableBase / (1 + rate / 100))
    : round2((taxableBase * rate) / 100);

  return { enabled: true, rate, amount, taxableBase, pricesIncludeTax };
};

module.exports = { calculateTax };
