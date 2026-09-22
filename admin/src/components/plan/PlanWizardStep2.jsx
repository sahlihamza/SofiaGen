import React from "react";
import { useTranslation } from "react-i18next";

// Internal imports
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import formatMoney from "@/utils/formatMoney";

const PlanWizardStep2 = ({
  data,
  errors,
  onUpdate,
  isEditing = false,
  originalData = null,
  strategy,
  onStrategyChange,
}) => {
  const { t } = useTranslation();

  const handlePricingChange = (field, value) => {
    onUpdate({
      pricing: {
        ...data.pricing,
        [field]: field === "monthly" || field === "yearly" || field === "trialDays"
          ? parseFloat(value) || 0
          : value,
      },
    });
  };

  const handleTaxToggle = () => {
    onUpdate({
      pricing: {
        ...data.pricing,
        taxIncluded: !data.pricing.taxIncluded,
      },
    });
  };

  const currencies = ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "ZAR", "TND", "EGP"];

  const pricingChanged =
    isEditing &&
    originalData &&
    (data.pricing?.monthly !== originalData.pricing?.monthly ||
      data.pricing?.yearly !== originalData.pricing?.yearly);

  return (
    <div className="space-y-6">
      {isEditing && pricingChanged && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            {t("PricingChangedWarning") ||
              "Pricing changed. Choose application strategy:"}
          </p>
          <select
            value={strategy}
            onChange={(e) => onStrategyChange(e.target.value)}
            className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="new_subscribers_only">
              {t("StrategyNewSubscribers") ||
                "Apply to new subscribers only"}
            </option>
            <option value="all_prorated">
              {t("StrategyAllProrated") ||
                "Apply to all (prorated at next billing cycle)"}
            </option>
            <option value="all_immediate">
              {t("StrategyAllImmediate") ||
                "Apply to all immediately"}
            </option>
          </select>
        </div>
      )}

      {/* Monthly Price */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("MonthlyPrice")} required />
        <div className="col-span-8 sm:col-span-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              {data.pricing.currency}
            </span>
            <InputArea
              register={() => {}}
              name="monthly"
              type="number"
              placeholder="0.00"
              value={data.pricing.monthly}
              onChange={(e) => handlePricingChange("monthly", e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <Error errorName={errors.monthly} />
        </div>
      </div>

      {/* Yearly Price */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("YearlyPrice")} required />
        <div className="col-span-8 sm:col-span-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              {data.pricing.currency}
            </span>
            <InputArea
              register={() => {}}
              name="yearly"
              type="number"
              placeholder="0.00"
              value={data.pricing.yearly}
              onChange={(e) => handlePricingChange("yearly", e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <Error errorName={errors.yearly} />
        </div>
      </div>

      {/* Currency */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("Currency")} />
        <div className="col-span-8 sm:col-span-4">
          <select
            value={data.pricing.currency}
            onChange={(e) => handlePricingChange("currency", e.target.value)}
            className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tax Included */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanTaxIncluded")} />
        <div className="col-span-8 sm:col-span-1 text-align-left">
          <SwitchToggle
            processOption={data.pricing.taxIncluded}
            handleProcess={handleTaxToggle}
          />
        </div>
      </div>

      {/* Trial Days */}
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanTrialDays")} />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="trialDays"
            type="number"
            placeholder="0"
            value={data.pricing.trialDays}
            onChange={(e) => handlePricingChange("trialDays", e.target.value)}
            min="0"
            max="180"
          />
          <small className="text-gray-500 dark:text-gray-400">
            {t("FreeTrialDaysHelp") || "Number of days customers get free trial (0 for no trial)"}
          </small>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Summary:</strong> Monthly: {formatMoney(data.pricing.monthly, data.pricing.currency)} | Yearly: {formatMoney(data.pricing.yearly, data.pricing.currency)}
          {data.pricing.taxIncluded && " (Tax Included)"}
        </p>
      </div>
    </div>
  );
};

export default PlanWizardStep2;
