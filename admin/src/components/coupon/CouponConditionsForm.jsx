import ReactTagInput from "@pathofdev/react-tag-input";
import { Input } from "@windmill/react-ui";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useTranslation } from "react-i18next";

//internal import
import LabelArea from "@/components/form/selectOption/LabelArea";
import IdMultiSelect from "@/components/form/selectOption/IdMultiSelect";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import DrawerButton from "@/components/form/button/DrawerButton";
import useCouponConditionSubmit from "@/hooks/useCouponConditionSubmit";

const Field = ({ label, children }) => (
  <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
    <LabelArea label={label} />
    <div className="col-span-8 sm:col-span-4">{children}</div>
  </div>
);

const CouponConditionsForm = ({ id, isActive }) => {
  const { t } = useTranslation();
  const {
    form,
    setField,
    isLoading,
    isSubmitting,
    handleSubmit,
    productOptions,
    categoryOptions,
    brandOptions,
    tagOptions,
    customerOptions,
  } = useCouponConditionSubmit(id, isActive);

  if (isLoading) {
    return <div className="px-6 pt-8 text-sm text-gray-400">{t("Processing")}</div>;
  }

  return (
    <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <Field label={t("CouponMinSpendLabel")}>
            <Input
              type="number"
              step="0.01"
              value={form.minSpend}
              onChange={(e) => setField("minSpend", e.target.value)}
              className="mr-2 h-12 p-2"
            />
          </Field>

          <Field label={t("CouponMaxSpendLabel")}>
            <Input
              type="number"
              step="0.01"
              value={form.maxSpend}
              onChange={(e) => setField("maxSpend", e.target.value)}
              className="mr-2 h-12 p-2"
            />
          </Field>

          <Field label={t("CouponIncludedProductsLabel")}>
            <IdMultiSelect
              options={productOptions}
              selectedIds={form.includedProducts}
              onChange={(ids) => setField("includedProducts", ids)}
              placeholder={t("CouponSelectProductsPlaceholder")}
            />
          </Field>

          <Field label={t("CouponExcludedProductsLabel")}>
            <IdMultiSelect
              options={productOptions}
              selectedIds={form.excludedProducts}
              onChange={(ids) => setField("excludedProducts", ids)}
              placeholder={t("CouponSelectProductsPlaceholder")}
            />
          </Field>

          <Field label={t("CouponIncludedCategoriesLabel")}>
            <IdMultiSelect
              options={categoryOptions}
              selectedIds={form.includedCategories}
              onChange={(ids) => setField("includedCategories", ids)}
              placeholder={t("CouponSelectCategoriesPlaceholder")}
            />
          </Field>

          <Field label={t("CouponExcludedCategoriesLabel")}>
            <IdMultiSelect
              options={categoryOptions}
              selectedIds={form.excludedCategories}
              onChange={(ids) => setField("excludedCategories", ids)}
              placeholder={t("CouponSelectCategoriesPlaceholder")}
            />
          </Field>

          <Field label={t("CouponIncludedBrandsLabel")}>
            <IdMultiSelect
              options={brandOptions}
              selectedIds={form.includedBrands}
              onChange={(ids) => setField("includedBrands", ids)}
              placeholder={t("CouponSelectBrandsPlaceholder")}
            />
          </Field>

          <Field label={t("CouponExcludedBrandsLabel")}>
            <IdMultiSelect
              options={brandOptions}
              selectedIds={form.excludedBrands}
              onChange={(ids) => setField("excludedBrands", ids)}
              placeholder={t("CouponSelectBrandsPlaceholder")}
            />
          </Field>

          <Field label={t("CouponIncludedTagsLabel")}>
            <IdMultiSelect
              options={tagOptions}
              selectedIds={form.includedTags}
              onChange={(ids) => setField("includedTags", ids)}
              placeholder={t("CouponSelectTagsPlaceholder")}
            />
          </Field>

          <Field label={t("CouponExcludedTagsLabel")}>
            <IdMultiSelect
              options={tagOptions}
              selectedIds={form.excludedTags}
              onChange={(ids) => setField("excludedTags", ids)}
              placeholder={t("CouponSelectTagsPlaceholder")}
            />
          </Field>

          <Field label={t("CouponCustomerGroupsLabel")}>
            <ReactTagInput
              placeholder={t("CouponCustomerGroupsPlaceholder")}
              tags={form.customerGroups}
              onChange={(tags) => setField("customerGroups", tags)}
            />
          </Field>

          <Field label={t("CouponSpecificCustomersLabel")}>
            <IdMultiSelect
              options={customerOptions}
              selectedIds={form.specificCustomers}
              onChange={(ids) => setField("specificCustomers", ids)}
              placeholder={t("CouponSelectCustomersPlaceholder")}
            />
          </Field>

          <Field label={t("CouponGuestOnlyLabel")}>
            <SwitchToggle
              handleProcess={(value) => setField("guestOnly", value)}
              processOption={form.guestOnly}
            />
          </Field>

          <Field label={t("CouponLoggedUserOnlyLabel")}>
            <SwitchToggle
              handleProcess={(value) => setField("loggedUserOnly", value)}
              processOption={form.loggedUserOnly}
            />
          </Field>

          <Field label={t("CouponCountriesLabel")}>
            <ReactTagInput
              placeholder={t("CouponCountriesPlaceholder")}
              tags={form.countries}
              onChange={(tags) => setField("countries", tags)}
            />
          </Field>

          <Field label={t("CouponStatesLabel")}>
            <ReactTagInput
              placeholder={t("CouponStatesPlaceholder")}
              tags={form.states}
              onChange={(tags) => setField("states", tags)}
            />
          </Field>

          <Field label={t("CouponCitiesLabel")}>
            <ReactTagInput
              placeholder={t("CouponCitiesPlaceholder")}
              tags={form.cities}
              onChange={(tags) => setField("cities", tags)}
            />
          </Field>

          <Field label={t("CouponPostalCodesLabel")}>
            <ReactTagInput
              placeholder={t("CouponPostalCodesPlaceholder")}
              tags={form.postalCodes}
              onChange={(tags) => setField("postalCodes", tags)}
            />
          </Field>

          <Field label={t("CouponMinQuantityLabel")}>
            <Input
              type="number"
              value={form.minQuantity}
              onChange={(e) => setField("minQuantity", e.target.value)}
              className="mr-2 h-12 p-2"
            />
          </Field>

          <Field label={t("CouponMaxQuantityLabel")}>
            <Input
              type="number"
              value={form.maxQuantity}
              onChange={(e) => setField("maxQuantity", e.target.value)}
              className="mr-2 h-12 p-2"
            />
          </Field>

          <Field label={t("CouponMinSubtotalLabel")}>
            <Input
              type="number"
              step="0.01"
              value={form.minSubtotal}
              onChange={(e) => setField("minSubtotal", e.target.value)}
              className="mr-2 h-12 p-2"
            />
          </Field>

          <Field label={t("CouponMaxTotalWeightLabel")}>
            <Input
              type="number"
              step="0.01"
              value={form.maxTotalWeight}
              onChange={(e) => setField("maxTotalWeight", e.target.value)}
              className="mr-2 h-12 p-2"
            />
          </Field>
        </div>

        <DrawerButton id={id} title={t("CouponRestrictionsTabTitle")} isSubmitting={isSubmitting} zIndex="z-20" />
      </form>
    </Scrollbars>
  );
};

export default CouponConditionsForm;
