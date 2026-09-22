const express = require("express");
const productRoutes = require("./routes/productRoutes");
const galleryProductRoutes = require("./routes/galleryProductRoutes");
const stockMovementRoutes = require("./routes/stockMovementRoutes");
const stockReservationRoutes = require("./routes/stockReservationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const customerAddressRoutes = require("./routes/customerAddressRoutes");
const customerGroupRoutes = require("./routes/customerGroupRoutes");
const customerNoteRoutes = require("./routes/customerNoteRoutes");
const customerSessionRoutes = require("./routes/customerSessionRoutes");
const customerNotificationRoutes = require("./routes/customerNotificationRoutes");
const noteRoutes = require("./routes/noteRoutes");
const platformNoteRoutes = require("./routes/platformNoteRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const customerOrderRoutes = require("./routes/customerOrderRoutes");
const returnRequestRoutes = require("./routes/returnRequestRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productCategoryRoutes = require("./routes/ProductCategoryRoutes");
const couponRoutes = require("./routes/couponRoutes");
const attributeRoutes = require("./routes/attributeRoutes");
const attributeValueRoutes = require("./routes/attributeValueRoutes");
const productAttributeRoutes = require("./routes/productAttributeRoutes");
const productVariationRoutes = require("./routes/productVariationRoutes");
const productTagRoutes = require("./routes/productTagRoutes");
const brandRoutes = require("./routes/brandRoutes");
const productTagRelationRoutes = require("./routes/productTagRelationRoutes");
const settingRoutes = require("./routes/settingRoutes");
const currencyRoutes = require("./routes/currencyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const notificationsApiRoutes = require("./routes/notificationsApiRoutes");
const notificationPreferenceRoutes = require("./routes/notificationPreferenceRoutes");
const notificationTemplateRoutes = require("./routes/notificationTemplateRoutes");
const platformNotificationRoutes = require("./routes/platformNotificationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const { isAuth, loadUser, resolveAuthorizationContext, loadRider, requirePermission, isAdmin } = require("./middleware/auth");
const { loadCustomerOptional, requireCustomer } = require("./middleware/customerAuth");
const roleRoutes = require("./routes/roleRoutes");
const roleTemplateRoutes = require("./routes/roleTemplateRoutes");
const storeRoute = require("./routes/storeRoute");
const uploadRoute = require("./routes/uploadRoute");
const riderRoutes = require("./routes/riderRoutes");
const planRoutes = require("./routes/planRoutes");
const planPriceRoutes = require("./routes/planPriceRoutes");
const planVersionRoutes = require("./routes/planVersionRoutes");
const planTemplateRoutes = require("./routes/planTemplateRoutes");
const trialFactorRoutes = require("./routes/trialFactorRoutes");
const trialRuleRoutes = require("./routes/trialRuleRoutes");
const featureRoutes = require("./routes/featureRoutes");
const featureGroupRoutes = require("./routes/featureGroupRoutes");
const featureFlagRoutes = require("./routes/featureFlagRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const quotaTypeRoutes = require("./routes/quotaTypeRoutes");
const planEligibilityRoutes = require("./routes/planEligibilityRoutes");
const planUpgradeRuleRoutes = require("./routes/planUpgradeRuleRoutes");
const planDowngradeRuleRoutes = require("./routes/planDowngradeRuleRoutes");
const overageRoutes = require("./routes/overageRoutes");
const billingReconciliationRoutes = require("./routes/billingReconciliationRoutes");
const quotaOpsRoutes = require("./routes/quotaOpsRoutes");
const usageRoutes = require("./routes/usageRoutes");
const softLimitRoutes = require("./routes/softLimitRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const gracePeriodRoutes = require("./routes/gracePeriodRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const platformCouponRoutes = require("./routes/platformCouponRoutes");
const discountRoutes = require("./routes/discountRoutes");
const productReviewRoutes = require("./routes/productReviewRoutes");
const publicReviewRoutes = require("./routes/publicReviewRoutes");
const publicMarketingRoutes = require("./routes/publicMarketingRoutes");
const storefrontRoutes = require("./routes/storefrontRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const productReviewService = require("./service/productReviewService");
const { renderProductReviewsPage } = require("./views/productReviewsPage");
const countryRoutes = require("./routes/countryRoutes");
const generalSettingsRoutes = require("./routes/generalSettingsRoutes");
const productSettingsRoutes = require("./routes/productSettingsRoutes");
const shippingSettingsRoutes = require("./routes/shippingSettingsRoutes");
const paymentSettingsRoutes = require("./routes/paymentSettingsRoutes");
const emailSettingsRoutes = require("./routes/emailSettingsRoutes");
const accountsPrivacyRoutes = require("./routes/accountsPrivacyRoutes");
const gdprRoutes = require("./routes/gdprRoutes");
const websiteVisibilityRoutes = require("./routes/websiteVisibilityRoutes");
const facebookCatalogRoutes = require("./routes/facebookCatalogRoutes");
const publicFacebookCatalogRoutes = require("./routes/publicFacebookCatalogRoutes");
const pointOfSaleSettingsRoutes = require("./routes/pointOfSaleSettingsRoutes");
const taxSettingsRoutes = require("./routes/taxSettingsRoutes");
const {
  submitSitePassword,
  getRobotsTxt,
  getSitemapXml,
} = require("./controller/websiteVisibilityController");
const postRoutes = require("./routes/postRoutes");
const postCategoryRoutes = require("./routes/postCategoryRoutes");
const postTagRoutes = require("./routes/postTagRoutes");
const postCommentRoutes = require("./routes/postCommentRoutes");
const riderAppRoutes = require("./routes/riderAppRoutes");
const platformRoutes = require("./routes/platformRoutes");
const adminPaymentRoutes = require("./routes/adminPaymentRoutes");
const storeOwnerDashboardRoutes = require("./routes/storeOwnerDashboardRoutes");
const storeOwnerDashboardRoutesV2 = require("./routes/storeOwnerDashboardRoutesV2");
const storeExportRoutes = require("./routes/storeExportRoutes");

const adminPaymentManagementRoutes = require("./routes/adminPaymentManagementRoutes");
const adminShippingManagementRoutes = require("./routes/adminShippingManagementRoutes");
const { getMyContext } = require("./controller/meController");
const platformPaymentProviderRoutes = require("./routes/platformPaymentProviderRoutes");
const platformSettingsRoutes = require("./routes/platformSettingsRoutes");
const storePaymentProviderRoutes = require("./routes/storePaymentProviderRoutes");
const marketingSettingsRoutes = require("./routes/marketingSettingsRoutes");
const publicMarketingSettingsRoutes = require("./routes/publicMarketingSettingsRoutes");
const storeCarrierProviderRoutes = require("./routes/storeCarrierProviderRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { supportTicketRoutes, publicSupportTicketRoutes } = require("./routes/supportTicketRoutes");
const platformSupportTicketRoutes = require("./routes/platformSupportTicketRoutes");
const shippingZoneRoutes = require("./routes/shippingZoneRoutes");
const shippingClassRoutes = require("./routes/shippingClassRoutes");
const pickupLocationRoutes = require("./routes/pickupLocationRoutes");

const themeRoutes = require("./routes/themeRoutes");
const publicRoutes = require("./routes/public");
const savedBlockRoutes = require("./routes/savedBlock.routes");
const templateRoutes = require("./routes/template.routes");
// library.routes.js has the real implementation; libraryRoutes.js (camelCase)
// is a leftover 501-stub from the same merge  not used.
const libraryRoutes = require("./routes/library.routes");
const assetRoutes = require("./routes/assetRoutes");
const assetFolderRoutes = require("./routes/assetFolderRoutes");
const iconRoutes = require("./routes/iconRoutes");
const iconUploadRoutes = require("./routes/iconUploadRoutes");
// DEPRECATED  GlobalComponent system abandoned in favour of GlobalSection.
// Kept for reference/rollback only. 0 documents in production DB.
// See controller/globalComponentController.js for the deprecated implementation.
// const globalComponentRoutes = require("./routes/globalComponentRoutes");
const globalSectionRoutes = require("./routes/globalSectionRoutes");
const menuRoutes = require("./routes/menuRoutes");
const formRoutes = require("./routes/formRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const aiRoutes = require("./routes/aiRoutes");

function setupRoutes(app) {
  // root route
  app.get("/", (req, res) => {
    res.send("App works properly!");
  });

  // Minimal server-rendered public reviews page (ticket section 12/14)  no
  // separate storefront app in this workspace, so the backend serves it
  // directly. Product photos/price/cart are out of scope on purpose.
  app.get("/products/:id/reviews", async (req, res) => {
    try {
      const summary = await productReviewService.getPublicSummary(req.params.id);
      if (!summary) {
        return res.status(404).send("Produit introuvable ou non publié.");
      }
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(renderProductReviewsPage(summary));
    } catch (error) {
      return res.status(500).send("Erreur serveur.");
    }
  });

  app.use("/api/products/", isAuth, loadUser, resolveAuthorizationContext, productRoutes);
  app.use("/api/public/", publicRoutes);
  app.use("/api/product-gallery/", isAuth, loadUser, resolveAuthorizationContext, galleryProductRoutes);
  app.use("/api/stock-movements/", isAuth, loadUser, resolveAuthorizationContext, stockMovementRoutes);
  // Not gated with a blanket isAuth here: categoryRoutes.js mixes admin-only
  // mutation routes with the public storefront's /show, which now carries
  // its own auth requirement per-route instead (see categoryRoutes.js).
  app.use("/api/category/", categoryRoutes);
  app.use("/api/product-category/", isAuth, loadUser, resolveAuthorizationContext, productCategoryRoutes);
  app.use("/api/coupon/", isAuth, loadUser, resolveAuthorizationContext, couponRoutes);
  app.use("/api/analytics/", isAuth, loadUser, resolveAuthorizationContext, analyticsRoutes);
  app.use("/api/customer/", customerRoutes);
  app.use("/api/customer-addresses/", isAuth, loadUser, resolveAuthorizationContext, customerAddressRoutes);
  app.use("/api/customer-groups/", isAuth, loadUser, resolveAuthorizationContext, customerGroupRoutes);
  app.use("/api/customer-notes/", isAuth, loadUser, resolveAuthorizationContext, customerNoteRoutes);
  app.use("/api/customer-sessions/", isAuth, loadUser, resolveAuthorizationContext, customerSessionRoutes);
  // Generic internal notes (polymorphic entityType). Always store-scoped.
  app.use("/api/notes/", isAuth, loadUser, resolveAuthorizationContext, noteRoutes);
  // Storefront orders ("mes commandes"). Identity comes from the customer
  // token, never from the request: every handler scopes its query to
  // req.customer, so a customer can only ever reach their own orders.
  app.use("/api/order/", loadCustomerOptional, requireCustomer, customerOrderRoutes);
  // Not gated with a blanket isAuth here: attributeRoutes.js mixes admin-only
  // mutation routes with the public storefront's /show, which now carries
  // its own auth requirement per-route instead (see attributeRoutes.js).
  app.use("/api/attributes/", attributeRoutes);
  app.use("/api/attribute-values/", isAuth, loadUser, resolveAuthorizationContext, attributeValueRoutes);
  app.use("/api/product-attributes/", isAuth, loadUser, resolveAuthorizationContext, productAttributeRoutes);
  app.use("/api/product-variations/", isAuth, loadUser, resolveAuthorizationContext, productVariationRoutes);
  app.use("/api/product-tags/", isAuth, loadUser, resolveAuthorizationContext, productTagRoutes);
  app.use("/api/brands/", isAuth, loadUser, resolveAuthorizationContext, brandRoutes);
  app.use("/api/product-tag-relations/", isAuth, loadUser, resolveAuthorizationContext, productTagRelationRoutes);
  app.use("/api/setting/", settingRoutes);
  app.use("/api/currency/", isAuth, loadUser, resolveAuthorizationContext, currencyRoutes);
  app.use("/api/notification/", isAuth, loadUser, resolveAuthorizationContext, notificationRoutes);
  app.use("/api/notifications/preferences", isAuth, loadUser, resolveAuthorizationContext, notificationPreferenceRoutes);
  app.use("/api/notifications", isAuth, loadUser, resolveAuthorizationContext, notificationsApiRoutes);
  app.use("/api/platform/notifications", isAuth, loadUser, resolveAuthorizationContext, platformNotificationRoutes);
  app.use(
    "/api/platform/notification-templates",
    isAuth,
    loadUser, resolveAuthorizationContext, notificationTemplateRoutes
  );
  app.use("/api/customer/notifications", loadCustomerOptional, customerNotificationRoutes);
  app.use("/api/orders/", isAuth, loadUser, resolveAuthorizationContext, orderRoutes);
  // Mixed auth per-route inside (admin store routes vs. public customer
  // return route)  no blanket gate here, same SFG-80-safe pattern as the
  // other mixed routers in this file.
  app.use("/api", returnRequestRoutes);
  app.use("/api/auth/", authRoutes);
  app.use("/api/user/", isAuth, loadUser, resolveAuthorizationContext, userRoutes);
  app.use("/api/roles/", isAuth, loadUser, resolveAuthorizationContext, roleRoutes);
  app.use("/api/role-templates/", isAuth, loadUser, resolveAuthorizationContext, roleTemplateRoutes);
  app.use("/api/stores/", isAuth, loadUser, resolveAuthorizationContext, storeRoute);
  app.use("/api/store-logo-upload/", isAuth, loadUser, resolveAuthorizationContext, uploadRoute);
  app.use("/api/upload/", isAuth, loadUser, requirePermission("media.upload"), uploadRoutes);
  // Accounting records of the orders. Back-office only  /api/settings/payments/
  // is the gateway configuration, this is what was actually charged.
  app.use("/api/payments/", isAuth, loadUser, paymentRoutes);

  // SFG-80: kept mounted here (before the bare "/api" routers below 
  // themeRoutes, savedBlockRoutes, ..., assetFolderRoutes) as defense in
  // depth. The original incident was assetFolderRoutes applying an
  // unconditional router.use(isAdmin) gate (no loadUser, so req.user was
  // never set) at bare "/api", 403-ing everything registered after it.
  // That's fixed at the source now  assetRoutes/assetFolderRoutes call
  // loadUser and gate per-route with requirePermission() instead of a
  // blanket router-level check  but any *future* router mounted at bare
  // "/api" with its own unconditional gate would reproduce the same
  // silent-403 interception for everything registered after it. Mounting
  // support-tickets this early sidesteps that risk regardless of what else
  // changes further down this file. See routes.js history / SFG-80.
  app.use("/api/support-tickets/", isAuth, loadUser, supportTicketRoutes);
  // Storefront ticket creation  customer auth only, same split as reviews above.
  app.use("/api/public/support-tickets/", loadCustomerOptional, publicSupportTicketRoutes);
  // Marketing data is intentionally public and must be mounted before the
  // legacy bare /api routers below, some of which may apply auth gates.
  app.use("/api/public/", publicMarketingRoutes);

  app.use("/api", themeRoutes);
  app.use("/api", savedBlockRoutes);
  app.use("/api", templateRoutes);
  app.use("/api", libraryRoutes);
  // assetRoutes/assetFolderRoutes are properly namespaced at /api/assets
  // below  this used to ALSO mount them here at bare "/api" (a leftover
  // duplicate from before that namespacing existed), doubling up on the
  // exact SFG-80 risk this comment block warns about for no reason.
  app.use("/api/product-reviews/", isAuth, loadUser, resolveAuthorizationContext, productReviewRoutes);
  app.use("/api/icon-upload/", isAuth, loadUser, resolveAuthorizationContext, iconUploadRoutes);
  app.use("/api", globalSectionRoutes);
  app.use("/api", menuRoutes);
  app.use("/api/forms", formRoutes);
  app.use("/api/cart/", cartRoutes);
  app.use("/api/wishlist/", wishlistRoutes);
  app.use("/api/testimonials/", testimonialRoutes);
  app.use("/api/galleries/", galleryRoutes);
  app.use("/api/riders/", isAuth, loadUser, resolveAuthorizationContext, riderRoutes);
  app.use("/api/platform/plans/", isAuth, loadUser, resolveAuthorizationContext, planRoutes);
  app.use("/api/platform/plan-prices/", isAuth, loadUser, resolveAuthorizationContext, planPriceRoutes);
  app.use("/api/platform/plan-versions/", isAuth, loadUser, resolveAuthorizationContext, planVersionRoutes);
  app.use("/api/platform/plan-templates/", isAuth, loadUser, resolveAuthorizationContext, planTemplateRoutes);
  app.use("/api/platform/trial-factors/", isAuth, loadUser, resolveAuthorizationContext, trialFactorRoutes);
  app.use("/api/platform/trial-rules/", isAuth, loadUser, resolveAuthorizationContext, trialRuleRoutes);
  app.use("/api/platform/features/", isAuth, loadUser, resolveAuthorizationContext, featureRoutes);
  app.use("/api/platform/feature-groups/", isAuth, loadUser, resolveAuthorizationContext, featureGroupRoutes);
  app.use("/api/platform/feature-flags/", isAuth, loadUser, resolveAuthorizationContext, featureFlagRoutes);
  app.use("/api/platform/reports/", isAuth, loadUser, resolveAuthorizationContext, reportRoutes);
  app.use("/api/platform/audit-logs/", isAuth, loadUser, resolveAuthorizationContext, auditLogRoutes);
  app.use("/api/platform/quota-types/", isAuth, loadUser, resolveAuthorizationContext, quotaTypeRoutes);
  app.use("/api/platform/plan-eligibility/", isAuth, loadUser, resolveAuthorizationContext, planEligibilityRoutes);
  app.use("/api/platform/upgrade-rules/", isAuth, loadUser, resolveAuthorizationContext, planUpgradeRuleRoutes);
  app.use("/api/platform/downgrade-rules/", isAuth, loadUser, resolveAuthorizationContext, planDowngradeRuleRoutes);
  app.use("/api/platform/overages/", isAuth, loadUser, resolveAuthorizationContext, overageRoutes);
  app.use("/api/platform/billing/", isAuth, loadUser, resolveAuthorizationContext, billingReconciliationRoutes);
  app.use("/api/platform/quota-ops/", isAuth, loadUser, resolveAuthorizationContext, quotaOpsRoutes);
  app.use("/api/platform/usage/", isAuth, loadUser, resolveAuthorizationContext, usageRoutes);
  app.use("/api/platform/subscriptions/", isAuth, loadUser, resolveAuthorizationContext, subscriptionRoutes);
  app.use("/api/platform/grace-periods/", isAuth, loadUser, resolveAuthorizationContext, gracePeriodRoutes);
  app.use("/api/platform/soft-limits/", isAuth, loadUser, resolveAuthorizationContext, softLimitRoutes);
  app.use("/api/platform/invoices/", isAuth, loadUser, resolveAuthorizationContext, invoiceRoutes);
  app.use("/api/platform/payments/", isAuth, loadUser, resolveAuthorizationContext, paymentRoutes);
  app.use("/api/platform/coupons/", isAuth, loadUser, resolveAuthorizationContext, platformCouponRoutes);
  app.use("/api/platform/discounts/", isAuth, loadUser, resolveAuthorizationContext, discountRoutes);
  app.use("/api/platform/support-tickets/", isAuth, loadUser, resolveAuthorizationContext, platformSupportTicketRoutes);
  app.use("/api/platform/notes/", isAuth, loadUser, resolveAuthorizationContext, platformNoteRoutes);
  app.use("/api/assets", assetRoutes);
  app.use("/api/assets", assetFolderRoutes);
  // Was mounted at bare "/api"  this router's GET/PATCH/DELETE "/:name"
  // wildcard then matched ANY single-segment path under /api that no
  // earlier-registered router had already claimed (e.g. GET /api/countries,
  // GET /api/shipping-zones), returning this controller's own 404 "Icon not
  // found" instead of ever reaching the real route. The frontend already
  // calls this API at /api/custom-icons (see admin's icon-system/services/
  // iconService.js)  this mount just never matched that.
  app.use("/api/custom-icons", iconRoutes);
  app.use("/api/billing/plans/", isAuth, loadUser, planRoutes);
  // Public storefront review endpoints (votes, later: read + report)  no auth.
  app.use("/api/public/reviews/", publicReviewRoutes);
  // Public storefront endpoints (current store)  no auth.
  app.use("/api/storefront/", storefrontRoutes);
  // Shopping cart  no staff auth, the customer token is optional (guests).
  app.use("/api/carts/", cartRoutes);
  // Wishlists  same shopper model as the cart: no staff auth, the customer
  // token is optional (guests).
  app.use("/api/wishlists/", wishlistRoutes);
  app.use("/api/checkout/", checkoutRoutes);
  app.use("/api/countries/", countryRoutes);
  app.use("/api/settings/general/", isAuth, loadUser, resolveAuthorizationContext, generalSettingsRoutes);
  app.use("/api/settings/products/", isAuth, loadUser, resolveAuthorizationContext, productSettingsRoutes);
  app.use("/api/settings/shipping/", isAuth, loadUser, resolveAuthorizationContext, shippingSettingsRoutes);
  app.use("/api/settings/payments/", isAuth, loadUser, resolveAuthorizationContext, paymentSettingsRoutes);
  app.use("/api/admin/payments/", isAuth, loadUser, resolveAuthorizationContext, adminPaymentRoutes);
  app.use("/api/admin/payment-management/", isAuth, loadUser, resolveAuthorizationContext, adminPaymentManagementRoutes);
  app.use("/api/admin/shipping-management/", isAuth, loadUser, resolveAuthorizationContext, adminShippingManagementRoutes);
  app.use("/api/platform/payment-providers/", isAuth, loadUser, platformPaymentProviderRoutes);
  app.use("/api/stores/payment-providers/", isAuth, loadUser, resolveAuthorizationContext, storePaymentProviderRoutes);
  app.use("/api/settings/marketing/", isAuth, loadUser, resolveAuthorizationContext, marketingSettingsRoutes);
  app.use("/api/public/marketing", publicMarketingSettingsRoutes);
  app.use("/api/stores/:storeId/carrier-providers/", isAuth, loadUser, resolveAuthorizationContext, storeCarrierProviderRoutes);
  app.use("/api/webhooks/payments/", webhookRoutes);
  app.use("/api/settings/emails/", isAuth, loadUser, resolveAuthorizationContext, emailSettingsRoutes);
  app.use(
    "/api/settings/accounts-privacy/",
    isAuth,
    loadUser, resolveAuthorizationContext, accountsPrivacyRoutes
  );
  app.use("/api/gdpr/", isAuth, loadUser, resolveAuthorizationContext, gdprRoutes);
  app.use("/api/audit-log/", isAuth, loadUser, resolveAuthorizationContext, auditLogRoutes);
  app.use(
    "/api/settings/website-visibility/",
    isAuth,
    loadUser, resolveAuthorizationContext, websiteVisibilityRoutes
  );
  app.use(
    "/api/integrations/facebook-catalog/",
    isAuth,
    loadUser, resolveAuthorizationContext, facebookCatalogRoutes
  );
  app.use(
    "/api/public/facebook-catalog/",
    publicFacebookCatalogRoutes
  );
  app.use(
    "/api/settings/point-of-sale/",
    isAuth,
    loadUser, resolveAuthorizationContext, pointOfSaleSettingsRoutes
  );
  app.use("/api/settings/tax/", isAuth, loadUser, resolveAuthorizationContext, taxSettingsRoutes);
  app.use("/api/posts/", isAuth, loadUser, resolveAuthorizationContext, postRoutes);
  app.use("/api/post-categories/", isAuth, loadUser, resolveAuthorizationContext, postCategoryRoutes);
  app.use("/api/post-tags/", isAuth, loadUser, resolveAuthorizationContext, postTagRoutes);
  app.use("/api/post-comments/", isAuth, loadUser, resolveAuthorizationContext, postCommentRoutes);
  app.use("/api/rider-app/", isAuth, loadRider, riderAppRoutes);
  // Compatibility alias for the documented Platform Settings API. The same
  // router remains mounted under /api/v1/platform/settings as well.
  app.use("/api/platform/settings", platformSettingsRoutes);
  app.use("/api/v1/platform", platformRoutes);
  app.use("/api/dashboard/store-owner/v2", isAuth, loadUser, resolveAuthorizationContext, storeOwnerDashboardRoutesV2);
  app.use("/api/store/exports", isAuth, loadUser, storeExportRoutes);
  app.use("/api/dashboard/store-owner", isAuth, loadUser, resolveAuthorizationContext, storeOwnerDashboardRoutes);
  app.use("/api/shipping-zones/", isAuth, loadUser, resolveAuthorizationContext, shippingZoneRoutes);
  app.use("/api/shipping-classes/", isAuth, loadUser, resolveAuthorizationContext, shippingClassRoutes);
  app.use("/api/pickup-locations/", isAuth, loadUser, resolveAuthorizationContext, pickupLocationRoutes);

  // Malla  in-app AI assistant. The router chains isAuth + loadUser +
  // resolveAuthorizationContext itself; routes.js does not re-add them
  // to avoid double-resolving the auth context.
  app.use("/api/ai/", aiRoutes);

  app.get("/api/me/context", isAuth, loadUser, resolveAuthorizationContext, getMyContext);

  app.post(
    "/site-access",
    express.urlencoded({ extended: false, charset: "utf-8" }),
    submitSitePassword
  );
  app.get("/robots.txt", getRobotsTxt);
  app.get("/sitemap.xml", getSitemapXml);

  app.use("/api", (req, res) => {
    res.status(404).json({ message: "API route not found" });
  });
}

module.exports = setupRoutes;
