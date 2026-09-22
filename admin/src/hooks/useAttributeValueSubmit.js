import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import AttributeValueServices from "@/services/AttributeValueServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// Handles adding / editing a single AttributeValue (a "term") that belongs to
// the attribute identified by `attributeId`. `id` is set when editing.
const useAttributeValueSubmit = (attributeId, id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ label, slug, value, color, sortOrder }) => {
    try {
      setIsSubmitting(true);

      const valueData = {
        attributeId,
        label,
        // The user may fill the slug; the backend auto-generates it from the
        // label when left empty.
        slug: slug?.trim() || "",
        value: value || "",
        color: color || null,
        image: imageUrl || null,
        sortOrder: Number(sortOrder) || 0,
      };

      if (id) {
        const res = await AttributeValueServices.updateValue(id, valueData);
        setIsUpdate(true);
        notifySuccess(res?.message || "Attribute value updated successfully!");
      } else {
        await AttributeValueServices.addValue(valueData);
        setIsUpdate(true);
        notifySuccess("Attribute value added successfully!");
      }

      setIsSubmitting(false);
      closeDrawer();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setValue("label", "");
      setValue("slug", "");
      setValue("value", "");
      setValue("color", "");
      setValue("sortOrder", 0);
      setImageUrl("");
      clearErrors("label");
      clearErrors("slug");
      return;
    }

    if (id) {
      (async () => {
        try {
          const res = await AttributeValueServices.getValueById(id);
          if (res) {
            setValue("label", res.label || "");
            setValue("slug", res.slug || "");
            setValue("value", res.value || "");
            setValue("color", res.color || "");
            setValue("sortOrder", res.sortOrder || 0);
            setImageUrl(res.image || "");
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
    imageUrl,
    setImageUrl,
    isSubmitting,
  };
};

export default useAttributeValueSubmit;
