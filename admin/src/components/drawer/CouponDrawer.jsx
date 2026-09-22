import { useContext, useEffect, useState } from "react";
import { Input, Select, Textarea } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { Button } from "@sofia/ui";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import useCouponSubmit from "@/hooks/useCouponSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import CouponConditionsForm from "@/components/coupon/CouponConditionsForm";
import CouponRulesForm from "@/components/coupon/CouponRulesForm";
import CouponUsageHistory from "@/components/coupon/CouponUsageHistory";

const CouponDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { isDrawerOpen } = useContext(SidebarContext);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (!isDrawerOpen) setActiveTab("general");
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!id) setActiveTab("general");
  }, [id]);

  const DISCOUNT_TYPES = [
    { value: "percentage", label: t("DiscountTypePercentage") },
    { value: "fixed_cart", label: t("DiscountTypeFixedCart") },
    { value: "fixed_product", label: t("DiscountTypeFixedProduct") },
    { value: "buy_x_get_y", label: t("DiscountTypeBuyXGetY") },
    { value: "free_gift", label: t("DiscountTypeFreeGift") },
    { value: "shipping_discount", label: t("DiscountTypeShippingDiscount") },
  ];

  const STATUSES = [
    { value: "active", label: t("CouponStatusActive") },
    { value: "inactive", label: t("CouponStatusInactive") },
    { value: "scheduled", label: t("CouponStatusScheduled") },
    { value: "expired", label: t("CouponStatusExpired") },
    { value: "archived", label: t("CouponStatusArchived") },
  ];

  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    allowFreeShipping,
    setAllowFreeShipping,
    autoApply,
    setAutoApply,
    stackable,
    setStackable,
    isPublic,
    setIsPublic,
    isSubmitting,
  } = useCouponSubmit(id);

  return (
    <>
      <div className="w-full relative  p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ">
        {id ? (
          <Title title={t("UpdateCoupon")} description={t("UpdateCouponDescription")} />
        ) : (
          <Title title={t("AddCoupon")} description={t("AddCouponDescription")} />
        )}

        <div className="flex gap-4 mt-4 border-b border-gray-100 dark:border-gray-700">
          <Button
            type="button"
            variant={activeTab === "general" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("general")}
            className={`pb-2 border-b-2 rounded-none ${
              activeTab === "general"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-400"
            }`}
          >
            {t("CouponGeneralTabTitle")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "restrictions" ? "primary" : "ghost"}
            size="sm"
            disabled={!id}
            title={!id ? t("CouponRestrictionsRequiresSave") : undefined}
            onClick={() => id && setActiveTab("restrictions")}
            className={`pb-2 border-b-2 rounded-none ${
              activeTab === "restrictions"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-400"
            } ${!id ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {t("CouponRestrictionsTabTitle")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "rules" ? "primary" : "ghost"}
            size="sm"
            disabled={!id}
            title={!id ? t("CouponRestrictionsRequiresSave") : undefined}
            onClick={() => id && setActiveTab("rules")}
            className={`pb-2 border-b-2 rounded-none ${
              activeTab === "rules"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-400"
            } ${!id ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {t("CouponRulesTabTitle")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "usages" ? "primary" : "ghost"}
            size="sm"
            disabled={!id}
            title={!id ? t("CouponRestrictionsRequiresSave") : undefined}
            onClick={() => id && setActiveTab("usages")}
            className={`pb-2 border-b-2 rounded-none ${
              activeTab === "usages"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-400"
            } ${!id ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {t("CouponUsageHistoryTabTitle")}
          </Button>
        </div>
      </div>

      {activeTab === "restrictions" && id ? (
        <CouponConditionsForm id={id} isActive={activeTab === "restrictions"} />
      ) : activeTab === "rules" && id ? (
        <CouponRulesForm id={id} isActive={activeTab === "rules"} />
      ) : activeTab === "usages" && id ? (
        <CouponUsageHistory id={id} isActive={activeTab === "usages"} />
      ) : (
      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponCodeLabel")} required />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("code", { required: t("CouponCodeRequired") })}
                  type="text"
                  name="code"
                  placeholder={t("CouponCodePlaceholder")}
                  className="mr-2 h-12 p-2"
                />
                <Error errorName={errors.code} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponDescriptionLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Textarea
                  {...register("description")}
                  name="description"
                  rows="3"
                  placeholder={t("CouponDescriptionPlaceholder")}
                />
                <Error errorName={errors.description} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponDiscountTypeLabel")} required />
              <div className="col-span-8 sm:col-span-4">
                <Select {...register("discountType", { required: true })} name="discountType">
                  {DISCOUNT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Error errorName={errors.discountType} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponAmountLabel")} required />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("amount", { required: true, valueAsNumber: true, min: 0 })}
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder={t("CouponAmountPlaceholder")}
                  className="mr-2 h-12 p-2"
                />
                <Error errorName={errors.amount} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponStatusLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Select {...register("status")} name="status">
                  {STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponStartDateLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("startDate")}
                  type="date"
                  name="startDate"
                  className="mr-2 h-12 p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponEndDateLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("endDate")}
                  type="date"
                  name="endDate"
                  className="mr-2 h-12 p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponPriorityLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("priority", { valueAsNumber: true })}
                  type="number"
                  name="priority"
                  className="mr-2 h-12 p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponUsageLimitLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("usageLimit")}
                  type="number"
                  name="usageLimit"
                  placeholder={t("CouponUnlimitedPlaceholder")}
                  className="mr-2 h-12 p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponUsageLimitPerCustomerLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("usageLimitPerCustomer")}
                  type="number"
                  name="usageLimitPerCustomer"
                  placeholder={t("CouponUnlimitedPlaceholder")}
                  className="mr-2 h-12 p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponAllowFreeShippingLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggle handleProcess={setAllowFreeShipping} processOption={allowFreeShipping} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponAutoApplyLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggle handleProcess={setAutoApply} processOption={autoApply} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponStackableLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggle handleProcess={setStackable} processOption={stackable} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponIsPublicLabel")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggle handleProcess={setIsPublic} processOption={isPublic} />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title={t("CouponspageTitle")} isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
      )}
    </>
  );
};

export default CouponDrawer;
