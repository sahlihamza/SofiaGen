import React from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { Card, CardBody } from "@windmill/react-ui";

import Error from "@/components/form/others/Error";
import Title from "@/components/form/others/Title";
import InputArea from "@/components/form/input/InputArea";
import useRiderSubmit from "@/hooks/useRiderSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Uploader from "@/components/image-uploader/Uploader";

const RiderDrawer = ({ id }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    imageUrl,
    setImageUrl,
    isSubmitting,
    isAddFormReady,
    isUpdateFormReady,
    passwordFieldKey,
  } = useRiderSubmit(id);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditRiderDrawerTitle") : t("AddRiderDrawerTitle")}
          description={
            id
              ? t("EditRiderDrawerDescription")
              : t("AddRiderDrawerDescription")
          }
        />
      </div>
      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <Card className="overflow-y-scroll flex-grow scrollbar-hide w-full max-h-full">
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderPhotoLabel")} />
                  <div className="col-span-8 sm:col-span-4">
                    <Uploader
                      imageUrl={imageUrl}
                      setImageUrl={setImageUrl}
                      folder="rider"
                      targetWidth={238}
                      targetHeight={238}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderNameLabel")} required />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      required={true}
                      register={register}
                      label={t("RiderNameLabel")}
                      name="name"
                      type="text"
                      placeholder={t("RiderNamePlaceholder")}
                    />
                    <Error errorName={errors.name} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderEmailLabel")} required />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      required={true}
                      register={register}
                      label={t("RiderEmailLabel")}
                      name="email"
                      type="text"
                      autoComplete="username"
                      rules={{
                        pattern: {
                          value:
                            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
                          message: t("RiderInvalidEmail"),
                        },
                      }}
                      placeholder={t("RiderEmailLabel")}
                    />
                    <Error errorName={errors.email} />
                  </div>
                </div>

                {!id && (
                  <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                    <LabelArea label={t("RiderPasswordLabel")} required />
                    <div className="col-span-8 sm:col-span-4">
                      <InputArea
                        key={passwordFieldKey}
                        required={true}
                        register={register}
                        label={t("RiderPasswordLabel")}
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        preventAutofillSuggestion
                        placeholder={t("RiderPasswordLabel")}
                        rules={{
                          validate: (value) =>
                            !value ||
                            (value.length >= 8 && /[A-Za-z]/.test(value)) ||
                            t("RiderPasswordHint"),
                        }}
                      />
                      <p className="text-gray-400 text-xs mt-2">{t("RiderPasswordHint")}</p>
                      <Error errorName={errors.password} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderPhoneLabel")} required />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      required={true}
                      register={register}
                      label={t("RiderPhoneLabel")}
                      name="phone"
                      type="text"
                      placeholder={t("RiderPhonePlaceholder")}
                    />
                    <Error errorName={errors.phone} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderAddressLabel")} />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      register={register}
                      label={t("RiderAddressLabel")}
                      name="address"
                      type="text"
                      placeholder={t("RiderAddressLabel")}
                    />
                    <Error errorName={errors.address} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderCityLabel")} />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      register={register}
                      label={t("RiderCityLabel")}
                      name="city"
                      type="text"
                      placeholder={t("RiderCityLabel")}
                    />
                    <Error errorName={errors.city} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderCountryLabel")} />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      register={register}
                      label={t("RiderCountryLabel")}
                      name="country"
                      type="text"
                      placeholder={t("RiderCountryLabel")}
                    />
                    <Error errorName={errors.country} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderVehicleTypeLabel")} />
                  <div className="col-span-8 sm:col-span-4">
                    <select
                      {...register("vehicleType")}
                      defaultValue=""
                      className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                      <option value="" disabled hidden>
                        {t("RiderSelectVehicleType")}
                      </option>
                      <option value="Van">Van</option>
                      <option value="Voiture">Voiture</option>
                      <option value="Vélo">Vélo</option>
                      <option value="Scooter">Scooter</option>
                    </select>
                    <Error errorName={errors.vehicleType} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RiderVehicleNumberLabel")} />
                  <div className="col-span-8 sm:col-span-4">
                    <InputArea
                      register={register}
                      label={t("RiderVehicleNumberLabel")}
                      name="vehicleNumber"
                      type="text"
                      placeholder={t("RiderVehicleNumberLabel")}
                    />
                    <Error errorName={errors.vehicleNumber} />
                  </div>
                </div>

              </div>

              <DrawerButton
                id={id}
                title={t("RiderDrawerButtonTitle")}
                zIndex="z-5"
                isSubmitting={isSubmitting}
                isSubmitDisabled={id ? !isUpdateFormReady : !isAddFormReady}
              />
            </form>
          </CardBody>
        </Card>
      </Scrollbars>
    </>
  );
};

export default RiderDrawer;