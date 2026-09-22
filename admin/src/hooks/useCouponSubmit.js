import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import CouponServices from "@/services/CouponServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const DEFAULT_VALUES = {
  code: "",
  description: "",
  discountType: "percentage",
  amount: "",
  status: "active",
  startDate: "",
  endDate: "",
  priority: 0,
  usageLimit: "",
  usageLimitPerCustomer: "",
};

const toDateInputValue = (value) => (value ? value.substring(0, 10) : "");

const useCouponSubmit = (id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);
  const [allowFreeShipping, setAllowFreeShipping] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [stackable, setStackable] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: DEFAULT_VALUES });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const couponData = {
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        amount: Number(data.amount),
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        priority: data.priority === "" ? 0 : Number(data.priority),
        usageLimit: data.usageLimit === "" ? null : Number(data.usageLimit),
        usageLimitPerCustomer:
          data.usageLimitPerCustomer === "" ? null : Number(data.usageLimitPerCustomer),
        allowFreeShipping,
        autoApply,
        stackable,
        isPublic,
      };

      if (id) {
        const res = await CouponServices.updateCoupon(id, couponData);
        notifySuccess(res.message);
      } else {
        const res = await CouponServices.addCoupon(couponData);
        notifySuccess(res.message);
      }
      setIsUpdate(true);
      setIsSubmitting(false);
      closeDrawer();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      reset(DEFAULT_VALUES);
      setAllowFreeShipping(false);
      setAutoApply(false);
      setStackable(false);
      setIsPublic(true);
      return;
    }
    if (id) {
      (async () => {
        try {
          const res = await CouponServices.getCouponById(id);
          const coupon = res?.data;
          if (coupon) {
            reset({
              code: coupon.code,
              description: coupon.description || "",
              discountType: coupon.discountType,
              amount: coupon.amount,
              status: coupon.status,
              startDate: toDateInputValue(coupon.startDate),
              endDate: toDateInputValue(coupon.endDate),
              priority: coupon.priority ?? 0,
              usageLimit: coupon.usageLimit ?? "",
              usageLimitPerCustomer: coupon.usageLimitPerCustomer ?? "",
            });
            setAllowFreeShipping(!!coupon.allowFreeShipping);
            setAutoApply(!!coupon.autoApply);
            setStackable(!!coupon.stackable);
            setIsPublic(coupon.isPublic !== false);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [id, isDrawerOpen, reset]);

  return {
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
  };
};

export default useCouponSubmit;
