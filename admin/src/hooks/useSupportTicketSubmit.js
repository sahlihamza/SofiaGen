import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import SupportTicketServices from "@/services/SupportTicketServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const DEFAULT_VALUES = {
  subject: "",
  description: "",
  categoryId: "",
  priority: "normal",
};

const useSupportTicketSubmit = () => {
  const { t } = useTranslation();
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);
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

      const ticketData = {
        subject: data.subject,
        description: data.description,
        categoryId: data.categoryId || null,
        priority: data.priority,
      };

      const res = await SupportTicketServices.createTicket(ticketData);
      notifySuccess(
        t("SupportTicketCreateSuccess", { ticketNumber: res?.data?.ticketNumber })
      );
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
    }
  }, [isDrawerOpen, reset]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
  };
};

export default useSupportTicketSubmit;
