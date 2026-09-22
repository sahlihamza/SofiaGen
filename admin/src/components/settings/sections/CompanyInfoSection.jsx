import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import InputAreaTwo from "@/components/form/input/InputAreaTwo";

const CompanyInfoSection = ({ register, errors }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Company Information</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your company details that will appear on invoices and receipts.
        </p>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("ShopName")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label={t("ShopName")}
            name="shop_name"
            type="text"
            placeholder={t("ShopName")}
          />
          <Error errorName={errors.shop_name} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("InvoiceCompanyName")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label={t("InvoiceCompanyName")}
            name="company_name"
            type="text"
            placeholder={t("InvoiceCompanyName")}
          />
          <Error errorName={errors.company_name} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("VatNumber")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Vat Number"
            name="vat_number"
            type="text"
            placeholder="Vat Number"
          />
          <Error errorName={errors.vat_number} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("AddressLine")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            required={true}
            register={register}
            label="Address"
            name="address"
            type="text"
            placeholder="Address"
          />
          <Error errorName={errors.address} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          {t("PostCode")}
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Post Code"
            name="post_code"
            type="text"
            placeholder="Post Code"
          />
          <Error errorName={errors.post_code} />
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoSection;
