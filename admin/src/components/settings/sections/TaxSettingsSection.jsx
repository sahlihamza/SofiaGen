import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiTrash2, FiPlus } from "react-icons/fi";

//internal import
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import { STANDARD_TAX_CLASS_KEY } from "@/utils/taxSettingsConstants";
import { Button } from "@sofia/ui";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

const Card = ({ title, description, children }) => (
  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm first:mt-0 dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div className="mb-4 grid gap-2 md:grid-cols-5 md:items-center sm:grid-cols-12 md:gap-5">
    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 sm:col-span-2">
      {label}
    </label>
    <div className="sm:col-span-3">{children}</div>
  </div>
);

const Checkbox = ({ label, description, checked, onChange }) => (
  <label className="mb-4 flex items-start gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
    />
    <span>
      {label}
      {description && (
        <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </span>
  </label>
);

const DEFAULT_OPTIONS_DRAFT = {
  pricesIncludeTax: false,
  calculateTaxBasedOn: "shipping",
  shippingTaxClass: "inherit",
  roundTaxAtSubtotal: false,
  displayPricesInShop: "exclusive",
  displayPricesDuringCartAndCheckout: "exclusive",
  priceDisplaySuffix: "",
  displayTaxTotals: "itemized",
};

const EMPTY_RATE_ROW = {
  country: "",
  state: "",
  postcode: "",
  city: "",
  rate: "",
  name: "",
  priority: 1,
  compound: false,
  shipping: true,
};

// One editable spreadsheet-style table per tax class, saved independently â€”
// matches WooCommerce's RÃ©glages > Taxes > [Tax class tab] screen.
const RatesTable = ({ taxClass, rates, isSaving, onSave, t }) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(
      rates.length > 0
        ? rates.map((r) => ({ ...r }))
        : []
    );
  }, [rates, taxClass]);

  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const updateRow = (index, patch) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_RATE_ROW }]);

  return (
    <div className="mb-8 last:mb-0">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {taxClass === STANDARD_TAX_CLASS_KEY ? t("TaxRatesStandardTitle") : taxClass}
      </h4>
      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-2 py-2">{t("TaxRateCountry")}</th>
              <th className="px-2 py-2">{t("TaxRateState")}</th>
              <th className="px-2 py-2">{t("TaxRatePostcode")}</th>
              <th className="px-2 py-2">{t("TaxRateCity")}</th>
              <th className="px-2 py-2">
                {t("TaxRateRate")} <span className="text-red-500">*</span>
              </th>
              <th className="px-2 py-2">
                {t("TaxRateName")} <span className="text-red-500">*</span>
              </th>
              <th className="px-2 py-2">{t("TaxRatePriority")}</th>
              <th className="px-2 py-2 text-center">{t("TaxRateCompound")}</th>
              <th className="px-2 py-2 text-center">{t("TaxRateShipping")}</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    maxLength={2}
                    value={row.country}
                    placeholder="*"
                    onChange={(e) => updateRow(index, { country: e.target.value.toUpperCase() })}
                    className={`${inputClass} w-16 uppercase`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    maxLength={2}
                    value={row.state}
                    placeholder="*"
                    onChange={(e) => updateRow(index, { state: e.target.value.toUpperCase() })}
                    className={`${inputClass} w-16 uppercase`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.postcode}
                    placeholder="90210*"
                    onChange={(e) => updateRow(index, { postcode: e.target.value })}
                    className={`${inputClass} w-24`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.city}
                    onChange={(e) => updateRow(index, { city: e.target.value })}
                    className={`${inputClass} w-28`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.0001"
                    min={0}
                    required
                    value={row.rate}
                    onChange={(e) => updateRow(index, { rate: e.target.value })}
                    className={`${inputClass} w-20`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    required
                    value={row.name}
                    placeholder="VAT"
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    className={`${inputClass} w-28`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={1}
                    value={row.priority}
                    onChange={(e) => updateRow(index, { priority: e.target.value })}
                    className={`${inputClass} w-16`}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!row.compound}
                    onChange={(e) => updateRow(index, { compound: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={row.shipping !== false}
                    onChange={(e) => updateRow(index, { shipping: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Button
                    type="button"
                    onClick={() => setPendingDeleteIndex(index)}
                    className="rounded-md border border-red-300 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-red-500 dark:text-red-400"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-2 py-4 text-center text-sm text-gray-400">
                  {t("TaxRatesEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <FiPlus className="h-4 w-4" />
          {t("TaxRatesInsertRow")}
        </Button>
        <Button
          type="button"
          onClick={() => setIsSaveConfirmOpen(true)}
          disabled={isSaving}
          className="rounded-md bg-emerald-500 px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("Processing") : t("SaveBtn")}
        </Button>
      </div>

      <ConfirmActionModal
        isOpen={pendingDeleteIndex !== null}
        onClose={() => setPendingDeleteIndex(null)}
        onConfirm={async () => {
          const nextRows = rows.filter((_, i) => i !== pendingDeleteIndex);
          setRows(nextRows);
          setPendingDeleteIndex(null);
          // Deletion takes effect right away â€” the "Enregistrer" button below
          // is only for persisting edits/new rows, not for confirming removal.
          await onSave(taxClass, nextRows);
        }}
        isSubmitting={isSaving}
        title={t("TaxRateDeleteConfirmTitle")}
        message={t("TaxRateDeleteConfirmMessage")}
        confirmLabel={t("TaxRateDeleteConfirmBtn")}
      />

      <SaveSettingsModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={async () => {
          await onSave(taxClass, rows);
          setIsSaveConfirmOpen(false);
        }}
        isSubmitting={isSaving}
      />
    </div>
  );
};

const TaxSettingsSection = ({
  settings,
  isLoading,
  isSavingOptions,
  saveOptions,
  isSavingClasses,
  saveTaxClasses,
  isSavingRates,
  saveRates,
}) => {
  const { t } = useTranslation();
  const [optionsDraft, setOptionsDraft] = useState(DEFAULT_OPTIONS_DRAFT);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [classesText, setClassesText] = useState("");
  const [activeClass, setActiveClass] = useState(STANDARD_TAX_CLASS_KEY);

  useEffect(() => {
    if (!settings) return;
    setOptionsDraft({
      pricesIncludeTax: !!settings.options?.pricesIncludeTax,
      calculateTaxBasedOn: settings.options?.calculateTaxBasedOn || "shipping",
      shippingTaxClass: settings.options?.shippingTaxClass || "inherit",
      roundTaxAtSubtotal: !!settings.options?.roundTaxAtSubtotal,
      displayPricesInShop: settings.options?.displayPricesInShop || "exclusive",
      displayPricesDuringCartAndCheckout:
        settings.options?.displayPricesDuringCartAndCheckout || "exclusive",
      priceDisplaySuffix: settings.options?.priceDisplaySuffix || "",
      displayTaxTotals: settings.options?.displayTaxTotals || "itemized",
    });
    setClassesText((settings.additionalTaxClasses || []).join("\n"));
  }, [settings]);

  const additionalClasses = settings?.additionalTaxClasses || [];
  const allClasses = [STANDARD_TAX_CLASS_KEY, ...additionalClasses];

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        {t("AccountsPrivacyLoading")}
      </div>
    );
  }

  return (
    <>
      <Card title={t("TaxOptionsTitle")} description={t("TaxOptionsDesc")}>
        <Field label={t("TaxPricesIncludeTaxLabel")}>
          <select
            value={optionsDraft.pricesIncludeTax ? "yes" : "no"}
            onChange={(e) =>
              setOptionsDraft({ ...optionsDraft, pricesIncludeTax: e.target.value === "yes" })
            }
            className={inputClass}
          >
            <option value="yes">{t("TaxPricesIncludeTaxYes")}</option>
            <option value="no">{t("TaxPricesIncludeTaxNo")}</option>
          </select>
        </Field>

        <Field label={t("TaxCalculateBasedOnLabel")}>
          <select
            value={optionsDraft.calculateTaxBasedOn}
            onChange={(e) =>
              setOptionsDraft({ ...optionsDraft, calculateTaxBasedOn: e.target.value })
            }
            className={inputClass}
          >
            <option value="shipping">{t("TaxCalculateBasedOnShipping")}</option>
            <option value="billing">{t("TaxCalculateBasedOnBilling")}</option>
            <option value="shopBase">{t("TaxCalculateBasedOnShopBase")}</option>
          </select>
        </Field>

        <Field label={t("TaxShippingTaxClassLabel")}>
          <select
            value={optionsDraft.shippingTaxClass}
            onChange={(e) =>
              setOptionsDraft({ ...optionsDraft, shippingTaxClass: e.target.value })
            }
            className={inputClass}
          >
            <option value="inherit">{t("TaxShippingTaxClassInherit")}</option>
            {allClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls === STANDARD_TAX_CLASS_KEY ? t("TaxRatesStandardTitle") : cls}
              </option>
            ))}
          </select>
        </Field>

        <Checkbox
          label={t("TaxRoundAtSubtotalLabel")}
          description={t("TaxRoundAtSubtotalDesc")}
          checked={optionsDraft.roundTaxAtSubtotal}
          onChange={(checked) => setOptionsDraft({ ...optionsDraft, roundTaxAtSubtotal: checked })}
        />

        <Field label={t("TaxDisplayInShopLabel")}>
          <select
            value={optionsDraft.displayPricesInShop}
            onChange={(e) =>
              setOptionsDraft({ ...optionsDraft, displayPricesInShop: e.target.value })
            }
            className={inputClass}
          >
            <option value="inclusive">{t("TaxDisplayInclusive")}</option>
            <option value="exclusive">{t("TaxDisplayExclusive")}</option>
          </select>
        </Field>

        <Field label={t("TaxDisplayCartCheckoutLabel")}>
          <select
            value={optionsDraft.displayPricesDuringCartAndCheckout}
            onChange={(e) =>
              setOptionsDraft({
                ...optionsDraft,
                displayPricesDuringCartAndCheckout: e.target.value,
              })
            }
            className={inputClass}
          >
            <option value="inclusive">{t("TaxDisplayInclusive")}</option>
            <option value="exclusive">{t("TaxDisplayExclusive")}</option>
          </select>
        </Field>

        <Field label={t("TaxPriceSuffixLabel")}>
          <input
            type="text"
            value={optionsDraft.priceDisplaySuffix}
            placeholder={t("TaxPriceSuffixPlaceholder")}
            onChange={(e) =>
              setOptionsDraft({ ...optionsDraft, priceDisplaySuffix: e.target.value })
            }
            className={inputClass}
          />
        </Field>

        <Field label={t("TaxDisplayTotalsLabel")}>
          <select
            value={optionsDraft.displayTaxTotals}
            onChange={(e) =>
              setOptionsDraft({ ...optionsDraft, displayTaxTotals: e.target.value })
            }
            className={inputClass}
          >
            <option value="single">{t("TaxDisplayTotalsSingle")}</option>
            <option value="itemized">{t("TaxDisplayTotalsItemized")}</option>
          </select>
        </Field>

        <div className="flex justify-start">
          <Button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isSavingOptions}
            className="min-w-[160px] rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingOptions ? t("Processing") : t("SaveBtn")}
          </Button>
        </div>
      </Card>

      <Card
        title={t("TaxAdditionalClassesTitle")}
        description={t("TaxAdditionalClassesDesc")}
      >
        <textarea
          rows={3}
          value={classesText}
          onChange={(e) => setClassesText(e.target.value)}
          placeholder={"Reduced rate\nZero rate"}
          className={`${inputClass} font-mono`}
        />
        <div className="mt-3 flex justify-start">
          <Button
            type="button"
            onClick={() =>
              saveTaxClasses(
                classesText
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
              )
            }
            disabled={isSavingClasses}
            className="rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingClasses ? t("Processing") : t("SaveBtn")}
          </Button>
        </div>
      </Card>

      <Card title={t("TaxRatesTitle")} description={t("TaxRatesDesc")}>
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
          {allClasses.map((cls) => (
            <Button
              key={cls}
              type="button"
              onClick={() => setActiveClass(cls)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                activeClass === cls
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {cls === STANDARD_TAX_CLASS_KEY ? t("TaxRatesStandardTitle") : cls}
            </Button>
          ))}
        </div>

        <RatesTable
          key={activeClass}
          taxClass={activeClass}
          rates={(settings?.rates || []).filter((rate) => rate.taxClass === activeClass)}
          isSaving={isSavingRates}
          onSave={saveRates}
          t={t}
        />
      </Card>

      <SaveSettingsModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={async () => {
          await saveOptions(optionsDraft);
          setIsConfirmOpen(false);
        }}
        isSubmitting={isSavingOptions}
      />
    </>
  );
};

export default TaxSettingsSection;
