import React, { useContext, useState } from "react";
import { Input } from "@windmill/react-ui";

import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff } from "react-icons/fi";

//internal import
import { AdminContext } from "@/context/AdminContext";
import useProfileSubmit from "@/hooks/useProfileSubmit";
import PageTitle from "@/components/common/PageTitle";
import LabelArea from "@/components/form/selectOption/LabelArea";
import SelectGender from "@/components/form/selectOption/SelectGender";
import Uploader from "@/components/image-uploader/Uploader";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";
import AnimatedContent from "@/components/common/AnimatedContent";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const EditProfile = () => {
  const { t } = useTranslation();
  const {
    state: { adminInfo },
  } = useContext(AdminContext);

  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    imageUrl,
    setImageUrl,
    registerPassword,
    handleSubmitPassword,
    onSubmitPassword,
    passwordErrors,
    watchPassword,
    isChangingPassword,
  } = useProfileSubmit();

  const newPasswordValue = watchPassword("newPassword");

  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [pendingPasswordData, setPendingPasswordData] = useState(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleProfileFormSubmit = async (data) => {
    await onSubmit(data);
  };

  const handlePasswordFormSubmit = (data) => {
    setPendingPasswordData(data);
    setIsPasswordConfirmOpen(true);
  };

  const handleConfirmPasswordChange = async () => {
    await onSubmitPassword(pendingPasswordData);
    setIsPasswordConfirmOpen(false);
  };

  return (
    <>
      <PageTitle> {t("EditProfile")} </PageTitle>

      <ConfirmActionModal
        isOpen={isPasswordConfirmOpen}
        onClose={() => setIsPasswordConfirmOpen(false)}
        onConfirm={handleConfirmPasswordChange}
        isSubmitting={isChangingPassword}
        title={t("PasswordChangeConfirmTitle")}
        message={t("PasswordChangeConfirmMessage")}
        confirmLabel={t("PasswordChangeConfirmButton")}
      />

      <AnimatedContent>
        <div className="min-h-[calc(100vh-4rem)] dark:bg-slate-950/80 py-4">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
           

            <div className="grid gap-6 lg:grid-cols-12 mt-5 mb-6">
              <section className="lg:col-span-8 space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {t("ProfileInfoSection")}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {t("ProfileInfoDescription") || t("UpdateYourAccountInformation")}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(handleProfileFormSubmit)} className="space-y-8">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <LabelArea label={t("ProfilePicture")} />
                      <div className="mt-3 flex justify-center rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <Uploader
                          imageUrl={imageUrl}
                          setImageUrl={setImageUrl}
                          folder="admin"
                          alt="profile"
                          targetWidth={238}
                          targetHeight={238}
                          profile={true}
                        />
                      </div>
                    </div>

                    <div>
                      <LabelArea label={t("ProfileName")} required />
                      <InputArea
                        required={true}
                        register={register}
                        label="Name"
                        name="name"
                        type="text"
                        placeholder={t("ProfileNamePlaceholder") || "Your Name"}
                      />
                      <Error errorName={errors.name} />
                    </div>

                    <div>
                      <LabelArea label={t("ProfileEmail")} />
                      <Input
                        disabled
                        type="text"
                        value={adminInfo?.email || ""}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-slate-900 dark:border-gray-700 dark:bg-gray-700 dark:text-slate-100"
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {t("ProfileEmailNotEditable")}
                      </p>
                    </div>

                    <div>
                      <LabelArea label={t("ProfileContactNumber")} />
                      <InputArea
                        register={register}
                        label="Contact Number"
                        name="phone"
                        type="text"
                        rules={{
                          pattern: {
                            value: /^\d{8}$/,
                            message: t("PhoneRulesMessage"),
                          },
                        }}
                        placeholder={t("ProfilePhonePlaceholder") || "Contact Number"}
                      />
                      <Error errorName={errors.phone} />
                    </div>

                    <div>
                      <LabelArea label={t("ProfileAddress")} />
                      <InputArea
                        register={register}
                        label="Address"
                        name="address"
                        type="text"
                        placeholder={t("ProfileAddressPlaceholder") || "Address"}
                      />
                      <Error errorName={errors.address} />
                    </div>

                    <div>
                      <LabelArea label={t("ProfileGender")} />
                      <SelectGender register={register} name="gender" required={false} />
                      <Error errorName={errors.gender} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button disabled={isSubmitting} type="submit" className="h-12 rounded-2xl px-6">
                      {isSubmitting ? t("Saving") : t("updateProfile")}
                    </Button>
                  </div>
                </form>
              </div>
            </section>

            <aside className="lg:col-span-4 space-y-6">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-gray-900">
                <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {t("ChangePasswordSection")}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {t("PasswordSectionDescription") || t("SecureYourAccountWithAHiddenPassword" )}
                  </p>
                </div>

                <form onSubmit={handleSubmitPassword(handlePasswordFormSubmit)} className="space-y-5">
                  <div>
                    <LabelArea label={t("CurrentPassword")} required />
                    <div className="relative mt-2">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={t("CurrentPassword")}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 py-2 text-slate-900 dark:border-gray-700 dark:bg-gray-700 dark:text-slate-100"
                        {...registerPassword("currentPassword", {
                          required: t("CurrentPasswordRequired"),
                        })}
                      />
                      <IconButton
                        icon={showCurrentPassword ? "eye-off" : "eye"}
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-300"
                        tabIndex={-1}
                      />
                    </div>
                    <Error errorName={passwordErrors.currentPassword} />
                  </div>

                  <div>
                    <LabelArea label={t("NewPassword")} required />
                    <div className="relative mt-2">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("NewPassword")}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 py-2 text-slate-900 dark:border-gray-700 dark:bg-gray-700 dark:text-slate-100"
                        {...registerPassword("newPassword", {
                          required: t("NewPasswordRequired"),
                          pattern: {
                            value: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
                            message: t("PasswordRulesMessage"),
                          },
                        })}
                      />
                      <IconButton
                        icon={showNewPassword ? "eye-off" : "eye"}
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-300"
                        tabIndex={-1}
                      />
                    </div>
                    <Error errorName={passwordErrors.newPassword} />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t("PasswordRulesMessage")}
                    </p>
                  </div>

                  <div>
                    <LabelArea label={t("ConfirmNewPassword")} required />
                    <div className="relative mt-2">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("ConfirmNewPassword")}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 py-2 text-slate-900 dark:border-gray-700 dark:bg-gray-700 dark:text-slate-100"
                        {...registerPassword("confirmPassword", {
                          required: t("ConfirmPasswordRequired"),
                          validate: (value) =>
                            value === newPasswordValue || t("PasswordsDoNotMatch"),
                        })}
                      />
                      <IconButton
                        icon={showConfirmPassword ? "eye-off" : "eye"}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-300"
                        tabIndex={-1}
                      />

                    </div>
                    <Error errorName={passwordErrors.confirmPassword} />
                  </div>

                  <Button
                    disabled={isChangingPassword}
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {isChangingPassword ? t("Saving") : t("ChangePasswordBtn")}
                  </Button>
                </form>
              </div>

              <div className="rounded-[32px] border border-primary-fixed/20 bg-primary-fixed/10 p-5 shadow-sm dark:border-primary-fixed/30 dark:bg-slate-950">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified_user
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                      {t("TwoFactorAuthentication") || t("TwoFactorAuthenticationTitle")}
                    </h4>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {t("TwoFactorAuthenticationDescription") || t("EnableTwoFactorAuthenticationForExtraSecurity")}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      </AnimatedContent>
    </>
  );
};

export default EditProfile;
