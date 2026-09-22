import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { SidebarContext } from "@/context/SidebarContext";
import RiderServices from "@/services/RiderServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { getRiderImageUrl } from "@/utils/getRiderImageUrl";

const useRiderSubmit = (id) => {
  const { t } = useTranslation();
  const { toggleDrawer, isDrawerOpen, setIsUpdate } = useContext(SidebarContext);

  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Bumped every time the drawer opens so the password <Input> fully remounts
  // (see passwordFieldKey usage below): once a browser removes its readOnly
  // guard on focus, that change sticks on the DOM node forever since the
  // drawer itself never unmounts. Remounting is the only reliable way to
  // re-arm the anti-autofill-suggestion trick on each open.
  const [passwordFieldKey, setPasswordFieldKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ mode: "onBlur", reValidateMode: "onChange" });

  const nameValue = watch("name");
  const emailValue = watch("email");
  const passwordValue = watch("password");
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    // The drawer stays mounted between opens (only its visibility toggles), so
    // this form's state (values, touched fields, errors) would otherwise leak
    // across opens. Re-sync fresh every time the drawer actually opens.
    if (!isDrawerOpen) return;

    setPasswordFieldKey((k) => k + 1);

    if (id) {
      (async () => {
        try {
          const res = await RiderServices.getRiderById(id);
          const rider = res?.data;
          if (rider) {
            reset({
              name: rider.name,
              email: rider.email,
              phone: rider.phone,
              address: rider.address,
              city: rider.city,
              country: rider.country,
              vehicleType: rider.vehicleType,
              vehicleNumber: rider.vehicleNumber,
            });
            setImageUrl(getRiderImageUrl(rider.image));
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        vehicleType: "",
        vehicleNumber: "",
      });
      setImageUrl("");
    }
  }, [id, isDrawerOpen]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const body = {
        ...data,
        image: imageUrl,
      };

      if (id) {
        await RiderServices.updateRider(id, body);
        notifySuccess(t("RiderUpdateSuccess"));
      } else {
        await RiderServices.addRider(body);
        notifySuccess(t("RiderAddSuccess"));
      }

      setIsUpdate(true);
      toggleDrawer();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAddFormReady = !!nameValue && !!emailValue && !!passwordValue && !hasErrors;
  const isUpdateFormReady = !!nameValue && !!emailValue && !hasErrors;

  return {
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
  };
};

export default useRiderSubmit;