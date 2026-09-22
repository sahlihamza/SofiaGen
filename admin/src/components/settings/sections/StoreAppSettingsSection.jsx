import { Select } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import InputAreaTwo from "@/components/form/input/InputAreaTwo";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import SelectCurrency from "@/components/form/selectOption/SelectCurrency";
import SelectReceiptSize from "@/components/form/selectOption/SelectPrintSize";
import SelectLanguageThree from "@/components/form/selectOption/SelectLanguageThree";

const StoreAppSettingsSection = ({
  register,
  errors,
  watch,
  setValue,
  isAllowAutoTranslation,
  setIsAllowAutoTranslation,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Store Settings</h3>
          <a
            href="https://sofiagen-documentation.netlify.app/backend-configuration#jwt-and-encryption-configuration"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
          >
            <span>Docs</span>
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your basic application settings and preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("NumberOfImagesPerProduct")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label={t("NumberOfImagesPerProduct")}
            name="number_of_image_per_product"
            type="number"
            placeholder={t("NumberOfImagesPerProduct")}
          />
          <Error errorName={errors.number_of_image_per_product} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
          {t("AllowAutoTranslation")}
        </label>
        <div className="md:col-span-3 sm:col-span-4">
          <SwitchToggle
            title={""}
            handleProcess={setIsAllowAutoTranslation}
            processOption={isAllowAutoTranslation}
          />
        </div>
      </div>

      <div
        className="grid md:grid-cols-5 sm:grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6"
        style={{
          height: isAllowAutoTranslation ? "auto" : 0,
          transition: "all 0.6s",
          visibility: !isAllowAutoTranslation ? "hidden" : "visible",
          opacity: !isAllowAutoTranslation ? "0" : "1",
          marginBottom: !isAllowAutoTranslation ? 0 : 24,
        }}
      >
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("TranslationSecretKey")}
          <br />
          <small className="font-normal text-xs">
            You can create key from{" "}
            <a
              href="https://mymemory.translated.net/doc/keygen.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-700"
            >
              here
            </a>
          </small>
        </label>
        <div className="md:col-span-3 sm:col-span-4">
          <InputAreaTwo
            register={register}
            label={t("TranslationSecretKey")}
            name="translation_key"
            type="password"
            placeholder={t("TranslationSecretKey")}
            autoComplete="new-password"
            required={isAllowAutoTranslation}
          />
          <Error errorName={errors.translation_key} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Active Theme
        </label>
        <div className="sm:col-span-3">
          <select
            {...register("active_theme")}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="none">Default (No Theme)</option>
            <option value="emerald-default">Emerald Default</option>
            <option value="defu">defu</option>
            <option value="slate-minimal">Slate Minimal</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("DefaultLanguage")}
        </label>
        <div className="sm:col-span-3">
          <SelectLanguageThree
            required
            watch={watch}
            setValue={setValue}
            register={register}
            name="default_language"
            label={t("DefaultLanguage")}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
          {t("DefaultCurrency")}
        </label>
        <div className="sm:col-span-3">
          <SelectCurrency
            register={register}
            label="Currency"
            name="default_currency"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("CurrencyPosition")}
        </label>
        <div className="sm:col-span-3">
          <Select {...register("currency_position")}>
            <option value="left">{t("CurrencyPositionLeft")}</option>
            <option value="right">{t("CurrencyPositionRight")}</option>
            <option value="left_space">{t("CurrencyPositionLeftSpace")}</option>
            <option value="right_space">{t("CurrencyPositionRightSpace")}</option>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
        <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
          {t("ReceiptSize")}
        </label>
        <div className="sm:col-span-3">
          <SelectReceiptSize
            label="Role"
            register={register}
            name="receipt_size"
            required={true}
          />
          <Error errorName={errors.receipt_size} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative">
        <label className="block text-sm text-gray-600 font-semibold dark:text-gray-400 mb-1 sm:col-span-2">
          Enable Guest Checkout
        </label>
        <div className="sm:col-span-3">
          <SwitchToggle
            id="enable-guest-order"
            processOption={false}
            handleProcess={() => {}}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Store Layout
        </label>
        <div className="sm:col-span-3">
          <select
            {...register("store_layout")}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="default">Default</option>
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
            <option value="clothing">Clothing</option>
            <option value="electronic">Electronic</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default StoreAppSettingsSection;
