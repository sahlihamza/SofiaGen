import { lazy } from "react";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PlatformDashboard = lazy(() => import("@/pages/Platform/superadmin/Dashboard"));
const PlatformUsers = lazy(() => import("@/pages/Users/UsersList"));
const PlatformUserDetail = lazy(() => import("@/pages/Users/UserDetail"));
const PlatformInvitations = lazy(() => import("@/pages/Platform/Invitations"));
const PlatformTeams = lazy(() => import("@/pages/Platform/Teams"));
const PlatformTeamDetail = lazy(() => import("@/pages/Platform/TeamDetail"));
const PlatformPlans = lazy(() => import("@/pages/Plans/PlansList"));
const PlatformRoles = lazy(() => import("@/pages/Roles/RolesList"));
const PlatformRoleDetail = lazy(() => import("@/pages/Roles/RoleDetail"));
const PlatformAuditLogs = lazy(() => import("@/pages/AuditLogs/AuditLogsList"));
const PlatformLogsDashboard = lazy(() => import("@/pages/Logs/LogsDashboard"));
const PlatformSettings = lazy(() => import("@/pages/Settings/SettingsPage"));
const PlatformNotifications = lazy(() => import("@/pages/Platform/PlatformNotifications"));
const PlatformNotes = lazy(() => import("@/pages/Platform/PlatformNotes"));
const SecurityCenter = lazy(() => import("@/pages/Platform/SecurityCenter"));
const JobsMonitor = lazy(() => import("@/pages/Platform/JobsMonitor"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Attributes = lazy(() => import("@/pages/Attributes"));
const AttributeValues = lazy(() => import("@/pages/AttributeValues"));
const ProductTags = lazy(() => import("@/pages/ProductTags"));
const Brands = lazy(() => import("@/pages/Brands"));
const Products = lazy(() => import("@/pages/Products"));
const AddProduct = lazy(() => import("@/pages/AddProduct"));
const EditProduct = lazy(() => import("@/pages/EditProduct"));
const DuplicateProduct = lazy(() => import("@/pages/DuplicateProduct"));
const ProductDetails = lazy(() => import("@/pages/ProductDetails"));
const Category = lazy(() => import("@/pages/Category"));
const ChildCategory = lazy(() => import("@/pages/ChildCategory"));
const Staff = lazy(() => import("@/pages/Staff"));
const ListStaff = lazy(() => import("@/pages/superadmin/Staff/ListStaff"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerOrder = lazy(() => import("@/pages/CustomerOrder"));
const Orders = lazy(() => import("@/pages/Orders"));
const Returns = lazy(() => import("@/pages/Returns"));
const OrderInvoice = lazy(() => import("@/pages/OrderInvoice"));
const OrderEdit = lazy(() => import("@/pages/OrderEdit"));
const Coupons = lazy(() => import("@/pages/Coupons"));
const PlatformCoupons = lazy(() => import("@/pages/PlatformCoupons"));
const SupportTickets = lazy(() => import("@/pages/SupportTickets"));
const SupportTicketDetail = lazy(() => import("@/pages/SupportTicketDetail"));
const SupportAnalytics = lazy(() => import("@/pages/SupportAnalytics"));
const Plans = lazy(() => import("@/pages/Plans"));
const PlanDetail = lazy(() => import("@/pages/PlanDetail"));
const PlanPrices = lazy(() => import("@/pages/PlanPrices"));
const PlanVersions = lazy(() => import("@/pages/PlanVersions"));
const PlanTemplates = lazy(() => import("@/pages/PlanTemplates"));
const TrialFactors = lazy(() => import("@/pages/TrialFactors"));
const TrialRules = lazy(() => import("@/pages/TrialRules"));
const PlanEligibility = lazy(() => import("@/pages/PlanEligibility"));
const SoftLimits = lazy(() => import("@/pages/SoftLimits"));
const Features = lazy(() => import("@/pages/Features"));
const FeatureGroups = lazy(() => import("@/pages/FeatureGroups"));
const QuotaTypes = lazy(() => import("@/pages/QuotaTypes"));
const Subscriptions = lazy(() => import("@/pages/Subscriptions"));
const Payments = lazy(() => import("@/pages/Payments"));
const UsageTracking = lazy(() => import("@/pages/billing/UsageTracking"));
const TrialManagement = lazy(() => import("@/pages/TrialManagement"));
const SubscriptionHistory = lazy(() => import("@/pages/billing/SubscriptionHistory"));
const SubscriptionEvents = lazy(() => import("@/pages/billing/SubscriptionEvents"));
const FeatureFlags = lazy(() => import("@/pages/billing/FeatureFlags"));
const BillingReports = lazy(() => import("@/pages/billing/BillingReports"));
const AuditLogs = lazy(() => import("@/pages/billing/AuditLogs"));
const EnrichedAuditLogs = lazy(() => import("@/pages/billing/EnrichedAuditLogs"));
const UpgradeRules = lazy(() => import("@/pages/billing/UpgradeRules"));
const DowngradeRules = lazy(() => import("@/pages/billing/DowngradeRules"));
const Overages = lazy(() => import("@/pages/billing/Overages"));
const GracePeriods = lazy(() => import("@/pages/billing/GracePeriods"));
const Discounts = lazy(() => import("@/pages/billing/Discounts"));
const Invoices = lazy(() => import("@/pages/billing/Invoices"));
const InvoiceDetail = lazy(() => import("@/pages/billing/InvoiceDetail"));
const PaymentMethods = lazy(() => import("@/pages/billing/PaymentMethods"));
const PaymentRules = lazy(() => import("@/pages/billing/PaymentRules"));
const Transactions = lazy(() => import("@/pages/billing/Transactions"));
const MySubscription = lazy(() => import("@/pages/StoreOwner/MySubscription"));
const MyUsage = lazy(() => import("@/pages/StoreOwner/MyUsage"));
const MyInvoices = lazy(() => import("@/pages/StoreOwner/MyInvoices"));
const Page404 = lazy(() => import("@/pages/404"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const Currencies = lazy(() => import("@/pages/Currencies"));
const Languages = lazy(() => import("@/pages/Languages"));
const Setting = lazy(() => import("@/pages/Setting"));
const MarketingSettings = lazy(() => import("@/pages/Settings/MarketingSettings"));
const FacebookCatalog = lazy(() => import("@/pages/FacebookCatalog"));
const AIProviders = lazy(() => import("@/pages/Settings/AIProviders"));
const StoreHome = lazy(() => import("@/pages/StoreHome"));
const Storefront = lazy(() => import("@/pages/Storefront"));
const StoreSetting = lazy(() => import("@/pages/StoreSetting"));
const StorePages = lazy(() => import("@/pages/StorePages"));
 
const Themes = lazy(() => import("@/pages/Themes"));
const ThemeEditor = lazy(() => import("@/pages/ThemeEditor"));
 
const Notifications = lazy(() => import("@/pages/Notifications"));
const Profitability = lazy(() => import("@/pages/Profitability"));
const NotificationPreferences = lazy(() => import("@/pages/NotificationPreferences"));
const NotificationTemplates = lazy(() => import("@/pages/Platform/NotificationTemplates"));
const Stores = lazy(() => import("@/pages/Stores"));
const StoreDetail = lazy(() => import("@/pages/StoreDetail"));
const Roles = lazy(() => import("@/pages/Roles"));
const RolePermissions = lazy(() => import("@/pages/RolePermissions"));
const Riders = lazy(() => import("@/pages/Riders"));
const PaymentSettings = lazy(() => import("@/pages/Settings/PaymentSettings"));
const RiderDetail = lazy(() => import("@/pages/RiderDetail"));
const ProductReviews = lazy(() => import("@/pages/ProductReviews"));
const Posts = lazy(() => import("@/pages/Posts"));
const PostEditor = lazy(() => import("@/pages/PostEditor"));
const PostCategories = lazy(() => import("@/pages/PostCategories"));
const PostTags = lazy(() => import("@/pages/PostTags"));
const PostComments = lazy(() => import("@/pages/PostComments"));
const IntegrationsPage = lazy(() => import("@/pages/Integrations/IntegrationsPage"));
const DeliveryPage = lazy(() => import("@/pages/Integrations/DeliveryPage"));
/*
//  *  These are internal routes!
//  * They will be rendered inside the app, using the default `containers/Layout`.
//  * If you want to add a route to, let's say, a landing page, you should add
//  * it to the `App`'s router, exactly like `Login`, `CreateAccount` and other pages
//  * are routed.
//  *
//  * If you're looking for the links rendered in the SidebarContent, go to
//  * `routes/sidebar.js`
 */

const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
  },
  {
    path: "/platform/users",
    component: PlatformUsers,
  },
  {
    path: "/platform/users/:userId",
    component: PlatformUserDetail,
  },
  {
    path: "/platform/dashboard",
    component: PlatformDashboard,
  },
  {
    path: "/platform/notifications",
    component: PlatformNotifications,
  },
  {
    path: "/platform/notes",
    component: PlatformNotes,
  },
  {
    path: "/platform/invitations",
    component: PlatformInvitations,
  },
  {
    path: "/platform/teams",
    component: PlatformTeams,
  },
  {
    path: "/platform/teams/:id",
    component: PlatformTeamDetail,
  },
  {
    path: "/billing/plans",
    component: PlatformPlans,
  },
  {
    path: "/platform/roles",
    component: PlatformRoles,
  },
  {
    path: "/platform/roles/new",
    component: PlatformRoleDetail,
  },
  {
    path: "/platform/roles/:id/edit",
    component: PlatformRoleDetail,
  },
  {
    path: "/platform/roles/:id",
    component: PlatformRoleDetail,
  },
  {
    path: "/platform/audit-logs",
    component: PlatformAuditLogs,
  },
  {
    path: "/platform/logs",
    component: PlatformLogsDashboard,
  },
  {
    path: "/platform/security-center",
    component: SecurityCenter,
  },
  {
    path: "/platform/jobs-monitor",
    component: JobsMonitor,
  },
  {
    path: "/platform/settings",
    component: PlatformSettings,
  },
  {
    path: "/analytics",
    component: Analytics,
  },
{
    path: "/settings",
    component: Setting,
  },
  {
    path: "/settings/marketing",
    component: MarketingSettings,
  },
  {
    path: "/integrations/facebook-catalog",
    component: FacebookCatalog,
  },
  {
    path: "/settings/ai-providers",
    component: AIProviders,
  },
  {
    path: "/stores/:id",
    component: StoreDetail,
  },
  {
    path: "/products",
    component: Products,
  },
  {
    path: "/products/add",
    component: AddProduct,
  },
  {
    path: "/products/:id/edit",
    component: EditProduct,
  },
  {
    path: "/products/:id/duplicate",
    component: DuplicateProduct,
  },
  {
    path: "/attributes",
    component: Attributes,
  },
  {
    path: "/attributes/:id/values",
    component: AttributeValues,
  },
  {
    path: "/product-tags",
    component: ProductTags,
  },
  {
    path: "/brands",
    component: Brands,
  },
  {
    path: "/product-reviews",
    component: ProductReviews,
  },
  {
    path: "/product/:id",
    component: ProductDetails,
  },
  {
    path: "/categories",
    component: Category,
  },
  {
    path: "/currencies",
    component: Currencies,
  },
  {
    path: "/languages",
    component: Languages,
  },
  {
    path: "/categories/:id",
    component: ChildCategory,
  },
  {
    path: "/customers",
    component: Customers,
  },
  {
    path: "/customer-order/:id",
    component: CustomerOrder,
  },
  {
    path: "/our-staff",
    component: Staff,
  },
  {
    path: "/superadmin/staff",
    component: ListStaff,
  },
  {
    path: "/riders",
    component: Riders,
  },
  {
    path: "/riders/:id",
    component: RiderDetail,
  },
  {
    path: "/posts",
    component: Posts,
  },
  {
    path: "/posts/add",
    component: PostEditor,
  },
  {
    path: "/posts/:id/edit",
    component: PostEditor,
  },
  {
    path: "/post-categories",
    component: PostCategories,
  },
  {
    path: "/post-tags",
    component: PostTags,
  },
  {
    path: "/post-comments",
    component: PostComments,
  },
  {
    path: "/orders",
    component: Orders,
  },
  {
    path: "/returns",
    component: Returns,
  },
  {
    // Everything that links to an order  the list, the notifications, the
    // driver screens  lands on the page where it can be worked on. The
    // invoice is one click away from there.
    path: "/order/:id",
    component: OrderEdit,
  },
  {
    path: "/order/:id/invoice",
    component: OrderInvoice,
  },
  {
    path: "/coupons",
    component: Coupons,
  },
  {
    path: "/platform-coupons",
    component: PlatformCoupons,
  },
  {
    path: "/support-tickets",
    component: SupportTickets,
  },
  {
    // Must stay ordered before "/support-tickets/:id"  react-router v5's
    // <Switch> takes the first match, and ":id" would otherwise swallow
    // "support-analytics" as if it were a ticket id.
    path: "/support-tickets/support-analytics",
    component: SupportAnalytics,
  },
  {
    path: "/support-tickets/:id",
    component: SupportTicketDetail,
  },
  {
    path: "/plans",
    component: Plans,
  },
  {
    path: "/plans/:id",
    component: PlanDetail,
  },
  {
    path: "/plan-prices",
    component: PlanPrices,
  },
  {
    path: "/plan-versions",
    component: PlanVersions,
  },
  {
    path: "/plan-templates",
    component: PlanTemplates,
  },
  {
    path: "/trial-factors",
    component: TrialFactors,
  },
  {
    path: "/trial-rules",
    component: TrialRules,
  },
  {
    path: "/plan-eligibility",
    component: PlanEligibility,
  },
  {
    path: "/soft-limits",
    component: SoftLimits,
  },
  {
    path: "/features",
    component: Features,
  },
  {
    path: "/feature-groups",
    component: FeatureGroups,
  },
  {
    path: "/quota-types",
    component: QuotaTypes,
  },
  { path: "/subscriptions", component: Subscriptions },
  { path: "/invoices", component: Invoices },
  { path: "/invoices/:id", component: InvoiceDetail },
  { path: "/payments", component: Payments },
  { path: "/billing/usage-tracking", component: UsageTracking },
  {
    path: "/trial-management",
    component: TrialManagement,
  },
  { path: "/billing/subscription-history", component: SubscriptionHistory },
  { path: "/billing/subscription-events", component: SubscriptionEvents },
  { path: "/billing/feature-flags", component: FeatureFlags },
  { path: "/billing/reports", component: BillingReports },
  { path: "/billing/audit-logs", component: AuditLogs },
  { path: "/billing/audit-logs-enriched", component: EnrichedAuditLogs },
  { path: "/billing/upgrade-rules", component: UpgradeRules },
  { path: "/billing/downgrade-rules", component: DowngradeRules },
  { path: "/billing/overages", component: Overages },
  { path: "/billing/grace-periods", component: GracePeriods },
  { path: "/billing/discounts", component: Discounts },
  { path: "/billing/invoices", component: Invoices },
  { path: "/billing/payment-methods", component: PaymentMethods },
  { path: "/billing/payment-rules", component: PaymentRules },
  { path: "/billing/transactions", component: Transactions },
  { path: "/store/my-subscription", component: MySubscription },
  { path: "/store/my-usage", component: MyUsage },
  { path: "/store/my-invoices", component: MyInvoices },
  { path: "/settings", component: Setting },
  { path: "/settings/roles", component: Roles },
  { path: "/settings/permissions", component: RolePermissions },
  { path: "/settings/payments", component: PaymentSettings },
  { path: "/settings/notifications", component: NotificationPreferences },
  {
    path: "/store/customization",
    component: StoreHome,
  },
  {
    path: "/store",
    component: Storefront,
  },
  {
    path: "/store/themes",
    component: Themes,
  },
  {
     path: "/store/themes/:themeId/edit",
    component: ThemeEditor,
    exact: true,
  },
  {

    path: "/store/store-settings",
    component: StoreSetting,
  },
  {
    path: "/store/pages",
    component: StorePages,
  },
  {
    path: "/404",
    component: Page404,
  },
  {
    path: "/coming-soon",
    component: ComingSoon,
  },
  {
    path: "/edit-profile",
    component: EditProfile,
  },
  {
    path: "/notifications",
    component: Notifications,
  },
  {
    path: "/profitability",
    component: Profitability,
  },
  {
    path: "/platform/notification-templates",
    component: NotificationTemplates,
  },
  {
    path: "/integrations",
    component: IntegrationsPage,
  },
  {
    path: "/integrations/delivery",
    component: DeliveryPage,
  },
];

const routeAccessList = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Super Admin Users", value: "platform-users" },
  { label: "Super Admin Dashboard", value: "platform-dashboard" },
  { label: "Super Admin Invitations", value: "platform-invitations" },
  { label: "Super Admin Teams", value: "platform-teams" },
  { label: "Super Admin Roles", value: "platform-roles" },
  { label: "Super Admin Audit Logs", value: "platform-audit" },
  { label: "Platform Audit Logs", value: "platform-audit-logs" },
  { label: "Platform Logs Monitoring", value: "platform-logs" },
  { label: "Super Admin Settings", value: "platform-settings" },
  { label: "Analytics", value: "analytics" },
  { label: "Stores", value: "stores" },
  { label: "Products", value: "products" },
  { label: "Categories", value: "categories" },
  { label: "Attributes", value: "attributes" },
  { label: "Tags", value: "product-tags" },
  { label: "Brands", value: "brands" },
  { label: "Reviews", value: "product-reviews" },
  { label: "Store Coupons", value: "coupons" },
  { label: "Platform Coupons", value: "platform-coupons" },
  { label: "Support Tickets", value: "support-tickets" },
  { label: "Support Analytics", value: "support-analytics" },
  { label: "Plans", value: "plans" },
  { label: "Plan Detail", value: "plan-detail" },
  { label: "Plan Prices", value: "plan-prices" },
  { label: "Plan Versions", value: "plan-versions" },
  { label: "Plan Templates", value: "plan-templates" },
  { label: "Trial Factors", value: "trial-factors" },
  { label: "Trial Rules", value: "trial-rules" },
  { label: "Upgrade Rules", value: "upgrade-rules" },
  { label: "Downgrade Rules", value: "downgrade-rules" },
  { label: "Overages", value: "overages" },
  { label: "Grace Periods", value: "grace-periods" },
  { label: "Discounts", value: "discounts" },
  { label: "Invoices", value: "invoices" },
  { label: "Plan Eligibility", value: "plan-eligibility" },
  { label: "Soft Limits", value: "soft-limits" },
  { label: "Features", value: "features" },
  { label: "Feature Groups", value: "feature-groups" },
  { label: "Quota Types", value: "quota-types" },
  { label: "Subscriptions", value: "subscriptions" },
  { label: "Payments", value: "payments" },
  { label: "Payment Methods", value: "payment-methods" },
  { label: "Payment Rules", value: "payment-rules" },
  { label: "Transactions", value: "transactions" },
  { label: "My Subscription", value: "my-subscription" },
  { label: "My Usage", value: "my-usage" },
  { label: "My Invoices", value: "my-invoices" },
  { label: "Usage Tracking", value: "usage-tracking" },
  { label: "Platform User", value: "platform-user" },
  { label: "Platform Role", value: "platform-role" },
  { label: "Audit", value: "audit" },
  { label: "Enriched Audit Logs", value: "billing-audit-logs-enriched" },
  { label: "Analytics", value: "analytics" },
  { label: "Customers", value: "customers" },
  { label: "Orders", value: "orders" },
  { label: "Returns", value: "returns" },
  { label: "Staff", value: "our-staff" },
  { label: "Platform Staff", value: "list-staff" },
  { label: "Riders", value: "riders" },
  { label: "Posts", value: "posts" },
  { label: "Post Categories", value: "post-categories" },
  { label: "Post Tags", value: "post-tags" },
  { label: "Post Comments", value: "post-comments" },
  { label: "Settings", value: "settings" },
  { label: "Roles", value: "roles" },
  { label: "Permissions", value: "permissions" },
  { label: "PaymentSettings", value: "payment-settings" },
  { label: "Languages", value: "languages" },
  { label: "Currencies", value: "currencies" },
  { label: "ViewStore", value: "store" },
  { label: "StoreCustomization", value: "customization" },
  { label: "Themes", value: "themes" },
  { label: "StoreSettings", value: "store-settings" },
  { label: "Product Details", value: "product" },
  { label: "Order Invoice", value: "order" },
  { label: "Edit Profile", value: "edit-profile" },
  { label: "Customer Order", value: "customer-order" },
  { label: "Notification", value: "notifications" },
  { label: "Coming Soon", value: "coming-soon" },
{ label: "Profitability Calculator", value: "profitability" },
  { label: "Marketing Settings", value: "marketing" },
  { label: "Facebook Catalog", value: "integrations" },
  { label: "AI Providers", value: "ai-providers" },
  { label: "Platform Notes", value: "platform-notes" },
  { label: "Delivery Integrations", value: "integrations-delivery" },
];

export { routeAccessList, routes };
