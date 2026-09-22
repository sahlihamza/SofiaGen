import React from "react";
import { useTranslation } from "react-i18next";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Error from "@/components/form/others/Error";
import SelectField from "@/components/form/selectOption/SelectField";
import { FiLink, FiGlobe } from "react-icons/fi";

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
  <section className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
    <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
        <Icon size={17} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </header>
    <div className="px-5 py-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        {children}
      </div>
    </div>
  </section>
);

const Field = ({ label, required, hint, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint && (
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    )}
    {error}
  </div>
);

const countries = [
  { value: "Tunisia", label: "Tunisia" },
  { value: "Morocco", label: "Morocco" },
  { value: "Algeria", label: "Algeria" },
  { value: "Egypt", label: "Egypt" },
  { value: "France", label: "France" },
  { value: "Other", label: "Other" },
];

const languages = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "'D91(J)" },
  { value: "de", label: "Deutsch" },
];

const currencies = [
  { value: "TND", label: "TND  Dinar Tunisien" },
  { value: "USD", label: "USD  US Dollar" },
  { value: "EUR", label: "EUR  Euro" },
  { value: "GBP", label: "GBP  British Pound" },
  { value: "MAD", label: "MAD  Dirham Marocain" },
];

const timezones = [
  { value: "Africa/Tunis", label: "Africa/Tunis (GMT+1)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (GMT+1)" },
  { value: "Africa/Algiers", label: "Africa/Algiers (GMT+1)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (GMT+2)" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT+1)" },
  { value: "Europe/London", label: "Europe/London (GMT+0)" },
];

const DomainLocalizationStep = ({ formData, onDataChange, register, errors, subdomainAvailable, checkingSubdomain }) => {
  const { t } = useTranslation();
  const [subdomainTouched, setSubdomainTouched] = React.useState(false);
  const [subdomainFocused, setSubdomainFocused] = React.useState(false);

  const subdomainError =
    errors?.subdomain ||
    (subdomainAvailable === false
      ? { message: t("SubdomainTaken") || "This subdomain is already taken" }
      : null);

  const subdomainStatus = () => {
    if (!subdomainTouched && !subdomainFocused) {
      return null;
    }

    if (checkingSubdomain) {
      return {
        message: t("SubdomainChecking") || "Checking subdomain availability...",
        className: "text-gray-500",
      };
    }

    if (formData.subdomain?.trim() && subdomainAvailable) {
      return {
        message: t("SubdomainAvailable") || "This subdomain is available.",
        className: "text-emerald-600 dark:text-emerald-400",
      };
    }

    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSubdomainTouched(true);
    onDataChange({ [name]: value });
  };

  const handleSubdomainFocus = () => {
    setSubdomainFocused(true);
  };

  const handleSubdomainBlur = () => {
    setSubdomainFocused(false);
  };

  return (
    <div className="space-y-6 w-full">
      <SectionCard
        icon={FiLink}
        title={t("DomainSection") || "Domain Configuration"}
        subtitle={t("DomainSectionDesc") || "Choose how customers will access your store."}
      >
        <Field
          label={t("SubdomainLabel") || "Subdomain"}
          required
          error={<Error errorName={subdomainError} />}
        >
          <div className="relative">
            <InputArea
              register={register}
              required
              name="subdomain"
              type="text"
              placeholder="vita"
              defaultValue={formData.subdomain || ""}
              label={t("SubdomainLabel") || "Subdomain"}
              onChange={handleInputChange}
              onFocus={handleSubdomainFocus}
              onBlur={handleSubdomainBlur}
            />
            {subdomainStatus() && (
              <p className={`${subdomainStatus().className} text-sm mt-2`}>
                {subdomainStatus().message}
              </p>
            )}
          </div>
        </Field>

        <Field
          label={t("CustomDomainLabel") || "Custom Domain"}
          hint={t("CustomDomainHint") || "Optional  use your own domain."}
          error={<Error errorName={errors?.customDomain} />}
        >
          <InputArea
            register={register}
            name="customDomain"
            type="text"
            placeholder="shop.example.com (optional)"
            defaultValue={formData.customDomain || ""}
            label={t("CustomDomainLabel") || "Custom Domain"}
            onChange={handleInputChange}
          />
        </Field>
      </SectionCard>

      <SectionCard
        icon={FiGlobe}
        title={t("LocalizationSection") || "Localization"}
        subtitle={t("LocalizationSectionDesc") || "Region, language, currency and timezone settings."}
      >
        <SelectField
          label={t("CountryLabel") || "Country"}
          name="country"
          register={register}
          required
          defaultValue={formData.country}
          options={countries}
          placeholder="Select Country"
          onChange={handleInputChange}
          error={errors?.country?.message}
        />

        <SelectField
          label={t("LanguageLabel") || "Language"}
          name="language"
          register={register}
          required
          defaultValue={formData.language}
          options={languages}
          placeholder="Select Language"
          onChange={handleInputChange}
          error={errors?.language?.message}
        />

        <SelectField
          label={t("CurrencyLabel") || "Currency"}
          name="currency"
          register={register}
          required
          defaultValue={formData.currency}
          options={currencies}
          placeholder="Select Currency"
          onChange={handleInputChange}
          error={errors?.currency?.message}
        />

        <SelectField
          label={t("TimezoneLabel") || "Timezone"}
          name="timezone"
          register={register}
          required
          defaultValue={formData.timezone}
          options={timezones}
          placeholder="Select Timezone"
          onChange={handleInputChange}
          error={errors?.timezone?.message}
        />
      </SectionCard>
    </div>
  );
};

export default DomainLocalizationStep;