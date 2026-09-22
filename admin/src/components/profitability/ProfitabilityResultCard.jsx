import React from "react";

/**
 * Small visual tile that displays a single result value (label + number).
 *
 * `tone` controls the colour palette:
 *  - "neutral"    → default grey
 *  - "positive"   → emerald (profit)
 *  - "negative"   → red (loss)
 *  - "break-even" → amber (informational, distinct from profit/loss)
 *  - "auto"       → resolved by the parent (positive/negative based on value)

 */
const TONE_STYLES = {
  neutral: {
    card: "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
    label: "text-gray-500 dark:text-gray-400",
    value: "text-gray-900 dark:text-gray-100",
  },
  positive: {
    card: "border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  negative: {
    card: "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30",
    label: "text-red-700 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
  },
  "break-even": {
    card: "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30",
    label: "text-amber-700 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
};

const ProfitabilityResultCard = ({
  label,
  value,
  tone = "neutral",
  ariaLabel,
  testId,
}) => {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral;

  return (
    <div
      data-testid={testId}
      role="group"
      aria-label={ariaLabel || label}
      className={[
        "rounded-lg border p-4 shadow-sm transition-colors",
        styles.card,
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-semibold uppercase tracking-wide",
          styles.label,
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          "mt-2 break-words text-2xl font-bold tabular-nums",
          styles.value,
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
};

export default ProfitabilityResultCard;