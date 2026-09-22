import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiX, FiTag, FiClock, FiRefreshCw } from "react-icons/fi";
import Error from "@/components/form/others/Error";
import requests from "@/services/httpService";
import { Button } from "@sofia/ui";

const SectionCard = ({ icon: Icon, title, subtitle, children, className = "" }) => (
  <section className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
    <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      {Icon && (
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Icon size={17} />
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
    <div className="px-5 py-5">{children}</div>
  </section>
);

const BillingCycleToggle = ({ billingCycle, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-1">
      <Button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
          billingCycle === "monthly"
            ? "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
      >
        {t("Monthly") || "Monthly"}
      </Button>
      <Button
        type="button"
        onClick={() => onChange("yearly")}
        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
          billingCycle === "yearly"
            ? "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
      >
        {t("Yearly") || "Yearly"}
      </Button>
    </div>
  );
};

const PlanSelectionStep = ({
  formData,
  onDataChange,
  plans = [],
  isPlansLoading = false,
}) => {
  const { t } = useTranslation();
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const selectedPlan = plans.find(
    (p) => (p.slug || p.name) === formData.plan || p._id === formData.planId
  );

  const effectivePrice =
    formData.billingCycle === "yearly"
      ? selectedPlan?.pricing?.yearly
      : selectedPlan?.pricing?.monthly;

  const currency = selectedPlan?.pricing?.currency || "USD";
  const trialDays = selectedPlan?.pricing?.trialDays || 0;

  const handlePlanSelect = (plan) => {
    onDataChange({
      plan: plan.slug || plan.name || "",
      planId: plan._id || "",
      planName: plan.name || "",
      planSlug: plan.slug || "",
    });
  };

  const handleBillingCycleChange = (cycle) => {
    onDataChange({ billingCycle: cycle });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const result = await requests.post("/coupon/validate", { code: couponCode.toUpperCase() });
      if (result?.success) {
        setCouponStatus({ type: "success", message: result.message || "Coupon applied" });
        onDataChange({ couponCode: couponCode.toUpperCase(), discount: result.data });
      } else {
        setCouponStatus({ type: "error", message: result.message || "Invalid coupon" });
      }
    } catch {
      setCouponStatus({ type: "error", message: "Failed to validate coupon" });
    } finally {
      setCheckingCoupon(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <SectionCard
        icon={FiRefreshCw}
        title={t("SelectPlan") || "Select Plan"}
        subtitle={t("SelectPlanDesc") || "Choose the subscription plan that fits your business."}
      >
        {isPlansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="min-h-[140px] animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40"
              />
            ))}
          </div>
        ) : (() => {
          const fallbackPlan = {
            _id: "fallback-starter",
            name: "Starter",
            slug: "starter",
            description: "Default plan for new stores",
            isDefault: true,
            pricing: { monthly: 0, yearly: 0, currency: "USD", trialDays: 0 },
          };
          const effectivePlans = plans.length > 0 ? plans : [fallbackPlan];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {effectivePlans.map((plan) => {
                const planValue = plan.slug || plan.name || "";
                const isSelected =
                  formData.plan === planValue ||
                  formData.plan === plan.name ||
                  formData.planSlug === plan.slug;

                const monthly = plan.pricing?.monthly;
                const yearly = plan.pricing?.yearly;
                const currentPrice =
                  formData.billingCycle === "yearly" ? yearly : monthly;

                const currency = plan.pricing?.currency || "USD";
                const trialDays = plan.pricing?.trialDays || 0;

                return (
                  <label
                    key={plan._id || planValue}
                    className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-sm"
                        : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={planValue}
                      checked={isSelected}
                      onChange={() => handlePlanSelect(plan)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          isSelected
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {plan.name}
                      </span>
                      {plan.isDefault && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {t("DefaultLabel") || "Default"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
                      {plan.description || t("NoDescriptionLabel") || "No description available."}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {currentPrice !== undefined && currentPrice !== null ? `${currentPrice} ${currency}` : t("Free") || "Free"}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {formData.billingCycle === "yearly" ? "/ year" : "/ month"}
                      </span>
                    </div>
                    {trialDays > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <FiClock size={12} />
                        {t("TrialDaysLabel", { days: trialDays }) || `${trialDays} days trial`}
                      </span>
                    )}
                    <span
                      className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })()}
        <Error errorName={null} />
      </SectionCard>

      <SectionCard
        icon={FiTag}
        title={t("BillingSettings") || "Billing Settings"}
        subtitle={t("BillingSettingsDesc") || "Choose your billing cycle and apply a coupon if you have one."}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("BillingCycle") || "Billing Cycle"}
            </p>
            <BillingCycleToggle
              billingCycle={formData.billingCycle || "monthly"}
              onChange={handleBillingCycleChange}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("CouponCode") || "Coupon Code"}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t("EnterCoupon") || "Enter coupon code"}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button
                type="button"
                onClick={handleApplyCoupon}
                disabled={checkingCoupon || !couponCode.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {checkingCoupon ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("Applying") || "Applying"}
                  </span>
                ) : (
                  t("Apply") || "Apply"
                )}
              </Button>
            </div>
            {couponStatus && (
              <p
                className={`mt-2 text-xs ${
                  couponStatus.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {couponStatus.message}
              </p>
            )}
          </div>
        </div>
        {selectedPlan && effectivePrice !== undefined && effectivePrice !== null && (
          <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("PlanPrice") || "Plan price"}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {effectivePrice} {currency} / {formData.billingCycle === "yearly" ? "year" : "month"}
              </span>
            </div>
            {formData.discount && formData.discount.discountAmount > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Discount") || "Discount"}
                </span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  -{formData.discount.discountAmount} {currency}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("Total") || "Total"}
              </span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {Math.max(effectivePrice - (formData.discount?.discountAmount || 0), 0)} {currency}
              </span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default PlanSelectionStep;
