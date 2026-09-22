import { Input } from "@windmill/react-ui";
import { t } from "i18next";
import { Scrollbars } from "react-custom-scrollbars-2";

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import InputValue from "@/components/form/input/InputValue";
import LabelArea from "@/components/form/selectOption/LabelArea";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import SwitchToggleFour from "@/components/form/switch/SwitchToggleFour";
import usePlatformCouponSubmit from "@/hooks/usePlatformCouponSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";

const PlatformCouponDrawer = ({ id }) => {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    published,
    setPublished,
    discountType,
    setDiscountType,
    handleSelectLanguage,
  } = usePlatformCouponSubmit(id);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            title={t("UpdatePlatformCoupon")}
            description={t("UpdatePlatformCouponDescription")}
          />
        ) : (
          <Title
            title={t("AddPlatformCoupon")}
            description={t("AddPlatformCouponDescription")}
          />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponCode")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  register={register}
                  label="Coupon Code"
                  name="code"
                  type="text"
                  placeholder={t("CouponCodePlaceholder")}
                />
                <Error errorName={errors.code} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CampaignName")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  register={register}
                  label="Coupon title"
                  name="title"
                  type="text"
                  placeholder={t("CampaignName")}
                />
                <Error errorName={errors.title} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Description")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label="Description"
                  name="description"
                  type="text"
                  placeholder={t("DescriptionPlaceholder")}
                />
                <Error errorName={errors.description} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("DiscountType")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggleFour
                  handleProcess={setDiscountType}
                  processOption={discountType}
                />
                <Error errorName={errors.discountType} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("DiscountValue")} />
              <div className="col-span-8 sm:col-span-4">
                <InputValue
                  required={true}
                  register={register}
                  maxValue={discountType ? 99 : 10000}
                  minValue={0}
                  label="Discount Value"
                  name="discountValue"
                  type="number"
                  placeholder={discountType ? "Percentage" : "Fixed Amount"}
                  currency={discountType ? "%" : ""}
                />
                <Error errorName={errors.discountValue} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("ApplicableTo")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("applicableTo")}
                  label="Applicable To"
                  name="applicableTo"
                  type="text"
                  disabled
                  value="subscription"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CouponValidityTime")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("endDate", {
                    required: "Coupon End Date is required",
                  })}
                  label="Coupon End Date"
                  name="endDate"
                  type="datetime-local"
                />
                <Error errorName={errors.endDate} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("UsageLimit")} />
              <div className="col-span-8 sm:col-span-4">
                <InputValue
                  register={register}
                  maxValue={999999}
                  minValue={0}
                  label="Usage Limit"
                  name="usageLimit"
                  type="number"
                  placeholder={t("UsageLimitPlaceholder")}
                />
                <Error errorName={errors.usageLimit} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("Published")} />
              <div className="col-span-8 sm:col-span-4">
                <SwitchToggle
                  handleProcess={setPublished}
                  processOption={published}
                />
                <Error errorName={errors.status} />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title="PlatformCoupon" isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default PlatformCouponDrawer;