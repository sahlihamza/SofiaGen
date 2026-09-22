import { useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import PageTitle from "@/components/Typography/PageTitle";
import useSettingSubmit from "@/hooks/useSettingSubmit";
import usePaymentSettingsSubmit from "@/hooks/usePaymentSettingsSubmit";
import useEmailSettingsSubmit from "@/hooks/useEmailSettingsSubmit";
import useAccountsPrivacySubmit from "@/hooks/useAccountsPrivacySubmit";
import useGdprRequests from "@/hooks/useGdprRequests";
import useAuditLog from "@/hooks/useAuditLog";
import useWebsiteVisibilitySubmit from "@/hooks/useWebsiteVisibilitySubmit";
import usePointOfSaleSettingsSubmit from "@/hooks/usePointOfSaleSettingsSubmit";
import useTaxSettingsSubmit from "@/hooks/useTaxSettingsSubmit";
import useShippingZoneSubmit from "@/hooks/useShippingZoneSubmit";
import AnimatedContent from "@/components/common/AnimatedContent";
import SettingContainer from "@/components/settings/SettingContainer";
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import GeneralSettingsSection from "@/components/settings/sections/GeneralSettingsSection";
import ProductSettingsSection from "@/components/settings/sections/ProductSettingsSection";
import PaymentSettingsSection from "@/components/settings/sections/PaymentSettingsSection";
import StoreAppSettingsSection from "@/components/settings/sections/StoreAppSettingsSection";
import BrandingSection from "@/components/settings/sections/BrandingSection";
import InvoiceSettingsSection from "@/components/settings/sections/InvoiceSettingsSection";
import CompanyInfoSection from "@/components/settings/sections/CompanyInfoSection";
import ContactInfoSection from "@/components/settings/sections/ContactInfoSection";
import EmailConfigSection from "@/components/settings/sections/EmailConfigSection";
import EmailNotificationsSection from "@/components/settings/sections/EmailNotificationsSection";
import AccountsPrivacySection from "@/components/settings/sections/AccountsPrivacySection";
import WebsiteVisibilitySection from "@/components/settings/sections/WebsiteVisibilitySection";
import PointOfSaleSection from "@/components/settings/sections/PointOfSaleSection";
import TaxSettingsSection from "@/components/settings/sections/TaxSettingsSection";
import SmsConfigSection from "@/components/settings/sections/SmsConfigSection";
import ApplicationUrlsSection from "@/components/settings/sections/ApplicationUrlsSection";
import ShippingSection from "@/components/settings/sections/ShippingSection";
import NotificationSettingsSection from "@/components/settings/sections/NotificationSettingsSection";
import { Button } from "@sofia/ui";

const TABS = [
  { id: "general", labelKey: "SettingsTabGeneral" },
  { id: "product", labelKey: "SettingsTabProduct" },
  { id: "payments", labelKey: "SettingsTabPayments" },
  { id: "tax", labelKey: "SettingsTabTax" },
  { id: "store", labelKey: "SettingsTabStore" },
  { id: "shipping", labelKey: "SettingsTabShipping" },
  { id: "branding", labelKey: "SettingsTabBranding" },
  { id: "invoice", labelKey: "SettingsTabInvoice" },
  { id: "company", labelKey: "SettingsTabCompany" },
  { id: "contact", labelKey: "SettingsTabContact" },
  { id: "email", labelKey: "SettingsTabEmail" },
  { id: "email-notifications", labelKey: "SettingsTabEmailNotifications" },
  { id: "notifications", labelKey: "PrÃ©fÃ©rences Notifications" },
  { id: "accounts-privacy", labelKey: "SettingsTabAccountsPrivacy" },
  { id: "website-visibility", labelKey: "SettingsTabWebsiteVisibility" },
  { id: "point-of-sale", labelKey: "SettingsTabPointOfSale" },
  { id: "sms", labelKey: "SettingsTabSms" },
  { id: "urls", labelKey: "SettingsTabUrls" },
];

const Setting = () => {
  const {
    watch,
    errors,
    register,
    isSave,
    setValue,
    isSubmitting,
    onSubmit,
    isConfirmOpen,
    closeConfirm,
    performSave,
    isGeneralSubmitting,
    isGeneralConfirmOpen,
    requestSaveGeneral,
    closeGeneralConfirm,
    performSaveGeneral,
    handleSubmit,
    enableInvoice,
    setEnableInvoice,
    isAllowAutoTranslation,
    setIsAllowAutoTranslation,
    siteLogoDark,
    setSiteLogoDark,
    siteLogoLight,
    setSiteLogoLight,
    invoiceLogo,
    setInvoiceLogo,
    faviconUrl,
    setFaviconUrl,
    enableTax,
    setEnableTax,
    enableCoupons,
    setEnableCoupons,
    sequentialCoupons,
    setSequentialCoupons,
    countries,
    sellingCountries,
    setSellingCountries,
    shippingCountries,
    setShippingCountries,
    isProductSubmitting,
    isProductConfirmOpen,
    requestSaveProduct,
    closeProductConfirm,
    performSaveProduct,
    redirectToCartAfterAdd,
    setRedirectToCartAfterAdd,
    enableAjaxAddToCart,
    setEnableAjaxAddToCart,
    placeholderImage,
    setPlaceholderImage,
    enableReviews,
    setEnableReviews,
    showVerifiedOwnerBadge,
    setShowVerifiedOwnerBadge,
    reviewsRequireVerifiedOwner,
    setReviewsRequireVerifiedOwner,
    enableProductRatings,
    setEnableProductRatings,
    smtpEnabled,
    setSmtpEnabled,
    smtpSecure,
    setSmtpSecure,
    smtpPasswordConfigured,
    isSmtpSubmitting,
    performSaveSmtp,
    isSmtpTesting,
    sendSmtpTest,
  } = useSettingSubmit();

  const {
    methods: paymentMethods,
    isLoading: isPaymentLoading,
    togglingKey: paymentTogglingKey,
    isReordering: isPaymentReordering,
    toggleMethod: togglePaymentMethod,
    reorderMethodsLocally: reorderPaymentMethodsLocally,
    persistMethodOrder: persistPaymentMethodOrder,
    editingKey: paymentEditingKey,
    openConfig: openPaymentConfig,
    closeConfig: closePaymentConfig,
    isSavingConfig: isPaymentConfigSaving,
    saveConfig: savePaymentConfig,
  } = usePaymentSettingsSubmit();

  const {
    notifications: emailNotifications,
    isLoading: isEmailLoading,
    togglingKey: emailTogglingKey,
    toggleNotification: toggleEmailNotification,
    editingKey: emailEditingKey,
    openConfig: openEmailConfig,
    closeConfig: closeEmailConfig,
    isSavingConfig: isEmailConfigSaving,
    saveConfig: saveEmailConfig,
    template: emailTemplate,
    isTemplateLoading: isEmailTemplateLoading,
    isSavingTemplate: isEmailTemplateSaving,
    saveTemplate: saveEmailTemplate,
    previewHtml: emailPreviewHtml,
    isPreviewLoading: isEmailPreviewLoading,
    fetchPreview: fetchEmailPreview,
    testEmail: emailTestAddress,
    setTestEmail: setEmailTestAddress,
    isSendingTest: isEmailTestSending,
    sendTestEmail: sendEmailTest,
  } = useEmailSettingsSubmit();

  const {
    settings: accountsPrivacySettings,
    isLoading: isAccountsPrivacyLoading,
    isSaving: isAccountsPrivacySaving,
    saveSettings: saveAccountsPrivacySettings,
  } = useAccountsPrivacySubmit();

  const {
    customerEmail: gdprCustomerEmail,
    setCustomerEmail: setGdprCustomerEmail,
    isExporting: isGdprExporting,
    isDeleting: isGdprDeleting,
    isAnonymizing: isGdprAnonymizing,
    exportCustomer: gdprExportCustomer,
    deleteCustomer: gdprDeleteCustomer,
    anonymizeCustomer: gdprAnonymizeCustomer,
    requests: gdprRequests,
    isLoadingRequests: isLoadingGdprRequests,
  } = useGdprRequests();

  const {
    entries: auditLogEntries,
    isLoading: isLoadingAuditLog,
    refresh: refreshAuditLog,
    page: auditLogPage,
    setPage: setAuditLogPage,
    totalResults: auditLogTotalResults,
    resultsPerPage: auditLogResultsPerPage,
  } = useAuditLog();

  const {
    settings: websiteVisibilitySettings,
    isLoading: isWebsiteVisibilityLoading,
    isSaving: isWebsiteVisibilitySaving,
    saveSettings: saveWebsiteVisibilitySettings,
    isResettingSessions: isWebsiteVisibilityResettingSessions,
    resetSessions: resetWebsiteVisibilitySessions,
    previewHtml: websiteVisibilityPreviewHtml,
    isPreviewLoading: isWebsiteVisibilityPreviewLoading,
    previewMode: previewWebsiteVisibilityMode,
    closePreview: closeWebsiteVisibilityPreview,
    previewTheme: websiteVisibilityPreviewTheme,
  } = useWebsiteVisibilitySubmit();

  const {
    settings: pointOfSaleSettings,
    isLoading: isPointOfSaleLoading,
    isSaving: isPointOfSaleSaving,
    saveSettings: savePointOfSaleSettings,
  } = usePointOfSaleSettingsSubmit();

  const {
    settings: taxSettings,
    isLoading: isTaxLoading,
    isSavingOptions: isTaxSavingOptions,
    saveOptions: saveTaxOptions,
    isSavingClasses: isTaxSavingClasses,
    saveTaxClasses,
    isSavingRates: isTaxSavingRates,
    saveRates: saveTaxRates,
  } = useTaxSettingsSubmit();

  // Every one of these actions writes an audit-log entry server-side; wrap
  // them so the "Journal d'audit" table reflects the change immediately
  // instead of only on next page load.
  const withAuditRefresh = (fn) => async (...args) => {
    const result = await fn(...args);
    refreshAuditLog();
    return result;
  };

  const handleSaveAccountsPrivacySettings = withAuditRefresh(saveAccountsPrivacySettings);
  const handleSaveWebsiteVisibilitySettings = withAuditRefresh(saveWebsiteVisibilitySettings);
  const handleSavePointOfSaleSettings = withAuditRefresh(savePointOfSaleSettings);
  const handleSaveTaxOptions = withAuditRefresh(saveTaxOptions);
  const handleSaveTaxClasses = withAuditRefresh(saveTaxClasses);
  const handleSaveTaxRates = withAuditRefresh(saveTaxRates);
  const handleResetWebsiteVisibilitySessions = withAuditRefresh(resetWebsiteVisibilitySessions);
  const handleToggleEmailNotification = withAuditRefresh(toggleEmailNotification);
  const handleSaveEmailConfig = withAuditRefresh(saveEmailConfig);
  const handleSaveEmailTemplate = withAuditRefresh(saveEmailTemplate);
  const handleGdprExportCustomer = withAuditRefresh(gdprExportCustomer);
  const handleGdprDeleteCustomer = withAuditRefresh(gdprDeleteCustomer);
  const handleGdprAnonymizeCustomer = withAuditRefresh(gdprAnonymizeCustomer);

  const {
    shippingZones,
    isLoading: isShippingLoading,
    isSubmitting: isShippingSubmitting,
    name: shippingZoneName,
    setName: setShippingZoneName,
    selectedCountries: shippingSelectedCountries,
    setSelectedCountries: setShippingSelectedCountries,
    zipCodes: shippingZipCodes,
    setZipCodes: setShippingZipCodes,
    isReordering: isShippingReordering,
    deletingId: shippingZoneDeletingId,
    editingZoneId: shippingZoneEditingId,
    errors: shippingZoneErrors,
    onSubmit: onShippingZoneSubmit,
    startEditZone: startEditShippingZone,
    cancelEditZone: cancelEditShippingZone,
    deleteZone: deleteShippingZoneItem,
    reorderLocally: reorderShippingZonesLocally,
    persistZoneOrder: persistShippingZoneOrder,
    saveShippingMethod,
    toggleShippingMethod,
    deleteShippingMethodItem,
    togglingMethodId: shippingMethodTogglingId,
    deletingMethodId: shippingMethodDeletingId,
    reorderingMethodsZoneId: shippingMethodReorderingZoneId,
    reorderMethodsLocally: reorderShippingMethodsLocally,
    persistMethodOrder: persistShippingMethodOrder,
  } = useShippingZoneSubmit(countries);

  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <>
      <PageTitle>{t("Setting")}</PageTitle>
      {isConfirmOpen && (
        <SaveSettingsModal
          isOpen={isConfirmOpen}
          onClose={closeConfirm}
          onConfirm={performSave}
          isSubmitting={isSubmitting}
        />
      )}
      {isGeneralConfirmOpen && (
        <SaveSettingsModal
          isOpen={isGeneralConfirmOpen}
          onClose={closeGeneralConfirm}
          onConfirm={performSaveGeneral}
          isSubmitting={isGeneralSubmitting}
        />
      )}
      {isProductConfirmOpen && (
        <SaveSettingsModal
          isOpen={isProductConfirmOpen}
          onClose={closeProductConfirm}
          onConfirm={performSaveProduct}
          isSubmitting={isProductSubmitting}
        />
      )}
      <AnimatedContent>
        <div className="w-full md:p-6 p-4 bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)}>
            <SettingContainer
              isSave={isSave}
              title={t("Setting")}
              isSubmitting={isSubmitting}
              hideButton
            >
              <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                {TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t(tab.labelKey) !== tab.labelKey ? t(tab.labelKey) : tab.labelKey}
                  </Button>
                ))}
              </div>

              <div className="flex-grow scrollbar-hide w-full max-h-full">
                {activeTab === "general" && (
                  <GeneralSettingsSection
                    register={register}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    countries={countries}
                    sellingCountries={sellingCountries}
                    setSellingCountries={setSellingCountries}
                    shippingCountries={shippingCountries}
                    setShippingCountries={setShippingCountries}
                    enableTax={enableTax}
                    setEnableTax={setEnableTax}
                    enableCoupons={enableCoupons}
                    setEnableCoupons={setEnableCoupons}
                    sequentialCoupons={sequentialCoupons}
                    setSequentialCoupons={setSequentialCoupons}
                    onSave={requestSaveGeneral}
                    isSaving={isGeneralSubmitting}
                  />
                )}

                {activeTab === "product" && (
                  <ProductSettingsSection
                    register={register}
                    errors={errors}
                    redirectToCartAfterAdd={redirectToCartAfterAdd}
                    setRedirectToCartAfterAdd={setRedirectToCartAfterAdd}
                    enableAjaxAddToCart={enableAjaxAddToCart}
                    setEnableAjaxAddToCart={setEnableAjaxAddToCart}
                    placeholderImage={placeholderImage}
                    setPlaceholderImage={setPlaceholderImage}
                    enableReviews={enableReviews}
                    setEnableReviews={setEnableReviews}
                    showVerifiedOwnerBadge={showVerifiedOwnerBadge}
                    setShowVerifiedOwnerBadge={setShowVerifiedOwnerBadge}
                    reviewsRequireVerifiedOwner={reviewsRequireVerifiedOwner}
                    setReviewsRequireVerifiedOwner={setReviewsRequireVerifiedOwner}
                    enableProductRatings={enableProductRatings}
                    setEnableProductRatings={setEnableProductRatings}
                    onSave={requestSaveProduct}
                    isSaving={isProductSubmitting}
                  />
                )}

                {activeTab === "payments" && (
                  <PaymentSettingsSection
                    methods={paymentMethods}
                    isLoading={isPaymentLoading}
                    togglingKey={paymentTogglingKey}
                    isReordering={isPaymentReordering}
                    toggleMethod={togglePaymentMethod}
                    reorderMethodsLocally={reorderPaymentMethodsLocally}
                    persistMethodOrder={persistPaymentMethodOrder}
                    editingKey={paymentEditingKey}
                    openConfig={openPaymentConfig}
                    closeConfig={closePaymentConfig}
                    isSavingConfig={isPaymentConfigSaving}
                    saveConfig={savePaymentConfig}
                  />
                )}

                {activeTab === "tax" && (
                  <TaxSettingsSection
                    settings={taxSettings}
                    isLoading={isTaxLoading}
                    isSavingOptions={isTaxSavingOptions}
                    saveOptions={handleSaveTaxOptions}
                    isSavingClasses={isTaxSavingClasses}
                    saveTaxClasses={handleSaveTaxClasses}
                    isSavingRates={isTaxSavingRates}
                    saveRates={handleSaveTaxRates}
                  />
                )}

                {activeTab === "store" && (
                  <StoreAppSettingsSection
                    register={register}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    isAllowAutoTranslation={isAllowAutoTranslation}
                    setIsAllowAutoTranslation={setIsAllowAutoTranslation}
                  />
                )}

                {activeTab === "shipping" && (
                  <ShippingSection
                    countries={countries}
                    shippingZones={shippingZones}
                    isLoading={isShippingLoading}
                    isSubmitting={isShippingSubmitting}
                    name={shippingZoneName}
                    setName={setShippingZoneName}
                    selectedCountries={shippingSelectedCountries}
                    setSelectedCountries={setShippingSelectedCountries}
                    zipCodes={shippingZipCodes}
                    setZipCodes={setShippingZipCodes}
                    errors={shippingZoneErrors}
                    onSubmit={onShippingZoneSubmit}
                    isReordering={isShippingReordering}
                    deletingId={shippingZoneDeletingId}
                    editingZoneId={shippingZoneEditingId}
                    startEditZone={startEditShippingZone}
                    cancelEditZone={cancelEditShippingZone}
                    deleteZone={deleteShippingZoneItem}
                    reorderLocally={reorderShippingZonesLocally}
                    persistZoneOrder={persistShippingZoneOrder}
                    saveShippingMethod={saveShippingMethod}
                    toggleShippingMethod={toggleShippingMethod}
                    deleteShippingMethodItem={deleteShippingMethodItem}
                    togglingMethodId={shippingMethodTogglingId}
                    deletingMethodId={shippingMethodDeletingId}
                    reorderingMethodsZoneId={shippingMethodReorderingZoneId}
                    reorderMethodsLocally={reorderShippingMethodsLocally}
                    persistMethodOrder={persistShippingMethodOrder}
                  />
                )}

                {activeTab === "branding" && (
                  <BrandingSection
                    register={register}
                    siteLogoDark={siteLogoDark}
                    setSiteLogoDark={setSiteLogoDark}
                    siteLogoLight={siteLogoLight}
                    setSiteLogoLight={setSiteLogoLight}
                    invoiceLogo={invoiceLogo}
                    setInvoiceLogo={setInvoiceLogo}
                    faviconUrl={faviconUrl}
                    setFaviconUrl={setFaviconUrl}
                  />
                )}

                {activeTab === "invoice" && (
                  <InvoiceSettingsSection
                    register={register}
                    errors={errors}
                    enableInvoice={enableInvoice}
                    setEnableInvoice={setEnableInvoice}
                  />
                )}

                {activeTab === "company" && (
                  <CompanyInfoSection register={register} errors={errors} />
                )}

                {activeTab === "contact" && (
                  <ContactInfoSection register={register} errors={errors} />
                )}

                {activeTab === "email" && (
                  <EmailConfigSection
                    register={register}
                    smtpEnabled={smtpEnabled}
                    setSmtpEnabled={setSmtpEnabled}
                    smtpSecure={smtpSecure}
                    setSmtpSecure={setSmtpSecure}
                    passwordConfigured={smtpPasswordConfigured}
                    onSave={performSaveSmtp}
                    isSaving={isSmtpSubmitting}
                    onSendTest={sendSmtpTest}
                    isTesting={isSmtpTesting}
                  />
                )}

                {activeTab === "email-notifications" && (
                  <EmailNotificationsSection
                    notifications={emailNotifications}
                    isLoading={isEmailLoading}
                    togglingKey={emailTogglingKey}
                    toggleNotification={handleToggleEmailNotification}
                    editingKey={emailEditingKey}
                    openConfig={openEmailConfig}
                    closeConfig={closeEmailConfig}
                    isSavingConfig={isEmailConfigSaving}
                    saveConfig={handleSaveEmailConfig}
                    onOpenSmtpConfig={() => setActiveTab("email")}
                    template={emailTemplate}
                    isTemplateLoading={isEmailTemplateLoading}
                    isSavingTemplate={isEmailTemplateSaving}
                    saveTemplate={handleSaveEmailTemplate}
                    previewHtml={emailPreviewHtml}
                    isPreviewLoading={isEmailPreviewLoading}
                    fetchPreview={fetchEmailPreview}
                    testEmail={emailTestAddress}
                    setTestEmail={setEmailTestAddress}
                    isSendingTest={isEmailTestSending}
                    sendTestEmail={sendEmailTest}
                  />
                )}

                {activeTab === "notifications" && <NotificationSettingsSection />}

                {activeTab === "accounts-privacy" && (
                  <AccountsPrivacySection
                    settings={accountsPrivacySettings}
                    isLoading={isAccountsPrivacyLoading}
                    isSaving={isAccountsPrivacySaving}
                    saveSettings={handleSaveAccountsPrivacySettings}
                    gdprCustomerEmail={gdprCustomerEmail}
                    setGdprCustomerEmail={setGdprCustomerEmail}
                    isGdprExporting={isGdprExporting}
                    isGdprDeleting={isGdprDeleting}
                    isGdprAnonymizing={isGdprAnonymizing}
                    gdprExportCustomer={handleGdprExportCustomer}
                    gdprDeleteCustomer={handleGdprDeleteCustomer}
                    gdprAnonymizeCustomer={handleGdprAnonymizeCustomer}
                    gdprRequests={gdprRequests}
                    isLoadingGdprRequests={isLoadingGdprRequests}
                    auditLogEntries={auditLogEntries}
                    isLoadingAuditLog={isLoadingAuditLog}
                    auditLogPage={auditLogPage}
                    setAuditLogPage={setAuditLogPage}
                    auditLogTotalResults={auditLogTotalResults}
                    auditLogResultsPerPage={auditLogResultsPerPage}
                  />
                )}

                {activeTab === "website-visibility" && (
                  <WebsiteVisibilitySection
                    settings={websiteVisibilitySettings}
                    isLoading={isWebsiteVisibilityLoading}
                    isSaving={isWebsiteVisibilitySaving}
                    saveSettings={handleSaveWebsiteVisibilitySettings}
                    isResettingSessions={isWebsiteVisibilityResettingSessions}
                    resetSessions={handleResetWebsiteVisibilitySessions}
                    previewHtml={websiteVisibilityPreviewHtml}
                    isPreviewLoading={isWebsiteVisibilityPreviewLoading}
                    previewMode={previewWebsiteVisibilityMode}
                    closePreview={closeWebsiteVisibilityPreview}
                    previewTheme={websiteVisibilityPreviewTheme}
                  />
                )}

                {activeTab === "point-of-sale" && (
                  <PointOfSaleSection
                    settings={pointOfSaleSettings}
                    isLoading={isPointOfSaleLoading}
                    isSaving={isPointOfSaleSaving}
                    saveSettings={handleSavePointOfSaleSettings}
                  />
                )}

                {activeTab === "sms" && <SmsConfigSection register={register} />}

                {activeTab === "urls" && (
                  <ApplicationUrlsSection register={register} />
                )}
              </div>
            </SettingContainer>
          </form>
        </div>
      </AnimatedContent>
    </>
  );
};
export default Setting;
