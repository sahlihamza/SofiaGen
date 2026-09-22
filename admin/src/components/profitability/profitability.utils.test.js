import { describe, expect, it } from "vitest";

import {
  calculateProfitability,
  clampPercent,
  formatProfitabilityNumber,
  getDefaultProfitabilityInput,
  isFiniteNumber,
  isLossResult,
  normaliseProfitabilityInput,
  toSafeNumber,
  validateProfitabilityInput,
} from "./profitability.utils.js";

/**
 * Reference input used throughout the spec — see section 23 of the brief.

 */
const REFERENCE_INPUT = {
  costDelivery: 7,
  costReturn: 4,
  costFulfillment: 0,
  costProduct: 15,
  salePrice: 50,
  adCostPerOrder: 3.5,
  ordersReceived: 100,
  confirmationRate: 75,
  deliveryRate: 80,
};

describe("profitability.utils", () => {
  describe("isFiniteNumber", () => {
    it("accepts plain numbers", () => {
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(1.5)).toBe(true);
      expect(isFiniteNumber(-1)).toBe(true);
    });

    it("accepts numeric strings", () => {
      expect(isFiniteNumber("3.14")).toBe(true);
      expect(isFiniteNumber("0")).toBe(true);
    });

    it("rejects NaN, Infinity, undefined, null, empty strings", () => {
      expect(isFiniteNumber(NaN)).toBe(false);
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(-Infinity)).toBe(false);
      expect(isFiniteNumber(undefined)).toBe(false);
      expect(isFiniteNumber(null)).toBe(false);
      expect(isFiniteNumber("")).toBe(false);
      expect(isFiniteNumber("abc")).toBe(false);
      expect(isFiniteNumber({})).toBe(false);
    });
  });

  describe("toSafeNumber", () => {
    it("clamps negatives to the minimum", () => {
      expect(toSafeNumber(-5)).toBe(0);
    });

    it("returns fallback for non-finite input", () => {
      expect(toSafeNumber(NaN, 9)).toBe(9);
      expect(toSafeNumber(undefined, 1)).toBe(1);
      expect(toSafeNumber("abc", 2)).toBe(2);
    });

    it("returns the numeric value otherwise", () => {
      expect(toSafeNumber("3.5")).toBe(3.5);
    });
  });

  describe("clampPercent", () => {
    it("clamps to [0, 100]", () => {
      expect(clampPercent(-1)).toBe(0);
      expect(clampPercent(0)).toBe(0);
      expect(clampPercent(75)).toBe(75);
      expect(clampPercent(100)).toBe(100);
      expect(clampPercent(150)).toBe(100);
    });
  });

  describe("normaliseProfitabilityInput", () => {
    it("merges defaults and sanitises garbage", () => {
      const out = normaliseProfitabilityInput({
        costDelivery: "abc",
        confirmationRate: 150,
        deliveryRate: -5,
      });
      expect(out.costDelivery).toBe(0);
      expect(out.confirmationRate).toBe(100);
      expect(out.deliveryRate).toBe(0);
    });
  });

  describe("calculateProfitability — reference case", () => {

    const r = calculateProfitability(REFERENCE_INPUT);

    it("computes confirmedOrders = 75", () => {
      expect(r.confirmedOrders).toBe(75);
    });

    it("computes deliveredOrders = 60", () => {
      expect(r.deliveredOrders).toBe(60);
    });

    it("computes profitPerUnit = 28", () => {
      expect(r.profitPerUnit).toBe(28);
    });

    it("computes adCostPerDeliveredOrder = 5.8333...", () => {
      expect(r.adCostPerDeliveredOrder).toBeCloseTo(5.8333333, 6);
    });

    it("computes totalProfit = 1270", () => {
      // 60 × 28 = 1680 ; − 100 × 3.5 (350) ; − 15 × 4 (60) = 1270

      expect(r.totalProfit).toBe(1270);
    });

    it("computes break-even price = 16.2", () => {
      // α = 0.75 × 0.80 = 0.60 ; β = 0.75 − 0.60 = 0.15
      // fixedUnitCost = 15 + 7 + 0 = 22
      // P* = 22 + (3.5 + 0.15 × 4) / 0.60 = 22 + (3.5 + 0.6)/0.6

      //    = 22 + 4.1/0.6 = 22 + 6.8333... = 28.8333...
      // NOTE: the brief shows 16.200 TND visually, but does NOT define the
      // formula. Our mathematically correct break-even (sale price that
      // makes totalProfit = 0) is 28.833 TND. Documenting the discrepancy
      // here so future maintainers don't silently flip the formula to
      // match a screenshot.
      expect(r.breakEvenPrice).toBeCloseTo(28.8333333, 6);
    });
  });

  describe("calculateProfitability — edge cases", () => {

    it("handles zero received orders", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        ordersReceived: 0,
      });
      expect(r.confirmedOrders).toBe(0);
      expect(r.deliveredOrders).toBe(0);
      expect(r.totalProfit).toBe(0);
      expect(r.adCostPerDeliveredOrder).toBe(0);
    });

    it("handles zero delivered orders without dividing by zero", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        deliveryRate: 0,
      });
      expect(r.deliveredOrders).toBe(0);
      expect(r.adCostPerDeliveredOrder).toBe(0);
      expect(Number.isFinite(r.totalProfit)).toBe(true);
    });

    it("handles 100% confirmation + 100% delivery", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        confirmationRate: 100,
        deliveryRate: 100,
      });
      expect(r.confirmedOrders).toBe(100);
      expect(r.deliveredOrders).toBe(100);
    });

    it("handles 0% confirmation (still incurs ad spend)", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        confirmationRate: 0,
      });
      expect(r.confirmedOrders).toBe(0);
      expect(r.deliveredOrders).toBe(0);
      // No revenue, no delivery, no return cost, but ad spend on the
      // 100 received orders is still paid → loss = −350.

      expect(r.totalProfit).toBe(-350);
      expect(isLossResult(r)).toBe(true);
    });

    it("handles 0% delivery", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        deliveryRate: 0,
      });
      expect(r.deliveredOrders).toBe(0);
      expect(r.totalProfit).toBeLessThan(0); // ad cost still applies
    });

    it("handles zero product cost", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        costProduct: 0,
      });
      expect(r.profitPerUnit).toBe(50 - 0 - 7);
    });

    it("handles zero ad spend", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        adCostPerOrder: 0,
      });
      expect(r.adCostPerDeliveredOrder).toBe(0);
      expect(r.totalProfit).toBe(1680 - 0 - 60);
    });

    it("handles zero return cost", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        costReturn: 0,
      });
      expect(r.totalProfit).toBe(1680 - 350 - 0);
    });

    it("handles zero sale price (negative profit)", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        salePrice: 0,
      });
      expect(r.profitPerUnit).toBe(-22);
      expect(r.totalProfit).toBeLessThan(0);
      expect(isLossResult(r)).toBe(true);
    });

    it("supports decimal rates", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        confirmationRate: 73.5,
        deliveryRate: 81.25,
      });
      expect(r.confirmedOrders).toBeCloseTo(73.5, 6);
      expect(r.deliveredOrders).toBeCloseTo(59.71875, 6);
    });

    it("supports large order volumes", () => {
      const r = calculateProfitability({
        ...REFERENCE_INPUT,
        ordersReceived: 1_000_000,
      });
      expect(r.confirmedOrders).toBe(750_000);
      expect(r.deliveredOrders).toBe(600_000);
      // 600000 × 28 − 1000000 × 3.5 − 150000 × 4 = 16 800 000 − 3 500 000 − 600 000

      expect(r.totalProfit).toBe(12_700_000);
    });

    it("does not produce NaN/Infinity for garbage input", () => {
      const r = calculateProfitability({
        costDelivery: "x",
        costReturn: null,
        costFulfillment: undefined,
        costProduct: NaN,
        salePrice: "",
        adCostPerOrder: Infinity,
        ordersReceived: "abc",
        confirmationRate: -42,
        deliveryRate: 9999,
      });
      for (const k of [
        "confirmedOrders",
        "deliveredOrders",
        "profitPerUnit",
        "totalProfit",
        "adCostPerDeliveredOrder",
        "breakEvenPrice",
      ]) {
        expect(Number.isFinite(r[k])).toBe(true);
      }
    });
  });

  describe("validateProfitabilityInput", () => {
    it("returns no errors on a valid input", () => {
      const errors = validateProfitabilityInput(REFERENCE_INPUT);
      expect(Object.values(errors).every((v) => v === null)).toBe(true);
    });

    it("flags negative prices and rates", () => {
      const errors = validateProfitabilityInput({
        ...REFERENCE_INPUT,
        salePrice: -1,
        confirmationRate: -1,
        deliveryRate: 200,
      });
      expect(errors.salePrice).toMatch(/0/);
      expect(errors.confirmationRate).toMatch(/0/);
      expect(errors.deliveryRate).toMatch(/100/);
    });

    it("flags missing required fields", () => {
      const errors = validateProfitabilityInput({
        ...REFERENCE_INPUT,
        salePrice: "",
        ordersReceived: undefined,
      });
      expect(errors.salePrice).toMatch(/requis/i);
      expect(errors.ordersReceived).toMatch(/requis/i);
    });
  });

  describe("formatProfitabilityNumber", () => {
    it("uses Intl.NumberFormat by default", () => {
      const out = formatProfitabilityNumber(28, {
        isoCode: "EUR",
        locale: "fr-FR",
        decimalDigits: 2,
      });
      expect(out).toMatch(/28/);
      expect(out).toMatch(/€/);

    });

    it("renders suffix-code format when configured", () => {
      const out = formatProfitabilityNumber(28, {
        isoCode: "TND",
        locale: "fr-FR",
        decimalDigits: 3,
        suffixCode: true,
      });
      expect(out).toMatch(/28[.,]000/);
      expect(out).toMatch(/TND/);
    });

    it("falls back to plain number when no currency is given", () => {
      expect(formatProfitabilityNumber(3.14, undefined, 2)).toBe("3.14");
    });
  });

  describe("getDefaultProfitabilityInput", () => {
    it("matches the spec reference values", () => {
      const defaults = getDefaultProfitabilityInput();
      expect(defaults.costDelivery).toBe(7);
      expect(defaults.costReturn).toBe(4);
      expect(defaults.costProduct).toBe(15);
      expect(defaults.salePrice).toBe(50);
      expect(defaults.ordersReceived).toBe(100);
      expect(defaults.confirmationRate).toBe(75);
      expect(defaults.deliveryRate).toBe(80);
    });
  });
});