import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import AttributeServices from "@/services/AttributeServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import useToggleDrawer from "@/hooks/useToggleDrawer";

const useAttributeSubmit = (id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);
  const [isVariation, setIsVariation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setServiceId } = useToggleDrawer();

  const {
    handleSubmit,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({
    name,
    slug,
    description,
    type,
    displayType,
    status,
  }) => {
    try {
      setIsSubmitting(true);

      const attributeData = {
        name,
        // The user fills the slug; when left empty the backend auto-generates
        // it from the name.
        slug: slug?.trim() || "",
        description: description || "",
        type: type || "select",
        displayType: displayType || "select",
        isVariation: Boolean(isVariation),
        status: status || "active",
      };

      if (id) {
        const res = await AttributeServices.updateAttribute(id, attributeData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res?.message || "Attribute updated successfully!");
        closeDrawer();
        setServiceId();
      } else {
        const res = await AttributeServices.addAttribute(attributeData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res?.message || "Attribute added successfully!");
        closeDrawer();
        setServiceId();
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
      setServiceId();
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setValue("name", "");
      setValue("slug", "");
      setValue("description", "");
      setValue("type", "select");
      setValue("displayType", "select");
      setValue("status", "active");
      clearErrors("name");
      clearErrors("slug");
      clearErrors("description");
      setIsVariation(false);
      return;
    }

    if (id) {
      (async () => {
        try {
          const res = await AttributeServices.getAttributeById(id);
          if (res) {
            setValue("name", res.name || "");
            setValue("slug", res.slug || "");
            setValue("description", res.description || "");
            setValue("type", res.type || "select");
            setValue("displayType", res.displayType || "select");
            setValue("status", res.status || "active");
            setIsVariation(Boolean(res.isVariation));
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, isDrawerOpen, setValue, clearErrors]);

  return {
    handleSubmit,
    onSubmit,
    register,
    errors,
    isVariation,
    setIsVariation,
    isSubmitting,
  };
};

export default useAttributeSubmit;
