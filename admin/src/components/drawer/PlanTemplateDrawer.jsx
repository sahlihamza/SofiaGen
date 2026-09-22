import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { SecondaryButton, PrimaryButton, IconButton } from "@sofia/ui";

import Title from "@/components/form/others/Title";
import PlanTemplateServices from "@/services/PlanTemplateServices";
import FeatureServices from "@/services/FeatureServices";
import QuotaTypeServices from "@/services/QuotaTypeServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";

const STATUSES = ["active", "inactive", "archived"];
const VISIBILITIES = ["public", "private", "internal"];
const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "ZAR", "TND", "EGP"];

const PlanTemplateDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [features, setFeatures] = useState([]);
  const [quotaTypes, setQuotaTypes] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    badge: "",
    color: "#3B82F6",
    icon: "",
    pricing: { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false, trialDays: 0 },
    features: [],
    quotas: [],
    status: "active",
    isDefault: false,
    displayOrder: 0,
    visibility: "public",
    notes: "",
  });

  // Load available features & quota types for the builders
  useEffect(() => {
    FeatureServices.getAllFeatures({ limit: 200 })
      .then((res) => setFeatures(res?.data || []))
      .catch(() => {});
    QuotaTypeServices.getAllQuotaTypes({ limit: 200 })
      .then((res) => setQuotaTypes(res?.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      PlanTemplateServices.getPlanTemplate(id).then((res) => {
        const g = res.data;
        setFormData({
          name: g.name || "",
          slug: g.slug || "",
          description: g.description || "",
          badge: g.badge || "",
          color: g.color || "#3B82F6",
          icon: g.icon || "",
          pricing: g.pricing || { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false, trialDays: 0 },
          features: g.features || [],
          quotas: g.quotas || [],
          status: g.status || "active",
          isDefault: g.isDefault || false,
          displayOrder: g.displayOrder ?? 0,
          visibility: g.visibility || "public",
          notes: g.notes || "",
        });
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePricingChange = (field, value) => {
    setFormData((prev) => ({ ...prev, pricing: { ...prev.pricing, [field]: value } }));
  };

  // Feature blueprint helpers
  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, { code: "", enabled: true, limit: null }],
    }));
  };
  const updateFeature = (idx, field, value) => {
    setFormData((prev) => {
      const features = [...prev.features];
      features[idx] = { ...features[idx], [field]: value };
      return { ...prev, features };
    });
  };
  const removeFeature = (idx) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  // Quota blueprint helpers
  const addQuota = () => {
    setFormData((prev) => ({
      ...prev,
      quotas: [...prev.quotas, { quotaTypeCode: "", limitValue: null, isUnlimited: false }],
    }));
  };
  const updateQuota = (idx, field, value) => {
    setFormData((prev) => {
      const quotas = [...prev.quotas];
      quotas[idx] = { ...quotas[idx], [field]: value };
      return { ...prev, quotas };
    });
  };
  const removeQuota = (idx) => {
    setFormData((prev) => ({
      ...prev,
      quotas: prev.quotas.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        slug: formData.slug.toLowerCase().trim(),
        displayOrder: Number(formData.displayOrder || 0),
        pricing: {
          ...formData.pricing,
          monthly: Number(formData.pricing.monthly || 0),
          yearly: Number(formData.pricing.yearly || 0),
          trialDays: Number(formData.pricing.trialDays || 0),
        },
      };
      if (id) {
        await PlanTemplateServices.updatePlanTemplate(id, payload);
        successMessage("Plan template updated successfully");
      } else {
        await PlanTemplateServices.createPlanTemplate(payload);
        successMessage("Plan template created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["plan-templates"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save plan template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditPlanTemplate") || "Edit Plan Template" : t("AddPlanTemplate") || "Add Plan Template"}
          description={
            id
              ? t("UpdatePlanTemplateDescription") || "Update plan template blueprint"
              : t("AddPlanTemplateDescription") || "Create a reusable plan template (Starter, Professional, Business, Enterprise)"
          }
        />
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit} className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <div className="space-y-6">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Name")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} className={inputCls} placeholder="Starter" />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Slug")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="text" value={formData.slug} disabled={!!id} onChange={(e) => handleChange("slug", e.target.value)} className={inputCls} placeholder="starter" />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Description")}</label>
              <div className="col-span-8 sm:col-span-4">
                <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} className={inputCls} rows={2} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Badge")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="text" value={formData.badge} onChange={(e) => handleChange("badge", e.target.value)} className={inputCls} placeholder="Most Popular" />
              </div>
            </div>

            {/* Pricing */}
            <div className="border rounded-md p-4 dark:border-gray-600">
              <p className="font-semibold text-sm mb-3">{t("Pricing") || "Pricing"}</p>
              <div className="grid grid-cols-6 gap-3">
                <label className="col-span-2 font-medium text-sm">Monthly</label>
                <div className="col-span-4">
                  <input type="number" min="0" step="0.01" value={formData.pricing.monthly} onChange={(e) => handlePricingChange("monthly", e.target.value)} className={inputCls} />
                </div>
                <label className="col-span-2 font-medium text-sm">Yearly</label>
                <div className="col-span-4">
                  <input type="number" min="0" step="0.01" value={formData.pricing.yearly} onChange={(e) => handlePricingChange("yearly", e.target.value)} className={inputCls} />
                </div>
                <label className="col-span-2 font-medium text-sm">{t("Currency")}</label>
                <div className="col-span-4">
                  <select value={formData.pricing.currency} onChange={(e) => handlePricingChange("currency", e.target.value)} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <label className="col-span-2 font-medium text-sm">{t("TrialDays") || "Trial Days"}</label>
                <div className="col-span-4">
                  <input type="number" min="0" value={formData.pricing.trialDays} onChange={(e) => handlePricingChange("trialDays", e.target.value)} className={inputCls} />
                </div>
                <label className="col-span-2 font-medium text-sm">{t("TaxIncluded") || "Tax Included"}</label>
                <div className="col-span-4 flex items-center">
                  <input type="checkbox" checked={formData.pricing.taxIncluded} onChange={(e) => handlePricingChange("taxIncluded", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Feature blueprint */}
            <div className="border rounded-md p-4 dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">{t("Features") || "Features"}</p>
                <PrimaryButton type="button" size="sm" onClick={addFeature} className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700">
                  <FiPlus /> {t("AddFeature") || "Add Feature"}
                </PrimaryButton>
              </div>
              {formData.features.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No features added yet.</p>
              )}
              <div className="space-y-2">
                {formData.features.map((f, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select value={f.code} onChange={(e) => updateFeature(idx, "code", e.target.value)} className={inputCls}>
                        <option value="">Select feature...</option>
                        {features.map((feat) => (
                          <option key={feat._id} value={feat.code}>{feat.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <input type="checkbox" checked={f.enabled} onChange={(e) => updateFeature(idx, "enabled", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-1 text-xs">enabled</span>
                    </div>
                    <div className="col-span-4">
                      <input type="number" min="0" placeholder="limit (optional)" value={f.limit ?? ""} onChange={(e) => updateFeature(idx, "limit", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <IconButton type="button" variant="ghost" size="sm" iconOnly onClick={() => removeFeature(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30">
                        <FiTrash2 />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quota blueprint */}
            <div className="border rounded-md p-4 dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">{t("Quotas") || "Quotas"}</p>
                <PrimaryButton type="button" size="sm" onClick={addQuota} className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700">
                  <FiPlus /> {t("AddQuota") || "Add Quota"}
                </PrimaryButton>
              </div>
              {formData.quotas.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No quotas added yet.</p>
              )}
              <div className="space-y-2">
                {formData.quotas.map((q, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select value={q.quotaTypeCode} onChange={(e) => updateQuota(idx, "quotaTypeCode", e.target.value)} className={inputCls}>
                        <option value="">Select quota...</option>
                        {quotaTypes.map((qt) => (
                          <option key={qt._id} value={qt.code}>{qt.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <input type="checkbox" checked={q.isUnlimited} onChange={(e) => updateQuota(idx, "isUnlimited", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-1 text-xs">unlimited</span>
                    </div>
                    <div className="col-span-4">
                      <input type="number" min="0" placeholder="limit" disabled={q.isUnlimited} value={q.limitValue ?? ""} onChange={(e) => updateQuota(idx, "limitValue", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <IconButton type="button" variant="ghost" size="sm" iconOnly onClick={() => removeQuota(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30">
                        <FiTrash2 />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Status")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select value={formData.status} onChange={(e) => handleChange("status", e.target.value)} className={inputCls}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Visibility")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select value={formData.visibility} onChange={(e) => handleChange("visibility", e.target.value)} className={inputCls}>
                  {VISIBILITIES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("DisplayOrder") || "Display Order"}</label>
              <div className="col-span-8 sm:col-span-4">
                <input type="number" min="0" value={formData.displayOrder} onChange={(e) => handleChange("displayOrder", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Default") || "Is Default"}</label>
              <div className="col-span-8 sm:col-span-4 flex items-center">
                <input type="checkbox" checked={formData.isDefault} onChange={(e) => handleChange("isDefault", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Notes")}</label>
              <div className="col-span-8 sm:col-span-4">
                <textarea value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} className={inputCls} rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <SecondaryButton type="button" onClick={toggleDrawer} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
              {t("Cancel") || "Cancel"}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting} loading={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {id ? t("Update") || "Update" : t("Add") || "Add"}
            </PrimaryButton>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default PlanTemplateDrawer;
