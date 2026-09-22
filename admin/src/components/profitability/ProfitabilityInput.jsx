import React from "react";
import CFormField from "@/components/forms/CFormField";

/**
 * A single labeled numeric field for the profitability calculator.
 *
 * Reuses the existing `CFormField` wrapper so that labels, error states
 * and accessibility wiring stay consistent with the rest of the admin.
 *
 * Props:
 * - id / name        : identifier used by `<label htmlFor>` and the input
 * - label / hint     : field caption
 * - unit             : suffix rendered inside the input (e.g. "TND", "%", "#")
 * - value / onChange : controlled numeric value
 * - min / max / step : forwarded to the native input
 * - error / ariaLabel: accessibility hints
 * - autoFocus        : optional focus on mount
 */
const ProfitabilityInput = ({
  id,
  name,
  label,
  hint,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  error,
  ariaLabel,
  autoFocus = false,
  disabled = false,
}) => {
  const inputId = id || `profitability-${name}`;
  const handleChange = (e) => {
    const raw = e.target.value;
    // Allow empty string (so the user can clear the field) but never let
    // `undefined`/`NaN` slip into state — the util layer will sanitise it.

    onChange(raw === "" ? "" : raw);
  };

  return (
    <CFormField
      htmlFor={inputId}
      label={label}
      description={hint}
      error={error}
      className="w-full"
    >
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="number"
          inputMode="decimal"
          value={value === 0 || value ? value : value === 0 ? "0" : value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={ariaLabel || label}
          aria-invalid={Boolean(error)}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className={[
            "w-full rounded-md border bg-white px-3 py-2 pr-12 text-sm shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-200",
            "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100",
          ].join(" ")}
        />
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {unit}
          </span>
        )}
      </div>
    </CFormField>
  );
};

export default ProfitabilityInput;