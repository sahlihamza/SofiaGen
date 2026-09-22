import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const emptyCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  status: "active",
};

const useCustomerSubmit = (id) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: emptyCustomer });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      // Only the fields the backend whitelists (CustomerService.WRITABLE_FIELDS)
      // are sent: "name" and "address" are silently dropped there, so the split
      // firstName/lastName columns are what actually get written.
      const customerData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        status: data.status || "active",
      };

      // An empty password field on update must not wipe the existing one.
      if (data.password) {
        customerData.password = data.password;
      }

      if (id) {
        const res = await CustomerServices.updateCustomer(id, customerData);
        notifySuccess(res?.message || t("CustomerUpdateSuccess"));
      } else {
        const res = await CustomerServices.createCustomer(customerData);
        notifySuccess(res?.message || t("CustomerAddSuccess"));

        // The customer is created either way  only the mail carrying their
        // login details failed, which the admin needs to know about.
        if (customerData.password && res?.emailSent === false) {
          notifyError(t("CustomerEmailNotSent"));
        }
      }

      setIsUpdate(true);
      closeDrawer();
    } catch (err) {
      // The drawer stays open on failure (duplicate email, invalid format...)
      // so the entered values can be corrected instead of being lost.
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // The drawer stays mounted between opens (only its visibility toggles), so
    // the form would otherwise keep the previous customer's values. Re-sync
    // every time it actually opens.
    if (!isDrawerOpen) return;

    if (!id) {
      reset(emptyCustomer);
      return;
    }

    (async () => {
      try {
        const customer = await CustomerServices.getCustomerById(id);
        if (customer) {
          reset({
            firstName: customer.firstName || "",
            lastName: customer.lastName || "",
            email: customer.email || "",
            phone: customer.phone || "",
            password: "",
            status: customer.status || "active",
          });
        }
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isDrawerOpen]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
  };
};

export default useCustomerSubmit;
