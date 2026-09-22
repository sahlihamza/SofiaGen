export { default as ProfitabilityCalculator } from "./ProfitabilityCalculator.jsx";
export { default as ProfitabilityCalculatorModal } from "./ProfitabilityCalculatorModal.jsx";
export { default as ProfitabilityInput } from "./ProfitabilityInput.jsx";
export { default as ProfitabilityResults } from "./ProfitabilityResults.jsx";
export { default as ProfitabilityResultCard } from "./ProfitabilityResultCard.jsx";

export {
  calculateProfitability,
  validateProfitabilityInput,
  normaliseProfitabilityInput,
  formatProfitabilityNumber,
  getDefaultProfitabilityInput,
  isLossResult,
  toSafeNumber,
  clampPercent,
  isFiniteNumber,
} from "./profitability.utils.js";

export {
  PROFITABILITY_DEFAULTS,
  PROFITABILITY_FIELDS,
  PROFITABILITY_RESULT_CARDS,
  PROFITABILITY_FIELD_KEYS,
} from "./profitability.constants.js";