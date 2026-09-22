import React from "react";
import { useTranslation } from "react-i18next";
import { FiShoppingBag, FiImage, FiCheck } from "react-icons/fi";

import StoreNameSection from "@/components/store/steps/StoreNameSection";
import StoreLogoSection from "@/components/store/steps/StoreLogoSection";
import StoreStatusSection from "@/components/store/steps/StoreStatusSection";

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

const StoreIdentityStep = ({
  formData,
  onDataChange,
  register,
  errors,
  imageUrl,
  setImageUrl,
  plans = [],
  isPlansLoading = false,
  nameAvailable = null,
  checkingName = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 w-full">
      <SectionCard
        icon={FiShoppingBag}
        title={t("StoreIdentitySection") || "Store Identity"}
        subtitle={t("StoreIdentitySectionDesc") || "Basic information that identifies your store."}
      >
        <StoreNameSection
          formData={formData}
          onDataChange={onDataChange}
          register={register}
          errors={errors}
          nameAvailable={nameAvailable}
          checkingName={checkingName}
        />
      </SectionCard>

      <SectionCard
        icon={FiImage}
        title={t("LogoSection") || "Store Logo"}
        subtitle={t("LogoSectionDesc") || "Used in emails, invoices and the storefront."}
      >
        <StoreLogoSection imageUrl={imageUrl} setImageUrl={setImageUrl} />
      </SectionCard>

      <SectionCard
        icon={FiCheck}
        title={t("StatusSection") || "Store Status"}
        subtitle={t("StatusSectionDesc") || "Set the initial active status for this store."}
      >
        <StoreStatusSection formData={formData} onDataChange={onDataChange} />
      </SectionCard>
    </div>
  );
};

export default StoreIdentityStep;
