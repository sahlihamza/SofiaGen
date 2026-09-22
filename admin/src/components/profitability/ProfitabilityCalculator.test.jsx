import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ProfitabilityCalculator from "./ProfitabilityCalculator.jsx";

describe("<ProfitabilityCalculator />", () => {
  it("renders all input fields with correct units and labels", () => {
    render(<ProfitabilityCalculator />);

    expect(screen.getByLabelText("Coût Livraison")).toBeInTheDocument();
    expect(screen.getByLabelText("Coût Retour")).toBeInTheDocument();
    expect(screen.getByLabelText("Coût Fulfillment")).toBeInTheDocument();
    expect(screen.getByLabelText("Coût Produit")).toBeInTheDocument();
    expect(screen.getByLabelText("Prix de Vente")).toBeInTheDocument();
    expect(screen.getByLabelText("Coût par Commande")).toBeInTheDocument();
    expect(screen.getByLabelText("Total Commandes Reçues")).toBeInTheDocument();

    expect(screen.getByLabelText("Taux Confirmation")).toBeInTheDocument();
    expect(screen.getByLabelText("Taux Livraison")).toBeInTheDocument();
  });

  it("renders the 6 result cards", () => {
    render(<ProfitabilityCalculator />);
    expect(screen.getByTestId("profitability-result-confirmedOrders")).toBeInTheDocument();
    expect(screen.getByTestId("profitability-result-deliveredOrders")).toBeInTheDocument();
    expect(screen.getByTestId("profitability-result-profitPerUnit")).toBeInTheDocument();
    expect(screen.getByTestId("profitability-result-totalProfit")).toBeInTheDocument();
    expect(screen.getByTestId("profitability-result-adCostPerDeliveredOrder")).toBeInTheDocument();
    expect(screen.getByTestId("profitability-result-breakEvenPrice")).toBeInTheDocument();
  });

  it("recomputes results live when an input changes", () => {
    render(<ProfitabilityCalculator />);

    const salePrice = screen.getByLabelText("Prix de Vente");
    fireEvent.change(salePrice, { target: { value: "60" } });

    // profitPerUnit = 60 − 15 − 7 = 38, totalProfit scales accordingly

    const profitPerUnit = screen.getByTestId("profitability-result-profitPerUnit");
    expect(profitPerUnit.textContent).toMatch(/38/);
  });

  it("calls onCalculate on every recompute", () => {
    const onCalculate = vi.fn();
    render(<ProfitabilityCalculator onCalculate={onCalculate} />);

    // Called at least once on mount.
    expect(onCalculate).toHaveBeenCalled();
    const lastCall = onCalculate.mock.calls[onCalculate.mock.calls.length - 1][0];
    expect(lastCall.confirmedOrders).toBe(75);
    expect(lastCall.deliveredOrders).toBe(60);
    expect(lastCall.profitPerUnit).toBe(28);
  });

  it("flags a loss with the negative tone + PERTE label", () => {
    render(
      <ProfitabilityCalculator
        initialValues={{ salePrice: 0 }}
      />
    );
    const totalProfit = screen.getByTestId("profitability-result-totalProfit");
    expect(totalProfit.textContent).toMatch(/PERTE/);
  });

  it("respects initialValues overrides", () => {
    render(
      <ProfitabilityCalculator
        initialValues={{ ordersReceived: 200, confirmationRate: 50 }}
      />
    );
    const confirmed = screen.getByTestId("profitability-result-confirmedOrders");
    expect(confirmed.textContent).toMatch(/100/);
  });
});