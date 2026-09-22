import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import useUtilsFunction from "./useUtilsFunction";
import { SidebarContext } from "@/context/SidebarContext";
import PlatformCouponServices from "@/services/PlatformCouponServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import useTranslationValue from "./useTranslationValue";

const usePlatformCouponSubmit = (id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate, lang } =
    useContext(SidebarContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [published, setPublished] = useState(false);
  const [discountType, setDiscountType] = useState(false);
  const [resData, setResData] = useState({});

  const { currency } = useUtilsFunction();
  const { handlerTextTranslateHandler } = useTranslationValue();

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const platformCouponData = {
        code: data.code,
        title: data.title,
        description: data.description || "",
        discountType: discountType ? "percentage" : "fixed",
        discountValue: Number(data.discountValue),
        applicableTo: "subscription",
        endDate: data.endDate,
        startDate: data.startDate || new Date().toISOString(),
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
        status: published ? "active" : "inactive",
      };

      if (id) {
        const res = await PlatformCouponServices.updateCoupon(id, platformCouponData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      } else {
        const res = await PlatformCouponServices.addCoupon(platformCouponData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
      closeDrawer();
    }
  };

  const handleSelectLanguage = (lang) => {
    if (Object.keys(resData).length > 0) {
      setValue("title", resData.title[lang ? lang : "en"]);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setResData({});
      setValue("code");
      setValue("title");
      setValue("description");
      setValue("discountValue");
      setValue("usageLimit");
      setValue("endDate");
      setValue("startDate");
      setPublished(false);
      setDiscountType(false);
      clearErrors("code");
      clearErrors("title");
      clearErrors("description");
      clearErrors("discountValue");
      clearErrors("usageLimit");
      clearErrors("endDate");
      clearErrors("startDate");
      return;
    }
    if (id) {
      (async () => {
        try {
          const res = await PlatformCouponServices.getCouponById(id);
          if (res) {
            setResData(res);
            setValue("code", res.code);
            setValue("title", res.title);
            setValue("description", res.description || "");
            setValue("discountValue", res.discountValue);
            setValue("usageLimit", res.usageLimit || "");
            setValue("endDate", dayjs(res.endDate).format("YYYY-MM-DD HH:mm"));
            setValue("startDate", dayjs(res.startDate).format("YYYY-MM-DD HH:mm"));
            setPublished(res.status === "active" ? true : false);
            setDiscountType(res.discountType === "percentage" ? true : false);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, setValue, isDrawerOpen, clearErrors, lang]);

  return {
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
  };
};

export default usePlatformCouponSubmit;