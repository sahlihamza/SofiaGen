import React from "react";
import { useTranslation } from "react-i18next";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Error from "@/components/form/others/Error";
import ImageUploader from "@/components/store/ImageUploader";
import SelectField from "@/components/form/selectOption/SelectField";
import CStatusSwitch from "@/components/ui/CStatusSwitch";
import {
  FiLink,
  FiGlobe,
  FiCreditCard,
  FiImage,
  FiShoppingBag,
} from "react-icons/fi";

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

const StoreInfoStep = ({
  formData,
  onDataChange,
  register,
  errors,
  imageUrl,
  setImageUrl,
}) => {
  const { t } = useTranslation();

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

  const plans = [
    {
      value: "Basic",
      label: "Basic",
      desc: "Essential features to get started",
    },
    {
      value: "Professional",
      label: "Professional",
      desc: "Advanced tools for growing stores",
    },
    {
      value: "Enterprise",
      label: "Enterprise",
      desc: "Full power for large businesses",
    },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onDataChange({ [name]: value });
  };

  const handleNameChange = (e) => {
    const storeName = e.target.value;
    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    onDataChange({ name: storeName, slug });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Section 1 : Identity */}
      <SectionCard
        icon={FiShoppingBag}
        title={t("StoreIdentitySection") || "Store Identity"}
        subtitle={
          t("StoreIdentitySectionDesc") ||
          "Basic information that identifies your store."
        }
      >
        <Field
          label={t("StoreNameLabel") || "Store Name"}
          required
          hint={t("StoreNameHint") || "This name appears in the admin and storefront."}
          error={<Error errorName={errors?.name} />}
        >
          <InputArea
            register={register}
            required={true}
            name="name"
            type="text"
            placeholder="e.g., Vita Shop"
            onChange={handleNameChange}
            label={t("StoreNameLabel") || "Store Name"}
          />
        </Field>

        <Field
          label={t("StoreSlugLabel") || "Store Slug"}
          hint={
            formData.slug
              ? `URL: /store/${formData.slug}`
              : t("StoreSlugHint") || "Auto-generated from the store name."
          }
          error={<Error errorName={errors?.slug} />}
        >
          <InputArea
            register={register}
            name="slug"
            type="text"
            placeholder="vita-shop"
            defaultValue={formData.slug || ""}
            label={t("StoreSlugLabel") || "Store Slug"}
            onChange={handleInputChange}
          />
        </Field>
      </SectionCard>

      {/* Section 2 : Domain */}
      <SectionCard
        icon={FiLink}
        title={t("DomainSection") || "Domain Configuration"}
        subtitle={
          t("DomainSectionDesc") ||
          "Choose how customers will access your store."
        }
      >
        <Field
          label={t("SubdomainLabel") || "Subdomain"}
          error={<Error errorName={errors?.subdomain} />}
        >
          <div className="relative">
            <InputArea
              register={register}
              name="subdomain"
              type="text"
              placeholder="vita"
              defaultValue={formData.subdomain || ""}
              label={t("SubdomainLabel") || "Subdomain"}
              onChange={handleInputChange}
            />
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

      {/* Section 3 : Localization */}
      <SectionCard
        icon={FiGlobe}
        title={t("LocalizationSection") || "Localization"}
        subtitle={
          t("LocalizationSectionDesc") ||
          "Region, language, currency and timezone settings."
        }
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

      {/* Section 4 : Plan */}
      <SectionCard
        icon={FiCreditCard}
        title={t("PlanSection") || "Plan & Status"}
        subtitle={
          t("PlanSectionDesc") || "Select the subscription plan for this store."
        }
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t("PlanLabel") || "Plan"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((p) => {
              const isSelected = formData.plan === p.value;
              return (
                <label
                  key={p.value}
                  className={`relative flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-sm"
                      : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700"
                  }`}
                >
                  <input
                    {...register("plan")}
                    type="radio"
                    name="plan"
                    value={p.value}
                    checked={isSelected}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-semibold ${
                      isSelected
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {p.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {p.desc}
                  </span>
                  <span
                    className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          <Error errorName={errors?.plan} />
        </div>

        <div className="sm:col-span-2 pt-2 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("StatusLabel") || "Status"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formData.status
                ? t("StoreWillBeLiveDesc") || "The store will be active immediately."
                : t("StoreWillBeInactiveDesc") || "The store stays hidden until activated."}
            </p>
          </div>
          <CStatusSwitch
            checked={Boolean(formData.status)}
            onChange={(checked) => onDataChange({ status: checked })}
            label={
              formData.status
                ? t("ActiveStatus") || "Active"
                : t("InactiveStatus") || "Inactive"
            }
          />
        </div>
      </SectionCard>

      {/* Section 5 : Logo */}
      <SectionCard
        icon={FiImage}
        title={t("LogoSection") || "Store Logo"}
        subtitle={
          t("LogoSectionDesc") || "Used in emails, invoices and the storefront."
        }
      >
        <div className="sm:col-span-2">
          <ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />
        </div>
      </SectionCard>
    </div>
  );
};

export default StoreInfoStep;