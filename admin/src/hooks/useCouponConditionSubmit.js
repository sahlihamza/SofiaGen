import { useContext, useEffect, useState } from "react";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import CouponServices from "@/services/CouponServices";
import ProductServices from "@/services/ProductServices";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import BrandServices from "@/services/BrandServices";
import ProductTagServices from "@/services/ProductTagServices";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const EMPTY_STATE = {
  minSpend: "",
  maxSpend: "",
  includedProducts: [],
  excludedProducts: [],
  includedCategories: [],
  excludedCategories: [],
  includedBrands: [],
  excludedBrands: [],
  includedTags: [],
  excludedTags: [],
  customerGroups: [],
  specificCustomers: [],
  guestOnly: false,
  loggedUserOnly: false,
  countries: [],
  states: [],
  cities: [],
  postalCodes: [],
  minQuantity: "",
  maxQuantity: "",
  minSubtotal: "",
  maxTotalWeight: "",
};

const useCouponConditionSubmit = (id, isActive) => {
  const { isDrawerOpen, setIsUpdate } = useContext(SidebarContext);
  const [form, setForm] = useState(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productOptions, setProductOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Reference lists only need loading once the tab is actually opened.
  useEffect(() => {
    if (!isDrawerOpen || !id || !isActive) return;

    (async () => {
      try {
        const [products, categories, brands, tags, customers] = await Promise.all([
          ProductServices.getAllProducts({ page: 1, limit: 200 }),
          ProductCategoryServices.getAllCategories(),
          BrandServices.getAllBrands({ limit: 200 }),
          ProductTagServices.getAllProductTags({ limit: 200 }),
          CustomerServices.getAllCustomers({}),
        ]);
        setProductOptions(
          (products?.products || []).map((p) => ({ _id: p._id, label: p.productName }))
        );
        setCategoryOptions(
          (categories?.categories || []).map((c) => ({ _id: c._id, label: c.name }))
        );
        setBrandOptions((brands?.brands || []).map((b) => ({ _id: b._id, label: b.name })));
        setTagOptions((tags?.tags || []).map((tg) => ({ _id: tg._id, label: tg.name })));
        setCustomerOptions(
          (Array.isArray(customers) ? customers : []).map((c) => ({
            _id: c._id,
            label: c.name || c.email,
          }))
        );
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();
  }, [id, isDrawerOpen, isActive]);

  // Existing restrictions for this coupon.
  useEffect(() => {
    if (!isDrawerOpen || !id || !isActive) {
      if (!isDrawerOpen) setForm(EMPTY_STATE);
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        const res = await CouponServices.getCouponConditions(id);
        const c = res?.data || {};
        setForm({
          minSpend: c.minSpend ?? "",
          maxSpend: c.maxSpend ?? "",
          includedProducts: c.includedProducts || [],
          excludedProducts: c.excludedProducts || [],
          includedCategories: c.includedCategories || [],
          excludedCategories: c.excludedCategories || [],
          includedBrands: c.includedBrands || [],
          excludedBrands: c.excludedBrands || [],
          includedTags: c.includedTags || [],
          excludedTags: c.excludedTags || [],
          customerGroups: c.customerGroups || [],
          specificCustomers: c.specificCustomers || [],
          guestOnly: !!c.guestOnly,
          loggedUserOnly: !!c.loggedUserOnly,
          countries: c.countries || [],
          states: c.states || [],
          cities: c.cities || [],
          postalCodes: c.postalCodes || [],
          minQuantity: c.minQuantity ?? "",
          maxQuantity: c.maxQuantity ?? "",
          minSubtotal: c.minSubtotal ?? "",
          maxTotalWeight: c.maxTotalWeight ?? "",
        });
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isDrawerOpen, isActive]);

  const numberOrNull = (value) => (value === "" || value === null || value === undefined ? null : Number(value));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsSubmitting(true);
      const res = await CouponServices.updateCouponConditions(id, {
        ...form,
        minSpend: numberOrNull(form.minSpend),
        maxSpend: numberOrNull(form.maxSpend),
        minQuantity: numberOrNull(form.minQuantity),
        maxQuantity: numberOrNull(form.maxQuantity),
        minSubtotal: numberOrNull(form.minSubtotal),
        maxTotalWeight: numberOrNull(form.maxTotalWeight),
      });
      notifySuccess(res.message);
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    setField,
    isLoading,
    isSubmitting,
    handleSubmit,
    productOptions,
    categoryOptions,
    brandOptions,
    tagOptions,
    customerOptions,
  };
};

export default useCouponConditionSubmit;
