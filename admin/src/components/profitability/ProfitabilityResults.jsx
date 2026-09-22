import React, { useMemo } from "react";
import ProfitabilityResultCard from "./ProfitabilityResultCard.jsx";
import { PROFITABILITY_RESULT_CARDS } from "./profitability.constants.js";
import {
  formatProfitabilityNumber,
  isLossResult,
} from "./profitability.utils.js";

/**
 * Renders the 2 × 3 (desktop) / 1 × 6 (mobile) grid of result tiles

 * described in the spec. Accepts the raw `result` object plus the
 * currency settings, so it can be reused in dashboards or modals alike.
 */
const ProfitabilityResults = ({ result, currency, compact = false }) => {
  const loss = useMemo(() => isLossResult(result), [result]);

  const cards = useMemo(() => {
    return PROFITABILITY_RESULT_CARDS.map((meta) => {
      const rawValue = result?.[meta.key] ?? 0;
      const decimals = meta.decimals ?? 2;
      const useThousands =
        meta.key === "confirmedOrders" || meta.key === "deliveredOrders";

      let display;
      if (useThousands) {
        display = new Intl.NumberFormat(currency?.locale || "en-US", {
          maximumFractionDigits: 0,
        }).format(rawValue);
      } else {
        display = formatProfitabilityNumber(rawValue, currency, decimals);
      }

      let tone = meta.tone;
      if (meta.tone === "auto") {
        if (meta.key === "totalProfit") {
          tone = rawValue < 0 ? "negative" : "positive";
        } else if (meta.key === "profitPerUnit") {
          tone = rawValue < 0 ? "negative" : "neutral";
        }
      }

      // Show "PERTE" instead of the formatted number when the total
      // profit is negative — explicit per spec section 15.

      const isTotalLossCard = meta.key === "totalProfit" && loss;

      return {
        key: meta.key,
        label: isTotalLossCard ? "PERTE" : meta.label,
        value: isTotalLossCard ? display : display,
        tone,
      };
    });
  }, [result, currency, loss]);

  return (
    <div
      className={[
        "grid gap-3",
        compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
      ].join(" ")}
      data-testid="profitability-results"
    >
      {cards.map((c) => (
        <ProfitabilityResultCard
          key={c.key}
          label={c.label}
          value={c.value}
          tone={c.tone}
          testId={`profitability-result-${c.key}`}
        />
      ))}
    </div>
  );
};

export default ProfitabilityResults;