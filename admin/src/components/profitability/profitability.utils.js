/**
 * Profitability calculator — pure formulas + helpers.

 *
 * All formulas are isolated here so they can be unit-tested independently
 * from the UI. The component layer is a thin wrapper that feeds inputs
 * into `calculateProfitability` and renders the result.
 *
 * No network, no React, no DOM. Safe to call inside `useMemo`.
 */

import { PROFITABILITY_DEFAULTS } from "./profitability.constants.js";

/**
 * Returns true when the value is a finite, non-NaN number.
 * Strings that parse to a finite number are accepted; everything else is
 * rejected (NaN, Infinity, undefined, null, objects, empty strings).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n);
}

/**
 * Coerces any input into a finite number, falling back to `fallback`.
 * Negative values are clamped to `min` (default 0) to satisfy the
 * validation rules defined in the spec (no negative prices/costs).
 *
 * @param {unknown} value
 * @param {number} [fallback=0]
 * @param {number} [min=0]
 * @returns {number}
 */
export function toSafeNumber(value, fallback = 0, min = 0) {
  if (!isFiniteNumber(value)) return fallback;
  const n = Number(value);
  if (n < min) return min;
  return n;
}

/**
 * Clamps a percentage to the [0, 100] range.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function clampPercent(value) {
  return Math.min(100, Math.max(0, toSafeNumber(value, 0)));
}

/**
 * Normalises a raw form payload into a clean {@link ProfitabilityInput}
 * with safe numeric values. Used both for validation and for the
 * "recompute on every change" behaviour.
 *
 * @param {Partial<ProfitabilityInput>} raw
 * @returns {ProfitabilityInput}
 */
export function normaliseProfitabilityInput(raw) {
  return {
    costDelivery: toSafeNumber(raw?.costDelivery),
    costReturn: toSafeNumber(raw?.costReturn),
    costFulfillment: toSafeNumber(raw?.costFulfillment),
    costProduct: toSafeNumber(raw?.costProduct),
    salePrice: toSafeNumber(raw?.salePrice),
    adCostPerOrder: toSafeNumber(raw?.adCostPerOrder),
    ordersReceived: toSafeNumber(raw?.ordersReceived),
    confirmationRate: clampPercent(raw?.confirmationRate),
    deliveryRate: clampPercent(raw?.deliveryRate),
  };
}

/**
 * Pure profitability calculation.
 *
 * Formulas (all operating on the *normalised* input):
 *
 *   confirmedOrders     = ordersReceived × confirmationRate/100
 *   deliveredOrders     = confirmedOrders × deliveryRate/100
 *   profitPerUnit       = salePrice − costProduct − costDelivery
 *   failedOrders        = confirmedOrders − deliveredOrders
 *   returnCost          = failedOrders × costReturn
 *   totalAdCost         = ordersReceived × adCostPerOrder
 *   adCostPerDelivered  = deliveredOrders > 0 ? totalAdCost / deliveredOrders : 0
 *   grossProfit         = deliveredOrders × profitPerUnit
 *   totalProfit         = grossProfit − totalAdCost − returnCost − (deliveredOrders × costFulfillment)

 *
 * Break-even price (salePrice that makes `totalProfit = 0`):
 *
 *   Let A  = costProduct + costDelivery + costFulfillment
 *   Let α  = deliveryRate/100 × confirmationRate/100      (delivered share of received)
 *   Let β  = confirmationRate/100 − α                     (failed share of received)
 *   Let P* = A + (adCostPerOrder + β × costReturn) / α
 *
 *   → breakEvenPrice = P*  (undefined when α = 0, i.e. nobody delivers)
 *
 * Rationale: totalProfit = 0 ⇒
 *   salePrice·α·n  −  n·(costProduct+costDelivery+costFulfillment)·α
 *   − n·adCostPerOrder − n·β·costReturn = 0

 * Solving for `salePrice` yields the formula above. The derivation is
 * captured in `profitability.utils.test.js`.
 *
 * @param {Partial<ProfitabilityInput>} rawInput
 * @returns {ProfitabilityResult}
 */
export function calculateProfitability(rawInput) {
  const input = normaliseProfitabilityInput(rawInput);

  const confirmedOrders = (input.ordersReceived * input.confirmationRate) / 100;
  const deliveredOrders = (confirmedOrders * input.deliveryRate) / 100;
  const failedOrders = confirmedOrders - deliveredOrders;

  const profitPerUnit = input.salePrice - input.costProduct - input.costDelivery;

  const returnCost = failedOrders * input.costReturn;
  const fulfillmentCost = deliveredOrders * input.costFulfillment;
  const totalAdCost = input.ordersReceived * input.adCostPerOrder;

  const adCostPerDeliveredOrder =
    deliveredOrders > 0 ? totalAdCost / deliveredOrders : 0;

  const grossProfit = deliveredOrders * profitPerUnit;
  const totalProfit = grossProfit - totalAdCost - returnCost - fulfillmentCost;

  const alpha = (input.deliveryRate / 100) * (input.confirmationRate / 100);
  const beta = (input.confirmationRate / 100) - alpha;
  const fixedUnitCost =
    input.costProduct + input.costDelivery + input.costFulfillment;

  let breakEvenPrice;
  if (alpha > 0) {
    breakEvenPrice =
      fixedUnitCost + (input.adCostPerOrder + beta * input.costReturn) / alpha;
  } else {
    breakEvenPrice = 0;
  }

  return {
    confirmedOrders,
    deliveredOrders,
    profitPerUnit,
    totalProfit,
    adCostPerDeliveredOrder,
    breakEvenPrice,
  };
}

/**
 * Validation rules for a {@link ProfitabilityInput}.
 * Returns an object whose keys are field names and values are an error
 * string or `null` when valid.
 *
 * @param {Partial<ProfitabilityInput>} raw
 * @returns {Record<keyof ProfitabilityInput, string | null>}
 */
export function validateProfitabilityInput(raw) {
  const errors = {
    costDelivery: null,
    costReturn: null,
    costFulfillment: null,
    costProduct: null,
    salePrice: null,
    adCostPerOrder: null,
    ordersReceived: null,
    confirmationRate: null,
    deliveryRate: null,
  };

  const checkNonNeg = (field) => {
    const v = raw?.[field];
    if (v === "" || v === null || v === undefined) {
      errors[field] = "Champ requis";
    } else if (!isFiniteNumber(v)) {
      errors[field] = "Valeur invalide";
    } else if (Number(v) < 0) {
      errors[field] = "Doit être ≥ 0";

    }
  };

  const checkPercent = (field) => {
    const v = raw?.[field];
    if (v === "" || v === null || v === undefined) {
      errors[field] = "Champ requis";
    } else if (!isFiniteNumber(v)) {
      errors[field] = "Valeur invalide";
    } else {
      const n = Number(v);
      if (n < 0 || n > 100) {
        errors[field] = "Doit être entre 0 et 100";
      }
    }
  };

  checkNonNeg("costDelivery");
  checkNonNeg("costReturn");
  checkNonNeg("costFulfillment");
  checkNonNeg("costProduct");
  checkNonNeg("salePrice");
  checkNonNeg("adCostPerOrder");
  checkNonNeg("ordersReceived");
  checkPercent("confirmationRate");
  checkPercent("deliveryRate");

  return errors;
}

/**
 * Currency-aware number formatter.
 *
 * Prefers `Intl.NumberFormat` when a real locale is configured. When the
 * currency object exposes `suffixCode: true` (typical for TND where the
 * desired rendering is `28.000 TND` — code as a suffix rather than a

 * localised symbol), it falls back to a deterministic "<n> <CODE>"
 * format with a fixed number of decimals.
 *
 * Falls back to plain `Number.toFixed` formatting if no currency is
 * supplied, so this helper stays safe to use during tests.
 *
 * @param {number} amount
 * @param {{isoCode?: string, decimalDigits?: number, locale?: string, suffixCode?: boolean, symbol?: string} | string} [currency]
 * @param {number} [decimals]   override the number of fraction digits
 * @returns {string}
 */
export function formatProfitabilityNumber(amount, currency, decimals) {
  const safeAmount = toSafeNumber(amount, 0);

  if (!currency) {
    return safeAmount.toFixed(decimals ?? 2);
  }

  if (typeof currency === "string") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(safeAmount);
  }

  const isoCode = currency.isoCode || "USD";
  const locale = currency.locale || "en-US";
  const fractionDigits = decimals ?? currency.decimalDigits ?? 2;
  const useSuffix = Boolean(currency.suffixCode);

  if (useSuffix) {
    const body = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(safeAmount);
    return `${body} ${isoCode}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: isoCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeAmount);
}

/**
 * Convenience: returns a default initial input object. Used by the
 * component when no `initialValues` prop is provided.
 *
 * @returns {ProfitabilityInput}
 */
export function getDefaultProfitabilityInput() {
  return { ...PROFITABILITY_DEFAULTS };
}

/**
 * True when the calculator's headline number (total profit) is in the red.
 *
 * @param {ProfitabilityResult} result
 * @returns {boolean}
 */
export function isLossResult(result) {
  return Number(result?.totalProfit ?? 0) < 0;
}