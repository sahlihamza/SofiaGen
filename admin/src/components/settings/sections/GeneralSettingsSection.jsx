import { Select } from "@windmill/react-ui";
import Multiselect from "multiselect-react-dropdown";
import { FiChevronDown } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import InputAreaTwo from "@/components/form/input/InputAreaTwo";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import SelectCountry from "@/components/form/selectOption/SelectCountry";
import SelectTimeZone from "@/components/form/selectOption/SelectTimeZone";
import SelectCurrencyId from "@/components/form/selectOption/SelectCurrencyId";
import { EVERYWHERE_ISO2, countryOptionLabel } from "@/utils/countryOptionLabel";
import { Button } from "@sofia/ui";

const GeneralSettingsSection = ({
  register,
  errors,
  watch,
  setValue,
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
  onSave,
  isSaving,
}) => {
  const { t } = useTranslation();
  const sellOptions = [
    { iso2: EVERYWHERE_ISO2, name: t("SellToAllCountries") },
    ...(countries || []),
  ];
  const isSellEverywhere =
    (countries?.length || 0) > 0 && sellingCountries.length === countries.length;
  const displaySellingCountries = isSellEverywhere
    ? [{ iso2: EVERYWHERE_ISO2, name: t("SellToAllCountries") }]
    : sellingCountries;
  const handleSelectSelling = (selectedList, selectedItem) => {
    if (selectedItem?.iso2 === EVERYWHERE_ISO2) {
      setSellingCountries(countries || []);
      return;
    }
    if (isSellEverywhere) {
      setSellingCountries([selectedItem]);
      return;
    }
    setSellingCountries(selectedList);
  };

  const shipOptions = [
    { iso2: EVERYWHERE_ISO2, name: t("ShipToAllCountries") },
    ...(countries || []),
  ];
  const isShipEverywhere =
    (countries?.length || 0) > 0 && shippingCountries.length === countries.length;
  const displayShippingCountries = isShipEverywhere
    ? [{ iso2: EVERYWHERE_ISO2, name: t("ShipToAllCountries") }]
    : shippingCountries;
  const handleSelectShipping = (selectedList, selectedItem) => {
    if (selectedItem?.iso2 === EVERYWHERE_ISO2) {
      setShippingCountries(countries || []);
      return;
    }
    if (isShipEverywhere) {
      setShippingCountries([selectedItem]);
      return;
    }
    setShippingCountries(selectedList);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">General Settings</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure your store details, address, and general commerce options.
          </p>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-shrink-0 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("Processing") : t("UpdateBtn")}
        </Button>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("StoreName")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label={t("StoreName")}
            name="store_name"
            type="text"
            placeholder={t("StoreName")}
          />
          <Error errorName={errors.store_name} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Store Tagline
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Store Tagline"
            name="store_tagline"
            type="text"
            placeholder="Slogan / Tagline"
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
            register={register}
            label={t("StoreAddressLine1")}
            name="store_address_line1"
            type="text"
            placeholder={t("StoreAddressLine1")}
          />
          <Error errorName={errors.store_address_line1} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("StoreAddressLine2")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label={t("StoreAddressLine2")}
            name="store_address_line2"
            type="text"
            placeholder={t("StoreAddressLine2")}
          />
          <Error errorName={errors.store_address_line2} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("StoreCity")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label={t("StoreCity")}
            name="store_city"
            type="text"
            placeholder={t("StoreCity")}
          />
          <Error errorName={errors.store_city} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          State / Region
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
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
            register={register}
            watch={watch}
            setValue={setValue}
            label={t("StoreCountry")}
            name="countryId"
          />
          <Error errorName={errors.countryId} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("StorePostCode")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label={t("StorePostCode")}
            name="store_post_code"
            type="text"
            placeholder={t("StorePostCode")}
          />
          <Error errorName={errors.store_post_code} />
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
          <Select {...register("default_customer_address")}>
            <option value="base">{t("ShopBaseAddress")}</option>
            <option value="shipping">Customer shipping address</option>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("WeightUnit")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <Select {...register("weight_unit")}>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="lbs">lbs</option>
            <option value="oz">oz</option>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("DimensionUnit")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <Select {...register("dimension_unit")}>
            <option value="cm">cm</option>
            <option value="m">m</option>
            <option value="in">in</option>
            <option value="ft">ft</option>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("StoreCurrency")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <SelectCurrencyId required={true} register={register} label={t("StoreCurrency")} name="currencyId" />
          <Error errorName={errors.currencyId} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("TimeZone")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <SelectTimeZone
            register={register}
            name="default_time_zone"
            label="Time Zone"
          />
          <Error errorName={errors.default_time_zone} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("DefaultDateFormat")} <span className="text-red-500">*</span>
        </label>
        <div className="sm:col-span-3">
          <Select
            {...register("default_date_format", {
              required: "Default date formate is required",
            })}
          >
            <option value="" defaultValue hidden>
              {t("DefaultDateFormat")}
            </option>
            <option value="MMM D, YYYY">MM/DD/YYYY</option>
            <option value="D MMM, YYYY">DD/MM/YYYY</option>
            <option value="YYYY,MMM D">YYYY/MM/DD</option>
          </Select>
          <Error errorName={errors.default_date_format} />
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
            register={register}
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
            register={register}
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
            register={register}
            label={t("NumberOfDecimals")}
            name="number_of_decimals"
            type="number"
            placeholder="2"
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsSection;
