import React from "react";
import { useTranslation } from "react-i18next";
import { FiInfo, FiCheckCircle, FiMail, FiGlobe, FiUser, FiSettings, FiCreditCard, FiDollarSign } from "react-icons/fi";

const SectionCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
      {Icon && (
        <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Icon size={14} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex justify-between items-start py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 mr-4">
      {label}
    </span>
    <span className={`text-sm font-medium text-gray-900 dark:text-gray-100 text-right ${mono ? "font-mono text-xs" : ""}`}>
      {value || <span className="text-gray-400 dark:text-gray-500 italic"></span>}
    </span>
  </div>
);

const ConfirmationStep = ({ formData, imageUrl, isActive }) => {
  const { t } = useTranslation();

  const formatDate = (dateString) => {
    if (!dateString) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const domainDisplay = formData.subdomain
    ? `${formData.subdomain}.platform.com`
    : formData.customDomain || "";

  const ownerDisplay =
    formData.ownerFirstName && formData.ownerLastName
      ? `${formData.ownerFirstName} ${formData.ownerLastName}`
      : formData.ownerName || "";

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("FinalizeStoreSetup") || "Finalize Store Setup"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("ConfigureStoreSettings") ||
            "Configure advanced settings and review your store information."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Settings */}
        <div className="lg:col-span-2 space-y-5">
          <SectionCard
            title={t("StoreInfoLabel") || "Store Information"}
            icon={FiGlobe}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label={t("StoreNameLabel") || "Store Name"} value={formData.name} />
              <InfoRow label={t("StoreSlugLabel") || "Store Slug"} value={formData.slug} mono />
              <InfoRow label={t("SubdomainLabel") || "Subdomain"} value={formData.subdomain} />
              <InfoRow label={t("CustomDomainLabel") || "Custom Domain"} value={formData.customDomain} />
              <InfoRow label={t("StoreAddressLabel") || "Address"} value={formData.address} />
              <InfoRow label={t("CountryLabel") || "Country"} value={formData.country} />
              <InfoRow label={t("LanguageLabel") || "Language"} value={formData.language} />
              <InfoRow label={t("CurrencyLabel") || "Currency"} value={formData.currency} />
              <InfoRow label={t("TimezoneLabel") || "Timezone"} value={formData.timezone} />
              <InfoRow label={t("PlanLabel") || "Plan"} value={formData.planName || formData.plan} />
              <InfoRow label={t("BillingCycleLabel") || "Billing Cycle"} value={formData.billingCycle === "yearly" ? (t("Yearly") || "Yearly") : (t("Monthly") || "Monthly")} />
              <InfoRow label={t("StatusLabel") || "Status"} value={isActive ? t("ActiveStatus") || "Active" : t("InactiveStatus") || "Inactive"} />
            </div>
          </SectionCard>

          <SectionCard
            title={t("BillingPaymentLabel") || "Billing & Payment"}
            icon={FiCreditCard}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label={t("PaymentMethodLabel") || "Payment Method"} value={formData.paymentGateway ? formData.paymentGateway.charAt(0).toUpperCase() + formData.paymentGateway.slice(1) : ""} />
              <InfoRow label={t("CouponCodeLabel") || "Coupon Code"} value={formData.couponCode || ""} />
              {formData.discount?.discountAmount > 0 && (
                <InfoRow label={t("DiscountLabel") || "Discount"} value={`${formData.discount.discountAmount} ${formData.currency}`} />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title={t("OwnerDetailsLabel") || "Owner Information"}
            icon={FiUser}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label={t("OwnerNameLabel") || "Owner Name"} value={ownerDisplay} />
              <InfoRow label={t("OwnerEmailLabel") || "Owner Email"} value={formData.ownerEmail} />
              <InfoRow label={t("OwnerPhoneLabel") || "Owner Phone"} value={formData.ownerPhone} />
              <InfoRow label={t("OwnerAddressLabel") || "Owner Address"} value={formData.ownerAddress} />
              <InfoRow label={t("PreferredLanguage") || "Preferred Language"} value={formData.ownerLanguage} />
            </div>
          </SectionCard>

          <SectionCard
            title={t("DefaultTemplates") || "Default Templates"}
            icon={FiSettings}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow
                label={t("ShippingZones") || "Shipping Zones"}
                value={t("StandardNorthAfricaTemplate") || "Standard North Africa Template"}
              />
              <InfoRow
                label={t("TaxClasses") || "Tax Classes"}
                value={t("StandardGlobalTaxTemplate") || "Standard Global Tax Template"}
              />
            </div>
          </SectionCard>
        </div>

        {/* Right Column - Review Summary */}
        <div>
          <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 rounded-xl text-white p-5 shadow-lg sticky top-6">
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <FiCheckCircle size={18} />
              {t("ReviewSummary") || "Review Summary"}
            </h3>

            <div className="space-y-4 text-sm">
              {imageUrl && (
                <div className="flex justify-center mb-4">
                  <img
                    src={imageUrl}
                    alt="Store logo"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                  />
                </div>
              )}

              <div>
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("StoreNameLabel") || "Store Name"}
                </p>
                <p className="font-semibold text-base break-all">{formData.name || ""}</p>
              </div>

              <div className="pt-3 border-t border-emerald-500/50">
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("DomainLabel") || "Domain"}
                </p>
                <p className="font-mono text-sm break-all">{domainDisplay}</p>
              </div>

              <div className="pt-3 border-t border-emerald-500/50">
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("PlanLabel") || "Plan"}
                </p>
                <p className="font-semibold">{formData.planName || formData.plan || ""}</p>
              </div>

              <div className="pt-3 border-t border-emerald-500/50">
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("BillingCycleLabel") || "Billing Cycle"}
                </p>
                <p className="font-semibold">{formData.billingCycle === "yearly" ? (t("Yearly") || "Yearly") : (t("Monthly") || "Monthly")}</p>
              </div>

              <div className="pt-3 border-t border-emerald-500/50">
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("PaymentMethodLabel") || "Payment Method"}
                </p>
                <p className="font-semibold">{formData.paymentGateway ? formData.paymentGateway.charAt(0).toUpperCase() + formData.paymentGateway.slice(1) : ""}</p>
              </div>

              <div className="pt-3 border-t border-emerald-500/50">
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("OwnerLabel") || "Owner"}
                </p>
                <p className="font-semibold break-all">{ownerDisplay}</p>
                {formData.ownerEmail && (
                  <p className="text-xs text-emerald-200 mt-0.5 break-all">{formData.ownerEmail}</p>
                )}
              </div>

              <div className="pt-3 border-t border-emerald-500/50">
                <p className="text-emerald-100 mb-1 text-xs uppercase tracking-wider">
                  {t("CreatedDateLabel") || "Created Date"}
                </p>
                <p className="font-semibold">{formatDate()}</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-5 p-3 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
              <div className="flex items-start gap-2">
                <FiInfo className="text-emerald-200 mt-0.5 shrink-0" size={14} />
                <p className="text-xs text-emerald-100 leading-relaxed">
                  {t("ReviewSummaryInfo") ||
                    "Review all information above before finalizing. Some settings can be changed later."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationStep;