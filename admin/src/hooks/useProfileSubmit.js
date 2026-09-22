import Cookies from "js-cookie";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

//internal import
import { AdminContext } from "@/context/AdminContext";
import UserServices from "@/services/UserServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useProfileSubmit = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useContext(AdminContext);
  const { adminInfo } = state;

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm();

  const persistAdminInfo = (partialData) => {
    const merged = { ...adminInfo, ...partialData };
    dispatch({ type: "USER_LOGIN", payload: merged });
    Cookies.set("adminInfo", JSON.stringify(merged), {
      expires: 0.5,
      sameSite: window.location.protocol === "https:" ? "None" : "Lax",
      secure: window.location.protocol === "https:",
    });
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await UserServices.getProfile();
      const profile = res?.data;

      if (profile) {
        setValue("name", profile.name || "");
        setValue("phone", profile.phone || "");
        setValue("address", profile.address || "");
        setValue("gender", profile.gender || "");
        setImageUrl(profile.image || "");
        persistAdminInfo(profile);
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const res = await UserServices.updateProfile({
        name: data.name,
        phone: data.phone,
        address: data.address,
        gender: data.gender,
        image: imageUrl,
      });

      persistAdminInfo(res?.data);
      notifySuccess(t("ProfileUpdateSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitPassword = async (data) => {
    try {
      setIsChangingPassword(true);

      await UserServices.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      notifySuccess(t("PasswordChangeSuccess"));
      resetPasswordForm();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    loading,
    isSubmitting,
    imageUrl,
    setImageUrl,
    registerPassword,
    handleSubmitPassword,
    onSubmitPassword,
    passwordErrors,
    watchPassword,
    isChangingPassword,
  };
};

export default useProfileSubmit;
