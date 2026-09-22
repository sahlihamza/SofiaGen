import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// Internal import
import Title from "@/components/form/others/Title";
import PlanPriceServices from "@/services/PlanPriceServices";
import PlanServices from "@/services/PlanServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";
import { Button } from "@sofia/ui";

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "ZAR", "TND", "EGP"];
const CYCLES = ["monthly", "quarterly", "semi_annual", "yearly", "custom"];
const STATUSES = ["draft", "active", "inactive", "archived"];

const PlanPriceDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: plansData } = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => PlanServices.getAllPlans({ limit: 100, sort: "-createdAt" }),
  });
  const plans = plansData?.data || [];

  const [formData, setFormData] = useState({
    planId: "",
    currency: "USD",
    cycle: "monthly",
    cycleLabel: "",
    cycleDurationDays: "",
    price: "",
    setupFee: 0,
    taxIncluded: false,
    taxRate: 0,
    tiered: { enabled: false, tiers: [] },
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    status: "draft",
    isDefault: false,
    notes: "",
  });

  useEffect(() => {
    if (id) {
      PlanPriceServices.getPlanPriceById(id).then((res) => {
        const p = res.data;
        setFormData({
          planId: p.planId?._id || p.planId || "",
          currency: p.currency || "USD",
          cycle: p.cycle || "monthly",
          cycleLabel: p.cycleLabel || "",
          cycleDurationDays: p.cycleDurationDays ?? "",
          price: p.price ?? "",
          setupFee: p.setupFee ?? 0,
          taxIncluded: p.taxIncluded ?? false,
          taxRate: p.taxRate ?? 0,
          tiered: p.tiered || { enabled: false, tiers: [] },
          effectiveFrom: p.effectiveFrom
            ? new Date(p.effectiveFrom).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          effectiveTo: p.effectiveTo
            ? new Date(p.effectiveTo).toISOString().split("T")[0]
            : "",
          status: p.status || "draft",
          isDefault: p.isDefault ?? false,
          notes: p.notes || "",
        });
      }).catch(() => {});
    } else {
      setFormData((prev) => ({ ...prev, planId: plans[0]?._id || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTierAdd = () => {
    setFormData((prev) => ({
      ...prev,
      tiered: {
        ...prev.tiered,
        enabled: true,
        tiers: [...prev.tiered.tiers, { fromQty: 0, toQty: "", amount: 0 }],
      },
    }));
  };

  const handleTierChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      tiered: {
        ...prev.tiered,
        tiers: prev.tiered.tiers.map((tier, i) =>
          i === index
            ? { ...tier, [field]: field === "amount" ? Number(value) : value }
            : tier
        ),
      },
    }));
  };

  const handleTierRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      tiered: {
        ...prev.tiered,
        tiers: prev.tiered.tiers.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        price: Number(formData.price),
        setupFee: Number(formData.setupFee || 0),
        taxRate: Number(formData.taxRate || 0),
        effectiveFrom: formData.effectiveFrom
          ? new Date(formData.effectiveFrom).toISOString()
          : undefined,
        effectiveTo: formData.effectiveTo
          ? new Date(formData.effectiveTo).toISOString()
          : undefined,
      };
      if (id) {
        await PlanPriceServices.updatePlanPrice(id, payload);
        successMessage("Plan price updated successfully");
      } else {
        await PlanPriceServices.createPlanPrice(payload);
        successMessage("Plan price created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["plan-prices"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save plan price");
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
          title={id ? t("EditPlanPrice") || "Edit Plan Price" : t("AddPlanPrice") || "Add Plan Price"}
          description={
            id
              ? t("UpdatePlanPriceDescription") || "Update plan price information"
              : t("AddPlanPriceDescription") || "Add a new plan price (currency & cycle)"
          }
        />
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form
          onSubmit={handleSubmit}
          className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40"
        >
          <div className="space-y-6">
            {/* Plan */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Plan")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.planId}
                  onChange={(e) => handleChange("planId", e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Select Plan --</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Currency + Cycle */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Currency")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("BillingCycle") || "Billing Cycle"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.cycle}
                  onChange={(e) => handleChange("cycle", e.target.value)}
                  className={inputCls}
                >
                  {CYCLES.map((c) => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.cycle === "custom" && (
              <>
                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                  <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                    {t("CycleLabel") || "Cycle Label"}
                  </label>
                  <div className="col-span-8 sm:col-span-4">
                    <input
                      type="text"
                      value={formData.cycleLabel}
                      onChange={(e) => handleChange("cycleLabel", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Every 45 days"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
                  <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                    {t("CycleDurationDays") || "Cycle Duration (days)"}
                  </label>
                  <div className="col-span-8 sm:col-span-4">
                    <input
                      type="number"
                      min="1"
                      value={formData.cycleDurationDays}
                      onChange={(e) => handleChange("cycleDurationDays", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Price + Setup fee */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Price")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("SetupFee") || "Setup Fee"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.setupFee}
                  onChange={(e) => handleChange("setupFee", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Tax */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("TaxIncluded") || "Tax Included"}
              </label>
              <div className="col-span-8 sm:col-span-4 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={formData.taxIncluded}
                  onChange={(e) => handleChange("taxIncluded", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => handleChange("taxRate", e.target.value)}
                  className={inputCls}
                  placeholder="Tax rate (0-1)"
                />
              </div>
            </div>

            {/* Tiered pricing */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("TieredPricing") || "Tiered Pricing"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="checkbox"
                  checked={formData.tiered.enabled}
                  onChange={(e) =>
                    handleChange("tiered", { ...formData.tiered, enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.tiered.enabled && (
              <div className="col-span-8 sm:col-span-4">
                {formData.tiered.tiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      placeholder="From"
                      value={tier.fromQty}
                      onChange={(e) => handleTierChange(i, "fromQty", Number(e.target.value))}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      placeholder="To (blank=open)"
                      value={tier.toQty}
                      onChange={(e) => handleTierChange(i, "toQty", e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={tier.amount}
                      onChange={(e) => handleTierChange(i, "amount", e.target.value)}
                      className={inputCls}
                    />
                    <Button
                      type="button"
                      onClick={() => handleTierRemove(i)}
                      className="px-2 py-1 text-xs text-red-500 border border-red-300 rounded"
                    >
                      {t("Remove") || "Remove"}
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={handleTierAdd}
                  className="px-3 py-1 text-xs text-blue-600 border border-blue-300 rounded"
                >
                  + {t("AddTier") || "Add Tier"}
                </Button>
              </div>
            )}

            {/* Effective dates */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("EffectiveFrom") || "Effective From"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => handleChange("effectiveFrom", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("EffectiveTo") || "Effective To"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="date"
                  value={formData.effectiveTo}
                  onChange={(e) => handleChange("effectiveTo", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Status + default */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Status")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Default") || "Default"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => handleChange("isDefault", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Notes")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className={inputCls}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button
              type="button"
              onClick={toggleDrawer}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {t("Cancel") || "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting
                ? t("Saving") || "Saving..."
                : id
                ? t("UpdatePlanPrice") || "Update Plan Price"
                : t("AddPlanPrice") || "Add Plan Price"}
            </Button>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default PlanPriceDrawer;
