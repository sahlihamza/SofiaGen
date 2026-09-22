import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useStoreContext } from "@/context/StoreContext";
import GeneralSettingsServices from "@/services/GeneralSettingsServices";
import CountryServices from "@/services/CountryServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useStoreGeneralSettingsSubmit = () => {
  const { currentStoreId } = useStoreContext() || {};
  const [isSave, setIsSave] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState([]);
  const [sellingCountries, setSellingCountries] = useState([]);
  const [shippingCountries, setShippingCountries] = useState([]);
  const [enableTax, setEnableTax] = useState(false);
  const [enableCoupons, setEnableCoupons] = useState(true);
  const [sequentialCoupons, setSequentialCoupons] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
    trigger,
  } = useForm();

  const onSubmit = async (data) => {
    if (!currentStoreId) {
      notifyError("Aucun magasin sélectionné");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        store_name: data.store_name,
        store_tagline: data.store_tagline || "",
        store_address_line1: data.store_address_line1,
        store_address_line2: data.store_address_line2 || "",
        store_city: data.store_city,
        store_state: data.store_state || "",
        countryId: data.countryId,
        store_post_code: data.store_post_code,
        selling_countries: sellingCountries,
        shipping_countries: shippingCountries,
        default_customer_address: data.default_customer_address || "base",
        weight_unit: data.weight_unit || "kg",
        dimension_unit: data.dimension_unit || "cm",
        currencyId: data.currencyId,
        default_time_zone: data.default_time_zone,
        default_date_format: data.default_date_format,
        enable_tax: enableTax,
        enable_coupons: enableCoupons,
        sequential_coupons: sequentialCoupons,
        thousand_separator: data.thousand_separator || ",",
        decimal_separator: data.decimal_separator || ".",
        number_of_decimals: data.number_of_decimals ?? 2,
      };

      const res = await GeneralSettingsServices.updateGeneralSettings(
        currentStoreId,
        payload
      );

      if (res) {
        setIsSave(false);
        notifySuccess("Paramètres généraux mis à jour avec succès");
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [countriesRes, settingsRes] = await Promise.all([
          CountryServices.getAllCountries(),
          currentStoreId
            ? GeneralSettingsServices.getGeneralSettings(currentStoreId)
            : Promise.resolve(null),
        ]);

        if (countriesRes?.data?.countries) {
          setCountries(countriesRes.data.countries);
        }

        if (settingsRes?.data) {
          setIsSave(false);
          const s = settingsRes.data;
          setValue("store_name", s.store_name || "");
          setValue("store_tagline", s.store_tagline || "");
          setValue("store_address_line1", s.store_address_line1 || "");
          setValue("store_address_line2", s.store_address_line2 || "");
          setValue("store_city", s.store_city || "");
          setValue("store_state", s.store_state || "");
          setValue("countryId", s.countryId || "");
          setValue("store_post_code", s.store_post_code || "");
          setValue("default_customer_address", s.default_customer_address || "base");
          setValue("weight_unit", s.weight_unit || "kg");
          setValue("dimension_unit", s.dimension_unit || "cm");
          setValue("currencyId", s.currencyId || "");
          setValue("default_time_zone", s.default_time_zone || "");
          setValue("default_date_format", s.default_date_format || "MMM D, YYYY");
          setValue("thousand_separator", s.thousand_separator || ",");
          setValue("decimal_separator", s.decimal_separator || ".");
          setValue("number_of_decimals", s.number_of_decimals ?? 2);
          setEnableTax(s.enable_tax || false);
          setEnableCoupons(s.enable_coupons ?? true);
          setSequentialCoupons(s.sequential_coupons || false);
          setSellingCountries(s.selling_countries || []);
          setShippingCountries(s.shipping_countries || []);
        }
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();
  }, [currentStoreId, setValue]);

  return {
    isSave,
    isSubmitting,
    register,
    errors,
    watch,
    setValue,
    handleSubmit,
    onSubmit,
    trigger,
    countries,
    sellingCountries,
    setSellingCountries,
    shippingCountries,
    setShippingCountries,
    enableTax,
    setEnableTax,
    enableCoupons,
    setEnableCoupons,
    sequentialCoupons,
    setSequentialCoupons,
  };
};

export default useStoreGeneralSettingsSubmit;
