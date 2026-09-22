import React from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import usePaymentRuleSubmit from "@/hooks/usePaymentRuleSubmit";

const PaymentRuleDrawer = ({ id }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    providers,
  } = usePaymentRuleSubmit(id);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditPaymentRule") : t("CreatePaymentRule")}
          description={
            id
              ? t("EditPaymentRuleDescription")
              : t("CreatePaymentRuleDescription")
          }
        />
      </div>

      <Scrollbars className="w-full md:w-8/12 lg:w-9/12 xl:w-9/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelArea label={t("Provider") || "Provider *"} />
                <select
                  {...register("paymentProviderId", { required: "Provider is required" })}
                  disabled={!!id}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("SelectProvider") || "Select provider"}</option>
                  {providers.map((p) => (
                    <option key={p._id} value={p._id}>{p.name || p.code}</option>
                  ))}
                </select>
                {errors.paymentProviderId && (
                  <p className="text-red-500 text-xs mt-1">{errors.paymentProviderId.message}</p>
                )}
              </div>

              <div>
                <LabelArea label={t("Status") || "Status"} />
                <select
                  {...register("status")}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">{t("Active") || "Active"}</option>
                  <option value="inactive">{t("Inactive") || "Inactive"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelArea label={t("Countries") || "Countries"} />
                <InputArea
                  register={register}
                  label={t("Countries") || "Countries"}
                  name="countries"
                  type="text"
                  placeholder={t("Comma separated") || "e.g. US, FR, DE"}
                />
                <Error errorName={errors.countries} />
              </div>
              <div>
                <LabelArea label={t("Currencies") || "Currencies"} />
                <InputArea
                  register={register}
                  label={t("Currencies") || "Currencies"}
                  name="currencies"
                  type="text"
                  placeholder={t("Comma separated") || "e.g. usd, eur"}
                />
                <Error errorName={errors.currencies} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelArea label={t("PlanIds") || "Plan IDs"} />
                <InputArea
                  register={register}
                  label={t("PlanIds") || "Plan IDs"}
                  name="planIds"
                  type="text"
                  placeholder={t("Comma separated IDs") || "Comma separated IDs"}
                />
                <Error errorName={errors.planIds} />
              </div>
              <div>
                <LabelArea label={t("StoreTypes") || "Store Types"} />
                <InputArea
                  register={register}
                  label={t("StoreTypes") || "Store Types"}
                  name="storeTypes"
                  type="text"
                  placeholder={t("Comma separated") || "Comma separated"}
                />
                <Error errorName={errors.storeTypes} />
              </div>
            </div>

            <div>
              <LabelArea label={t("ClientTypes") || "Client Types"} />
              <InputArea
                register={register}
                label={t("ClientTypes") || "Client Types"}
                name="clientTypes"
                type="text"
                placeholder={t("Comma separated") || "Comma separated"}
              />
              <Error errorName={errors.clientTypes} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelArea label={t("MinAmount") || "Min Amount"} />
                <InputArea
                  register={register}
                  label={t("MinAmount") || "Min Amount"}
                  name="minAmount"
                  type="number"
                  placeholder="0"
                />
                <Error errorName={errors.minAmount} />
              </div>
              <div>
                <LabelArea label={t("MaxAmount") || "Max Amount"} />
                <InputArea
                  register={register}
                  label={t("MaxAmount") || "Max Amount"}
                  name="maxAmount"
                  type="number"
                  placeholder="1000"
                />
                <Error errorName={errors.maxAmount} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelArea label={t("Priority") || "Priority"} />
                <InputArea
                  register={register}
                  label={t("Priority") || "Priority"}
                  name="priority"
                  type="number"
                  placeholder="0"
                />
                <Error errorName={errors.priority} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("supportsOneTime")}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm">{t("SupportsOneTime") || "One-time payments"}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("supportsSubscription")}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm">{t("SupportsSubscription") || "Subscriptions"}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("supportsRefund")}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm">{t("SupportsRefund") || "Refunds"}</span>
              </label>
            </div>
          </div>

          <DrawerButton id={id} title="Payment Rule" isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default PaymentRuleDrawer;
