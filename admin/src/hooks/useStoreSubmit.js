import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { SidebarContext } from "@/context/SidebarContext";
import StoreServices from "@/services/StoreServices";
import { notifySuccess, notifyError } from "@/utils/toast";

const useStoreSubmit = (id) => {
  const { toggleDrawer, isUpdate, setIsUpdate } = useContext(SidebarContext);

  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      address: "",
      currency: "TND",
      country: "",
      language: "",
      timezone: "",
      plan: "",
      planId: "",
      planName: "",
      planSlug: "",
      category: "",
      subdomain: "",
      customDomain: "",
      slug: "",
      ownerFirstName: "",
      ownerLastName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerPassword: "",
      ownerLanguage: "en",
      ownerAddress: "",
      ownerName: "",
      billingCycle: "monthly",
      paymentGateway: "manual",
      couponCode: "",
    },
  });

  const watchedName = watch("name", "");

  useEffect(() => {
    if (id) {
      StoreServices.getStoreById(id).then((store) => {
        if (store) {
          setValue("name", store.name || "");
          setValue("address", store.address || "");
          setValue("currency", store.currency || "TND");
          setValue("country", store.country || "");
          setValue("language", store.language || "");
          setValue("timezone", store.timezone || "");
          setValue("plan", store.planSlug || store.plan || "");
        setValue("planId", store.planId || "");
        setValue("planName", store.planName || "");
        setValue("planSlug", store.planSlug || "");
        setValue("category", store.category || "");
        setValue("subdomain", store.subdomain || "");
        setValue("customDomain", store.customDomain || "");
        setValue("slug", store.slug || "");
          setImageUrl(store.logo || "");
          setIsActive(store.isActive ?? true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const storeData = {
        name: data.name,
        address: data.address,
        currency: data.currency,
        country: data.country,
        language: data.language,
        timezone: data.timezone,
        plan: data.plan,
        planId: data.planId,
        planName: data.planName,
        planSlug: data.planSlug,
        category: data.category,
        subdomain: data.subdomain,
        customDomain: data.customDomain,
        slug: data.slug,
        logo: imageUrl,
        isActive,
        theme: data.theme,
        billingCycle: data.billingCycle,
        paymentGateway: data.paymentGateway,
        couponCode: data.couponCode,
      };

      if (data.ownerEmail || data.ownerName || data.ownerFirstName) {
        storeData.ownerEmail = data.ownerEmail;
        storeData.ownerName = data.ownerName || `${data.ownerFirstName || ""} ${data.ownerLastName || ""}`.trim();
        storeData.ownerFirstName = data.ownerFirstName;
        storeData.ownerLastName = data.ownerLastName;
        storeData.ownerPhone = data.ownerPhone;
        storeData.ownerAddress = data.ownerAddress;
        storeData.ownerPassword = data.ownerPassword;
        storeData.ownerLanguage = data.ownerLanguage;
      }

      let result;
      if (id) {
        result = await StoreServices.updateStore(id, storeData);
      } else {
        result = await StoreServices.addStore(storeData);
      }

      setIsUpdate(!isUpdate);
      return result;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Something went wrong!";

      if (message.toLowerCase().includes("already exists")) {
        setError("name", { type: "manual", message });
      }

      notifyError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNameValid = watchedName?.trim()?.length >= 2;

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    imageUrl,
    setImageUrl,
    isActive,
    setIsActive,
    isSubmitting,
    setIsSubmitting,
    isNameValid,
    watch,
    setValue,
    setError,
  };
};

export default useStoreSubmit;