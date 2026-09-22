import React from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiX } from "react-icons/fi";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";

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

const StoreNameSection = ({
  formData,
  onDataChange,
  register,
  errors,
  nameAvailable = null,
  checkingName = false,
}) => {
  const { t } = useTranslation();

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
    <div className="space-y-5">
      <Field
        label={t("StoreNameLabel") || "Store Name"}
        required
        hint={t("StoreNameHint") || "This name appears in the admin and storefront."}
        error={<Error errorName={errors?.name} />}
      >
        <div className="relative">
          <InputArea
            register={register}
            required={true}
            name="name"
            type="text"
            placeholder="e.g., Vita Shop"
            onChange={handleNameChange}
            label={t("StoreNameLabel") || "Store Name"}
          />
          {checkingName && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!checkingName && nameAvailable === true && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <FiCheck size={16} className="text-emerald-500" />
            </div>
          )}
          {!checkingName && nameAvailable === false && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <FiX size={16} className="text-red-500" />
            </div>
          )}
        </div>
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

      <Field
        label={t("CategoryLabel") || "Category"}
        hint={t("StoreCategoryHint") || "Optional category used for store grouping."}
        error={<Error errorName={errors?.category} />}
      >
        <InputArea
          register={register}
          name="category"
          type="text"
          placeholder={t("StoreCategoryPlaceholder") || "e.g., Fashion"}
          defaultValue={formData.category || ""}
          onChange={handleInputChange}
          label={t("CategoryLabel") || "Category"}
        />
      </Field>

      <Field
        label={t("StoreAddressLabel") || "Address"}
        hint={t("StoreAddressHint") || "Physical address for the store (optional)."}
        error={<Error errorName={errors?.address} />}
      >
        <InputArea
          register={register}
          name="address"
          type="text"
          placeholder="e.g., 12 Rue de Paris, Tunis"
          defaultValue={formData.address || ""}
          onChange={handleInputChange}
          label={t("StoreAddressLabel") || "Address"}
        />
      </Field>
    </div>
  );
};

export default StoreNameSection;
