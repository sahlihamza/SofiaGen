import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { SidebarContext } from "@/context/SidebarContext";
import PaymentRuleServices from "@/services/PaymentRuleServices";
import PaymentProviderServices from "@/services/PaymentProviderServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const usePaymentRuleSubmit = (id) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState([]);
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      paymentProviderId: "",
      countries: "",
      currencies: "",
      planIds: "",
      storeTypes: "",
      clientTypes: "",
      minAmount: "",
      maxAmount: "",
      priority: 0,
      status: "active",
      supportsOneTime: true,
      supportsSubscription: true,
      supportsRefund: true,
    },
  });

  useEffect(() => {
    PaymentProviderServices.getProviders().then((res) => {
      setProviders(res.data || []);
    });
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) {
      reset({
        paymentProviderId: "",
        countries: "",
        currencies: "",
        planIds: "",
        storeTypes: "",
        clientTypes: "",
        minAmount: "",
        maxAmount: "",
        priority: 0,
        status: "active",
        supportsOneTime: true,
        supportsSubscription: true,
        supportsRefund: true,
      });
      return;
    }

    if (id) {
      (async () => {
        try {
          const res = await PaymentRuleServices.getById(id);
          const rule = res?.data || res;
          if (rule) {
            setValue("paymentProviderId", rule.paymentProviderId?._id || rule.paymentProviderId || "");
            setValue("countries", Array.isArray(rule.countries) ? rule.countries.join(", ") : "");
            setValue("currencies", Array.isArray(rule.currencies) ? rule.currencies.join(", ") : "");
            setValue("planIds", Array.isArray(rule.planIds) ? rule.planIds.join(", ") : "");
            setValue("storeTypes", Array.isArray(rule.storeTypes) ? rule.storeTypes.join(", ") : "");
            setValue("clientTypes", Array.isArray(rule.clientTypes) ? rule.clientTypes.join(", ") : "");
            setValue("minAmount", rule.minAmount ?? "");
            setValue("maxAmount", rule.maxAmount ?? "");
            setValue("priority", rule.priority ?? 0);
            setValue("status", rule.status || "active");
            setValue("supportsOneTime", rule.supportsOneTime ?? true);
            setValue("supportsSubscription", rule.supportsSubscription ?? true);
            setValue("supportsRefund", rule.supportsRefund ?? true);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, isDrawerOpen, reset, setValue]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const payload = {
        paymentProviderId: data.paymentProviderId,
        countries: data.countries
          ? data.countries.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        currencies: data.currencies
          ? data.currencies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        planIds: data.planIds
          ? data.planIds.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        storeTypes: data.storeTypes
          ? data.storeTypes.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        clientTypes: data.clientTypes
          ? data.clientTypes.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        minAmount: data.minAmount === "" ? undefined : Number(data.minAmount),
        maxAmount: data.maxAmount === "" ? undefined : Number(data.maxAmount),
        priority: Number(data.priority) || 0,
        supportsOneTime: data.supportsOneTime,
        supportsSubscription: data.supportsSubscription,
        supportsRefund: data.supportsRefund,
        status: data.status,
      };

      if (!payload.paymentProviderId) {
        notifyError("Provider is required");
        setIsSubmitting(false);
        return;
      }

      if (id) {
        const res = await PaymentRuleServices.update(id, payload);
        notifySuccess(res?.message || "Payment rule updated");
      } else {
        const res = await PaymentRuleServices.create(payload);
        notifySuccess(res?.message || "Payment rule created");
      }

      setIsUpdate(true);
      closeDrawer();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    providers,
  };
};

export default usePaymentRuleSubmit;
