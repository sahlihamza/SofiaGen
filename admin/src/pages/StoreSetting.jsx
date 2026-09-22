import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown } from "react-icons/fi";

//internal import
import Label from "@/components/form/label/Label";
import Error from "@/components/form/others/Error";
import PageTitle from "@/components/Typography/PageTitle";
import InputAreaTwo from "@/components/form/input/InputAreaTwo";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import SelectCountry from "@/components/form/selectOption/SelectCountry";
import SelectTimeZone from "@/components/form/selectOption/SelectTimeZone";
import SelectCurrencyId from "@/components/form/selectOption/SelectCurrencyId";
import Multiselect from "multiselect-react-dropdown";
import { EVERYWHERE_ISO2, countryOptionLabel } from "@/utils/countryOptionLabel";
import useStoreSettingSubmit from "@/hooks/useStoreSettingSubmit";
import useStoreGeneralSettingsSubmit from "@/hooks/useStoreGeneralSettingsSubmit";
import AnimatedContent from "@/components/common/AnimatedContent";
import SettingContainer from "@/components/settings/SettingContainer";
import { Button } from "@sofia/ui";

const TABS = [
  { id: "general", labelKey: "SettingsTabGeneral" },
  { id: "store-details", labelKey: "StoreDetails" },
];

const StoreSetting = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const {
    isSave: isStoreSave,
    errors: storeErrors,
    register: storeRegister,
    onSubmit: storeOnSubmit,
    handleSubmit: storeHandleSubmit,
    isSubmitting: isStoreSubmitting,
    enabledCOD,
    setEnabledCOD,
    enabledStripe,
    setEnabledStripe,
    enabledRazorPay,
    setEnabledRazorPay,
    enabledFbPixel,
    setEnableFbPixel,
    enabledTawkChat,
    setEnabledTawkChat,
    enabledGoogleLogin,
    setEnabledGoogleLogin,
    enabledGithubLogin,
    setEnabledGithubLogin,
    enabledFacebookLogin,
    setEnabledFacebookLogin,
    enabledGoogleAnalytics,
    setEnabledGoogleAnalytics,
  } = useStoreSettingSubmit();

  const {
    isSave: isGeneralSave,
    isSubmitting: isGeneralSubmitting,
    register: generalRegister,
    errors: generalErrors,
    watch: generalWatch,
    setValue: generalSetValue,
    handleSubmit: generalHandleSubmit,
    onSubmit: generalOnSubmit,
    trigger: generalTrigger,
    countries,
    sellingCountries,
    setSellingCountries,
    shippingCountries,
    setShippingCountries,
    enableTax,
    setEnableTax,
    enableCoupons,
    setEnableCoupons,
    sequentialCoupons,
    setSequentialCoupons,
  } = useStoreGeneralSettingsSubmit();

  const handleEnableDisableMethod = (checked, event, id) => {
    if (id === "stripe" && !checked) {
      setEnabledStripe(!enabledStripe);
      setEnabledCOD(true);
    } else if (id === "stripe" && checked) {
      setEnabledStripe(!enabledStripe);
    } else if (id === "cod" && !checked) {
      setEnabledCOD(!enabledCOD);
      setEnabledStripe(true);
    } else {
      setEnabledCOD(!enabledCOD);
    }
  };

  const handleSelectSelling = (selectedList, selectedItem) => {
    if (selectedItem?.iso2 === EVERYWHERE_ISO2) {
      setSellingCountries(countries || []);
      return;
    }
    if (sellingCountries.length === (countries?.length || 0)) {
      setSellingCountries([selectedItem]);
      return;
    }
    setSellingCountries(selectedList);
  };

  const handleSelectShipping = (selectedList, selectedItem) => {
    if (selectedItem?.iso2 === EVERYWHERE_ISO2) {
      setShippingCountries(countries || []);
      return;
    }
    if (shippingCountries.length === (countries?.length || 0)) {
      setShippingCountries([selectedItem]);
      return;
    }
    setShippingCountries(selectedList);
  };

  const isSellEverywhere =
    (countries?.length || 0) > 0 && sellingCountries.length === countries.length;
  const displaySellingCountries = isSellEverywhere
    ? [{ iso2: EVERYWHERE_ISO2, name: t("SellToAllCountries") }]
    : sellingCountries;

  const isShipEverywhere =
    (countries?.length || 0) > 0 && shippingCountries.length === countries.length;
  const displayShippingCountries = isShipEverywhere
    ? [{ iso2: EVERYWHERE_ISO2, name: t("ShipToAllCountries") }]
    : shippingCountries;

  const sellOptions = [
    { iso2: EVERYWHERE_ISO2, name: t("SellToAllCountries") },
    ...(countries || []),
  ];
  const shipOptions = [
    { iso2: EVERYWHERE_ISO2, name: t("ShipToAllCountries") },
    ...(countries || []),
  ];

  return (
    <>
      <PageTitle>{t("StoreSetting")}</PageTitle>
      <AnimatedContent>
        <div className="w-full md:p-6 p-4 bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {t(tab.labelKey)}
              </Button>
            ))}
          </div>

          {activeTab === "general" && (
            <form onSubmit={generalHandleSubmit(generalOnSubmit)}>
              <SettingContainer
                isSave={isGeneralSave}
                title={t("SettingsTabGeneral")}
                isSubmitting={isGeneralSubmitting}
              >
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Configure your store details, address, and general commerce options.
                </p>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreName")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      required={true}
                      register={generalRegister}
                      label={t("StoreName")}
                      name="store_name"
                      type="text"
                      placeholder={t("StoreName")}
                    />
                    <Error errorName={generalErrors.store_name} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreTagline")}
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      register={generalRegister}
                      label={t("StoreTagline")}
                      name="store_tagline"
                      type="text"
                      placeholder={t("StoreTagline")}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreAddressLine1")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      required={true}
                      register={generalRegister}
                      label={t("StoreAddressLine1")}
                      name="store_address_line1"
                      type="text"
                      placeholder={t("StoreAddressLine1")}
                    />
                    <Error errorName={generalErrors.store_address_line1} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreAddressLine2")}
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      register={generalRegister}
                      label={t("StoreAddressLine2")}
                      name="store_address_line2"
                      type="text"
                      placeholder={t("StoreAddressLine2")}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreCity")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      required={true}
                      register={generalRegister}
                      label={t("StoreCity")}
                      name="store_city"
                      type="text"
                      placeholder={t("StoreCity")}
                    />
                    <Error errorName={generalErrors.store_city} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    State / Region
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      register={generalRegister}
                      label="State / Region"
                      name="store_state"
                      type="text"
                      placeholder="State / Region / Province"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreCountry")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <SelectCountry
                      required={true}
                      register={generalRegister}
                      watch={generalWatch}
                      setValue={generalSetValue}
                      label={t("StoreCountry")}
                      name="countryId"
                    />
                    <Error errorName={generalErrors.countryId} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StorePostCode")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      required={true}
                      register={generalRegister}
                      label={t("StorePostCode")}
                      name="store_post_code"
                      type="text"
                      placeholder={t("StorePostCode")}
                    />
                    <Error errorName={generalErrors.store_post_code} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("SellLocation")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3 country-multiselect">
                    <Multiselect
                      options={sellOptions}
                      selectedValues={displaySellingCountries}
                      displayValue="name"
                      isObject={true}
                      onSelect={handleSelectSelling}
                      onRemove={setSellingCountries}
                      placeholder={t("ShippingZoneRegionsPlaceholder")}
                      optionValueDecorator={countryOptionLabel}
                      selectedValueDecorator={countryOptionLabel}
                      showArrow={true}
                      customArrow={<FiChevronDown className="w-4 h-4 text-gray-400" />}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("ShipLocation")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3 country-multiselect">
                    <Multiselect
                      options={shipOptions}
                      selectedValues={displayShippingCountries}
                      displayValue="name"
                      isObject={true}
                      onSelect={handleSelectShipping}
                      onRemove={setShippingCountries}
                      placeholder={t("ShippingZoneRegionsPlaceholder")}
                      optionValueDecorator={countryOptionLabel}
                      selectedValueDecorator={countryOptionLabel}
                      showArrow={true}
                      customArrow={<FiChevronDown className="w-4 h-4 text-gray-400" />}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("DefaultCustomerAddress")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <select
                      {...generalRegister("default_customer_address")}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                      <option value="base">{t("ShopBaseAddress")}</option>
                      <option value="shipping">Customer shipping address</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("WeightUnit")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <select
                      {...generalRegister("weight_unit")}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="lbs">lbs</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("DimensionUnit")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <select
                      {...generalRegister("dimension_unit")}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="in">in</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("StoreCurrency")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <SelectCurrencyId
                      required={true}
                      register={generalRegister}
                      label={t("StoreCurrency")}
                      name="currencyId"
                    />
                    <Error errorName={generalErrors.currencyId} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("TimeZone")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <SelectTimeZone
                      register={generalRegister}
                      name="default_time_zone"
                      label="Time Zone"
                    />
                    <Error errorName={generalErrors.default_time_zone} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("DefaultDateFormat")} <span className="text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-3">
                    <select
                      {...generalRegister("default_date_format", {
                        required: "Default date formate is required",
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                      <option value="" defaultValue hidden>
                        {t("DefaultDateFormat")}
                      </option>
                      <option value="MMM D, YYYY">MM/DD/YYYY</option>
                      <option value="D MMM, YYYY">DD/MM/YYYY</option>
                      <option value="YYYY,MMM D">YYYY/MM/DD</option>
                    </select>
                    <Error errorName={generalErrors.default_date_format} />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
                  <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("EnableTaxCalc")}
                  </label>
                  <div className="sm:col-span-3">
                    <SwitchToggle
                      id="enable-tax"
                      processOption={enableTax}
                      handleProcess={setEnableTax}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
                  <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("EnableCoupons")}
                  </label>
                  <div className="sm:col-span-3">
                    <SwitchToggle
                      id="enable-coupons"
                      processOption={enableCoupons}
                      handleProcess={setEnableCoupons}
                    />
                  </div>
                </div>

                <div
                  style={{
                    height: enableCoupons ? "auto" : 0,
                    transition: "all .6s",
                    visibility: !enableCoupons ? "hidden" : "visible",
                    opacity: !enableCoupons ? "0" : "1",
                  }}
                  className={`${enableCoupons ? "mb-6" : "mb-2"}`}
                >
                  <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 relative">
                    <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
                      {t("SequentialCoupons")}
                    </label>
                    <div className="sm:col-span-3">
                      <SwitchToggle
                        id="sequential-coupons"
                        processOption={sequentialCoupons}
                        handleProcess={setSequentialCoupons}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("ThousandSeparator")}
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      register={generalRegister}
                      label={t("ThousandSeparator")}
                      name="thousand_separator"
                      type="text"
                      placeholder=","
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("DecimalSeparator")}
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      register={generalRegister}
                      label={t("DecimalSeparator")}
                      name="decimal_separator"
                      type="text"
                      placeholder="."
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                    {t("NumberOfDecimals")}
                  </label>
                  <div className="sm:col-span-3">
                    <InputAreaTwo
                      register={generalRegister}
                      label={t("NumberOfDecimals")}
                      name="number_of_decimals"
                      type="number"
                      placeholder="2"
                    />
                  </div>
                </div>
              </SettingContainer>
            </form>
          )}

          {activeTab === "store-details" && (
            <form onSubmit={storeHandleSubmit(storeOnSubmit)}>
              <SettingContainer
                isSave={isStoreSave}
                title={t("StoreDetails")}
                isSubmitting={isStoreSubmitting}
              >
                <div className="flex-grow scrollbar-hide w-full max-h-full">
                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <label className="block md:text-sm md:col-span-1 sm:col-span-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {t("EnableCOD")} <br />
                      <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                        (This is enabled by default)
                      </span>
                    </label>
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="cod"
                        processOption={enabledCOD}
                        handleProcess={handleEnableDisableMethod}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label={t("EnableStripe")} />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="stripe"
                        processOption={enabledStripe}
                        handleProcess={handleEnableDisableMethod}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      height: enabledStripe ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledStripe ? "hidden" : "visible",
                      opacity: !enabledStripe ? "0" : "1",
                    }}
                    className={`${enabledStripe ? "mb-8" : "mb-2"}`}
                  >
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                      <Label label={t("StripeKey")} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledStripe}
                          register={storeRegister}
                          label={t("StripeKey")}
                          name="stripe_key"
                          type="password"
                          placeholder={t("StripeKey")}
                        />
                        <Error errorName={storeErrors.stripe_key} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                      <Label label={t("StripeSecret")} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledStripe}
                          register={storeRegister}
                          label={t("StripeSecret")}
                          name="stripe_secret"
                          type="password"
                          placeholder={t("StripeSecret")}
                        />
                        <Error errorName={storeErrors.stripe_secret} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label="Enable RazorPay" />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="razorpay"
                        processOption={enabledRazorPay}
                        handleProcess={setEnabledRazorPay}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      height: enabledRazorPay ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledRazorPay ? "hidden" : "visible",
                      opacity: !enabledRazorPay ? "0" : "1",
                    }}
                    className={`${enabledRazorPay ? "mb-8" : "mb-2"}`}
                  >
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                      <Label label="RazorPay ID" />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledRazorPay}
                          register={storeRegister}
                          label="RazorPay ID"
                          name="razorpay_id"
                          type="password"
                          placeholder="RazorPay ID"
                        />
                        <Error errorName={storeErrors.razorpay_id} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                      <Label label="RazorPay Secret" />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledRazorPay}
                          register={storeRegister}
                          label="RazorPay Secret"
                          name="razorpay_secret"
                          type="password"
                          placeholder="RazorPay Secret"
                        />
                        <Error errorName={storeErrors.razorpay_secret} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label={t("EnableGoogleLogin")} />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="google_login"
                        processOption={enabledGoogleLogin}
                        handleProcess={setEnabledGoogleLogin}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      height: enabledGoogleLogin ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledGoogleLogin ? "hidden" : "visible",
                      opacity: !enabledGoogleLogin ? "0" : "1",
                    }}
                    className={`${enabledGoogleLogin ? "mb-8" : "mb-2"}`}
                  >
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                      <Label label={t("GoogleClientId")} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledGoogleLogin}
                          register={storeRegister}
                          label={t("GoogleClientId")}
                          name="google_id"
                          type="password"
                          placeholder={t("GoogleClientId")}
                        />
                        <Error errorName={storeErrors.google_id} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                      <Label label={t("GoogleSecret")} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledGoogleLogin}
                          register={storeRegister}
                          label={t("GoogleSecret")}
                          name="google_secret"
                          type="password"
                          placeholder={t("GoogleSecret")}
                        />
                        <Error errorName={storeErrors.google_secret} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label="Enable Github Login" />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="github_login"
                        processOption={enabledGithubLogin}
                        handleProcess={setEnabledGithubLogin}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      height: enabledGithubLogin ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledGithubLogin ? "hidden" : "visible",
                      opacity: !enabledGithubLogin ? "0" : "1",
                    }}
                    className={`${enabledGithubLogin ? "mb-8" : "mb-2"}`}
                  >
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                      <Label label={"Github ID"} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledGithubLogin}
                          register={storeRegister}
                          label="Github ID"
                          name="github_id"
                          type="password"
                          placeholder="Github ID"
                        />
                        <Error errorName={storeErrors.github_id} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                      <Label label="Github Secret" />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledGithubLogin}
                          register={storeRegister}
                          label="Github Secret"
                          name="github_secret"
                          type="password"
                          placeholder="Github Secret"
                        />
                        <Error errorName={storeErrors.github_secret} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label="Enable Facebook Login" />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="facebook_login"
                        processOption={enabledFacebookLogin}
                        handleProcess={setEnabledFacebookLogin}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      height: enabledFacebookLogin ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledFacebookLogin ? "hidden" : "visible",
                      opacity: !enabledFacebookLogin ? "0" : "1",
                    }}
                    className={`${enabledFacebookLogin ? "mb-8" : "mb-2"}`}
                  >
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                      <Label label="Facebook ID" />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledFacebookLogin}
                          register={storeRegister}
                          label="Facebook ID"
                          name="facebook_id"
                          type="password"
                          placeholder="Facebook ID"
                        />
                        <Error errorName={storeErrors.facebook_id} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                      <Label label="Facebook Secret" />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledFacebookLogin}
                          register={storeRegister}
                          label="Facebook Secret"
                          name="facebook_secret"
                          type="password"
                          placeholder="Facebook Secret"
                        />
                        <Error errorName={storeErrors.facebook_secret} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label={t("EnableGoggleAnalytics")} />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="google_analytics"
                        processOption={enabledGoogleAnalytics}
                        handleProcess={setEnabledGoogleAnalytics}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      height: enabledGoogleAnalytics ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledGoogleAnalytics ? "hidden" : "visible",
                      opacity: !enabledGoogleAnalytics ? "0" : "1",
                    }}
                    className={`${
                      enabledGoogleAnalytics
                        ? "grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6"
                        : "mb-2"
                    }`}
                  >
                    <Label label={t("GoogleAnalyticKey")} />
                    <div className="sm:col-span-4">
                      <InputAreaTwo
                        required={enabledGoogleAnalytics}
                        register={storeRegister}
                        label={t("GoogleAnalyticKey")}
                        name="google_analytic_key"
                        type="password"
                        placeholder={t("GoogleAnalyticKey")}
                      />
                      <Error errorName={storeErrors.google_analytic_key} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <Label label={t("EnableTawkChat")} />
                    <div className="sm:col-span-4">
                      <SwitchToggle
                        id="tawk_chat"
                        processOption={enabledTawkChat}
                        handleProcess={setEnabledTawkChat}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      height: enabledTawkChat ? "auto" : 0,
                      transition: "all .6s",
                      visibility: !enabledTawkChat ? "hidden" : "visible",
                      opacity: !enabledTawkChat ? "0" : "1",
                    }}
                    className={`${enabledTawkChat ? "mb-8" : "mb-2"}`}
                  >
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                      <Label label={t("TawkChatPropertyID")} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledTawkChat}
                          register={storeRegister}
                          label={t("TawkChatPropertyID")}
                          name="tawk_chat_property_id"
                          type="password"
                          placeholder={t("TawkChatPropertyID")}
                        />
                        <Error errorName={storeErrors.tawk_chat_property_id} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                      <Label label={t("TawkChatWidgetID")} />
                      <div className="sm:col-span-4">
                        <InputAreaTwo
                          required={enabledTawkChat}
                          register={storeRegister}
                          label={t("TawkChatWidgetID")}
                          name="tawk_chat_widget_id"
                          type="password"
                          placeholder={t("TawkChatWidgetID")}
                        />
                        <Error errorName={storeErrors.tawk_chat_widget_id} />
                      </div>
                    </div>
                  </div>
                </div>
              </SettingContainer>
            </form>
          )}
        </div>
      </AnimatedContent>
    </>
  );
};

export default StoreSetting;
