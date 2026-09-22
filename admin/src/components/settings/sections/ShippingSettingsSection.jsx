import { useTranslation } from "react-i18next";

//internal import
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import useShippingSettingsSubmit from "@/hooks/useShippingSettingsSubmit";
import { Button } from "@sofia/ui";

const DESTINATION_OPTIONS = ["shipping", "billing", "billing_force"];

const ShippingSettingsSection = () => {
  const { t } = useTranslation();
  const {
    isLoading,
    isSubmitting,
    isConfirmOpen,
    requestSave,
    closeConfirm,
    performSave,
    enableCalculator,
    setEnableCalculator,
    hideCostsUntilAddress,
    setHideCostsUntilAddress,
    hideRatesWhenFreeShippingAvailable,
    setHideRatesWhenFreeShippingAvailable,
    shippingDestination,
    setShippingDestination,
    debugMode,
    setDebugMode,
  } = useShippingSettingsSubmit();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("ShippingSettingsLoading")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {isConfirmOpen && (
        <SaveSettingsModal
          isOpen={isConfirmOpen}
          onClose={closeConfirm}
          onConfirm={performSave}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("ShippingSettingsCalculationsTitle")}
        </label>
        <div className="sm:col-span-3 flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={enableCalculator}
              onChange={(e) => setEnableCalculator(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
            />
            {t("ShippingSettingsEnableCalculator")}
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={hideCostsUntilAddress}
              onChange={(e) => setHideCostsUntilAddress(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
            />
            {t("ShippingSettingsHideCostsUntilAddress")}
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={hideRatesWhenFreeShippingAvailable}
              onChange={(e) => setHideRatesWhenFreeShippingAvailable(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
            />
            {t("ShippingSettingsHideRatesWhenFreeShipping")}
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 border-t border-gray-200 pt-6 dark:border-gray-700">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("ShippingSettingsDestinationTitle")}
        </label>
        <div className="sm:col-span-3 flex flex-col gap-3">
          {DESTINATION_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                type="radio"
                name="shippingDestination"
                checked={shippingDestination === option}
                onChange={() => setShippingDestination(option)}
                className="mt-0.5 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
              />
              {t(`ShippingSettingsDestination_${option}`)}
            </label>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 border-t border-gray-200 pt-6 dark:border-gray-700">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("ShippingSettingsDebugTitle")}
        </label>
        <div className="sm:col-span-3">
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
            />
            {t("ShippingSettingsEnableDebugMode")}
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("ShippingSettingsDebugHelp")}
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          type="button"
          onClick={requestSave}
          disabled={isSubmitting}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("Processing") : t("ShippingSettingsSaveBtn")}
        </Button>
      </div>
    </div>
  );
};

export default ShippingSettingsSection;
