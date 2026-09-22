import React from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { useTranslation } from "react-i18next";

//internal import

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import useCustomerSubmit from "@/hooks/useCustomerSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";

const CustomerDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, onSubmit, errors, isSubmitting } =
    useCustomerSubmit(id);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditCustomerTitle") : t("AddCustomerTitle")}
          description={
            id ? t("EditCustomerDescription") : t("AddCustomerDescription")
          }
        />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CustomerFirstName")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  register={register}
                  label={t("CustomerFirstName")}
                  name="firstName"
                  type="text"
                  placeholder={t("CustomerFirstName")}
                />
                <Error errorName={errors.firstName} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CustomerLastName")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label={t("CustomerLastName")}
                  name="lastName"
                  type="text"
                  placeholder={t("CustomerLastName")}
                />
                <Error errorName={errors.lastName} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CustomersEmail")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  required={true}
                  register={register}
                  label={t("CustomersEmail")}
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder={t("CustomersEmail")}
                />
                <Error errorName={errors.email} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CustomersPhone")} />
              <div className="col-span-8 sm:col-span-4">
                <InputArea
                  register={register}
                  label={t("CustomersPhone")}
                  name="phone"
                  type="text"
                  placeholder={t("CustomersPhone")}
                />
                <Error errorName={errors.phone} />
              </div>
            </div>

            {/* Required on create: this password is what the customer receives
                by email, together with the address they sign in with. */}
            {!id && (
              <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                <LabelArea label={t("CustomerPassword")} />
                <div className="col-span-8 sm:col-span-4">
                  <InputArea
                    required={true}
                    register={register}
                    label={t("CustomerPassword")}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    preventAutofillSuggestion
                    placeholder={t("CustomerPassword")}
                    rules={{
                      minLength: {
                        value: 6,
                        message: t("CustomerPasswordMinLength"),
                      },
                    }}
                  />
                  <p className="text-gray-400 text-xs mt-2">
                    {t("CustomerPasswordHint")}
                  </p>
                  <Error errorName={errors.password} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("CustomersStatus")} />
              <div className="col-span-8 sm:col-span-4">
                <select
                  {...register("status")}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  <option value="active">{t("CustomerStatusActive")}</option>
                  <option value="inactive">
                    {t("CustomerStatusInactive")}
                  </option>
                  <option value="blocked">{t("CustomerStatusBlocked")}</option>
                </select>
                <Error errorName={errors.status} />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title="Customer" isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default CustomerDrawer;
