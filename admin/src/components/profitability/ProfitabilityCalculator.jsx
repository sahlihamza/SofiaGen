import React, { useEffect, useMemo, useState } from "react";
import ProfitabilityInput from "./ProfitabilityInput.jsx";
import ProfitabilityResults from "./ProfitabilityResults.jsx";
import {
  PROFITABILITY_FIELDS,
  PROFITABILITY_DEFAULTS,
} from "./profitability.constants.js";
import {
  calculateProfitability,
  getDefaultProfitabilityInput,
  validateProfitabilityInput,
} from "./profitability.utils.js";

/**
 * Reusable profitability calculator.
 *
 * The calculator is intentionally UI-agnostic: it does NOT include a
 * Modal wrapper, so it can be reused inside a modal, a page, a drawer or
 * a dashboard widget. The companion `ProfitabilityCalculatorModal`
 * component wraps it for the modal use case.
 *
 * Props:
 *  - currency            : currency object (isoCode / locale / decimalDigits / suffixCode).
 *                         If omitted, falls back to a TND-friendly default so the
 *                         calculator still works in isolation (tests, prototypes).
 *  - initialValues       : partial input, merged on top of the defaults.
 *  - onChange            : called with the normalised input on every change.
 *  - onCalculate         : called with the result whenever it is recomputed.
 *  - compact             : when true, switches result grid to a single column
 *                         and hides some visual chrome (for dashboard use).
 *  - showValidation      : render inline validation errors (default true).
 *  - idPrefix            : optional prefix for input ids (e.g. when several
 *                         calculators coexist on the same page).
 */
const ProfitabilityCalculator = ({
  currency,
  initialValues,
  onChange,
  onCalculate,
  compact = false,
  showValidation = true,
  idPrefix = "profitability",
}) => {
  const [values, setValues] = useState(() => ({
    ...getDefaultProfitabilityInput(),
    ...(initialValues || {}),
  }));
  const [touched, setTouched] = useState({});

  // Re-sync internal state when `initialValues` changes from the outside.
  useEffect(() => {
    if (!initialValues) return;
    setValues((prev) => ({ ...prev, ...initialValues }));
  }, [initialValues]);

  const errors = useMemo(() => validateProfitabilityInput(values), [values]);

  const result = useMemo(() => calculateProfitability(values), [values]);

  useEffect(() => {
    if (onChange) onChange(values);
  }, [values, onChange]);

  useEffect(() => {
    if (onCalculate) onCalculate(result);
  }, [result, onCalculate]);

  const handleField = (key) => (next) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <section
      aria-label="Calculateur de rentabilité"
      data-testid="profitability-calculator"
      className={[
        "flex w-full flex-col gap-4",
        compact ? "text-sm" : "",
      ].join(" ")}
    >
      <div
        className={[
          "grid gap-3",
          compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
        ].join(" ")}
      >
        {PROFITABILITY_FIELDS.map((field) => {
          const id = `${idPrefix}-${field.key}`;
          const isMonetary = field.unit && field.unit !== "%" && field.unit !== "#";
          // Render the unit dynamically so the caller can swap currencies
          // (the currency object is the single source of truth).
          const unit =
            field.unit === "TND"
              ? currency?.isoCode || "TND"
              : field.unit;

          return (
            <ProfitabilityInput
              key={field.key}
              id={id}
              name={field.key}
              label={field.label}
              hint={field.hint}
              unit={unit}
              value={values[field.key]}
              onChange={handleField(field.key)}
              min={field.min}
              max={field.max}
              step={field.step}
              error={showValidation && touched[field.key] ? errors[field.key] : null}
              ariaLabel={field.label}
            />
          );
        })}
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <ProfitabilityResults
          result={result}
          currency={currency}
          compact={compact}
        />
      </div>
    </section>
  );
};

export default ProfitabilityCalculator;

export { PROFITABILITY_DEFAULTS };
export { calculateProfitability, validateProfitabilityInput } from "./profitability.utils.js";