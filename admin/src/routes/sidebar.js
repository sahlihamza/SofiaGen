import {
  FiGrid,
  FiUsers,
  FiUser,
  FiUserCheck,
  FiCompass,
  FiSettings,
  FiShield,
FiActivity,
  FiCpu,
  FiSlack,
  FiGlobe,
  FiTarget,
  FiTrendingUp,
  FiCreditCard,
  FiShoppingCart,
  FiTag,
  FiShoppingBag,
  FiTruck,
  FiLayers,
  FiEdit3,
  FiClock,
  FiBarChart2,
  FiFileText,
  FiTool,
  FiMail,
  FiGitMerge,
  FiLifeBuoy,
  FiBell,
  FiRotateCcw,
} from "react-icons/fi";

/**
 *  These are used just to render the Sidebar!
 * You can include any link here, local or external.
     routes: [
       {
         path: "/settings",
         name: "Settings",
       },
       {
         path: "/settings/roles",
         name: "Roles",
         icon: FiShield,
       },
     ],
  *
  * If you're looking to actual Router routes, go to
  * routes/index.js
 */
const sidebar = [
  {
    path: "/dashboard",
    moduleKey: "dashboard",
    icon: FiGrid,
    name: "Dashboard",
  },

  {
    path: "/profitability",
    moduleKey: "profitability",
    icon: FiTrendingUp,
    name: "ProfitabilityCalculator",
  },

  {
    path: "/settings/marketing",
    moduleKey: "marketing",
    icon: FiTarget,
    name: "MarketingSettings",
  },

  {
    path: "/integrations/facebook-catalog",
    moduleKey: "integrations",
    icon: FiShoppingBag,
    name: "FacebookCatalog",
  },

  {
    path: "/settings/ai-providers",
    moduleKey: "ai-providers",
    icon: FiCpu,
    name: "AIProviders",
  },

  {
    icon: FiShield,
    name: "Platform",
    requiresSuperAdmin: true,
    routes: [
      {
        path: "/platform/dashboard",
        moduleKey: "platform-dashboard",
        name: "Dashboard",
        icon: FiGrid,
      },
      {
        path: "/platform/users",
        moduleKey: "platform-user",
        name: "User Management",
        icon: FiUsers,
      },
      {
        path: "/platform/invitations",
        moduleKey: "platform-invitation",
        name: "Invitations",
        icon: FiMail,
      },
      {
        path: "/platform/teams",
        moduleKey: "platform-team",
        name: "Teams",
        icon: FiGitMerge,
      },
      {
        path: "/superadmin/staff",
        moduleKey: "platform-user",
        name: "Platform Staff",
        icon: FiUserCheck,
      },
      {
        path: "/platform/roles",
        moduleKey: "platform-role",
        name: "Roles & Permissions",
        icon: FiShield,
      },
      {
        path: "/platform/audit-logs",
        moduleKey: "audit",
        name: "Audit Logs",
        icon: FiFileText,
      },
      {
        path: "/platform/logs",
        name: "Logs Monitoring",
        icon: FiFileText,
      },
      {
        path: "/platform/security-center",
        moduleKey: "audit",
        name: "Security Center",
        icon: FiShield,
      },
      {
        path: "/platform/jobs-monitor",
        moduleKey: "audit",
        name: "Jobs Monitor",
        icon: FiActivity,
      },
      {
        path: "/platform/settings",
        moduleKey: "platform-settings",
        name: "Platform Settings",
        icon: FiTool,
      },
      {
        path: "/platform/notifications",
        moduleKey: "platform-notification",
        name: "Notifications Engine",
        icon: FiBell,
      },
      {
        path: "/platform/notes",
        moduleKey: "platform-notes",
        name: "PlatformNotes",
        icon: FiFileText,
      },
      {
        path: "/stores",
        moduleKey: "platform-store",
        name: "Stores",
        icon: FiShoppingBag,
      },
    ],
  },

  {
    icon: FiCreditCard,
    name: "Paiements",
    requiresSuperAdmin: true,
    routes: [
      {
        path: "/billing/payment-methods",
        moduleKey: "payments",
        name: "Payment Methods",
        icon: FiCreditCard,
      },
      {
        path: "/settings/payments",
        moduleKey: "settings",
        name: "Payment Providers",
        icon: FiCreditCard,
      },
      {
        path: "/billing/payment-rules",
        moduleKey: "payments",
        name: "Payment Rules",
        icon: FiFileText,
      },
      {
        path: "/billing/transactions",
        moduleKey: "payments",
        name: "Transactions",
        icon: FiCreditCard,
      },
    ],
  },

  {
    icon: FiCreditCard,
    name: "My Store",
    routes: [
      {
        path: "/store/my-subscription",
        moduleKey: "subscriptions",
        name: "My Subscription",
      },
      {
        path: "/store/my-usage",
        moduleKey: "usage-tracking",
        name: "My Usage",
      },
      {
        path: "/store/my-invoices",
        moduleKey: "invoices",
        name: "My Invoices",
      },
    ],
  },
  {
    icon: FiTag,
    name: "Marketing",
    requiresSuperAdmin: true,
    routes: [
      {
        path: "/platform/notification-templates",
        name: "Notification Templates",
        icon: FiMail,
      },
      {
        path: "/platform-coupons",
        moduleKey: "platform-coupons",
        name: "Platform Coupons",
        icon: FiTag,
      },
    ],
  },

  {
    icon: FiShoppingCart,
    name: "Products",
    moduleKey: "products",
    routes: [
      {
        path: "/products",
        moduleKey: "products",
        name: "All Products",
      },
      {
        path: "/categories",
        moduleKey: "categories",
        name: "Categories",
      },
      {
        path: "/attributes",
        moduleKey: "attributes",
        name: "Attributes",
      },
      {
        path: "/product-tags",
        moduleKey: "products",
        name: "Tags",
      },
      {
        path: "/brands",
        moduleKey: "products",
        name: "Brands",
      },
      {
        path: "/product-reviews",
        moduleKey: "reviews",
        name: "Reviews",
      },
    ],
  },

  {
    path: "/coupons",
    moduleKey: "coupons",
    icon: FiTag,
    name: "Store Coupons",
  },
  {
    icon: FiLifeBuoy,
    name: "SupportTickets",
    requiresSuperAdmin: true,
    routes: [
      { path: "/support-tickets", name: "SupportTicketsAllTickets" },
      { path: "/support-tickets/support-analytics", name: "SupportAnalyticsTitle", icon: FiBarChart2 },
    ],
  },
  {
    path: "/customers",
    moduleKey: "customers",
    icon: FiUsers,
    name: "Customers",
  },
  {
    path: "/orders",
    moduleKey: "orders",
    icon: FiCompass,
    name: "Orders",
  },
  {
    path: "/returns",
    moduleKey: "orders",
    icon: FiRotateCcw,
    name: "Returns",
  },

  {
    path: "/our-staff",
    moduleKey: "staff",
    icon: FiUser,
    name: "OurStaff",
  },
  {
    path: "/riders",
    moduleKey: "riders",
    icon: FiTruck,
    name: "Riders",
  },

  {
    icon: FiEdit3,
    name: "Blog",
    moduleKey: "posts",
    routes: [
      { path: "/posts", moduleKey: "posts", name: "AllPosts" },
      { path: "/post-categories", moduleKey: "posts", name: "PostCategories" },
      { path: "/post-tags", moduleKey: "posts", name: "PostTags" },
      { path: "/post-comments", moduleKey: "posts", name: "PostComments" },
    ],
  },

  {
    icon: FiLayers,
    name: "Billing",
    requiresSuperAdmin: true,
    routes: [
      {
        path: "/plans",
        moduleKey: "plans",
        name: "Plans",
      },
      {
        path: "/plan-prices",
        moduleKey: "plans",
        name: "Plan Prices",
      },
      {
        path: "/plan-versions",
        moduleKey: "plans",
        name: "Plan Versions",
      },
      {
        path: "/plan-templates",
        moduleKey: "plans",
        name: "Plan Templates",
      },
      {
        path: "/subscriptions",
        moduleKey: "subscriptions",
        name: "Subscriptions",
      },
      {
        path: "/invoices",
        moduleKey: "invoices",
        name: "Invoices",
      },
      {
        path: "/billing/usage-tracking",
        moduleKey: "usage-tracking",
        name: "Usage Tracking",
      },
      {
        path: "/trial-management",
        moduleKey: "plans",
        name: "Trial Management",
      },
      {
        path: "/trial-rules",
        moduleKey: "plans",
        name: "Trial Rules",
      },
      {
        path: "/trial-factors",
        moduleKey: "plans",
        name: "Trial Factors",
      },
      {
        path: "/billing/upgrade-rules",
        moduleKey: "plans",
        name: "Upgrade Rules",
      },
      {
        path: "/billing/downgrade-rules",
        moduleKey: "plans",
        name: "Downgrade Rules",
      },
      {
        path: "/billing/overages",
        moduleKey: "plans",
        name: "Overages",
      },
      {
        path: "/billing/grace-periods",
        moduleKey: "plans",
        name: "Grace Periods",
      },
      {
        path: "/billing/discounts",
        moduleKey: "plans",
        name: "Discounts",
      },
      {
        path: "/billing/invoices",
        moduleKey: "invoices",
        name: "Invoices",
      },
      {
        path: "/plan-eligibility",
        moduleKey: "plans",
        name: "Eligibility",
      },
      {
        path: "/features",
        moduleKey: "features",
        name: "Features",
      },
      {
        path: "/feature-groups",
        moduleKey: "features",
        name: "Feature Groups",
      },
      {
        path: "/quota-types",
        moduleKey: "quota-types",
        name: "Quota Types",
      },
      {
        path: "/soft-limits",
        moduleKey: "plans",
        name: "Soft Limits",
      },
      {
        path: "/billing/subscription-history",
        moduleKey: "subscriptions",
        name: "Subscription History",
      },
      {
        path: "/billing/subscription-events",
        moduleKey: "subscriptions",
        name: "Subscription Events",
      },
      {
        path: "/billing/feature-flags",
        moduleKey: "features",
        name: "Feature Flags",
      },
      {
        path: "/billing/reports",
        moduleKey: "plans",
        name: "Reports",
      },
      {
        path: "/billing/audit-logs-enriched",
        moduleKey: "audit",
        name: "Enriched Audit Logs",
      },
    ],
  },
  {
    icon: FiTruck,
    name: "Integrations",
    moduleKey: "integrations",
    routes: [
      {
        path: "/integrations/delivery",
        moduleKey: "integrations-delivery",
        name: "Delivery",
      },
    ],
  },
  {
    icon: FiSettings,
    name: "Settings",
    moduleKey: "settings",
    routes: [
      {
        path: "/settings",
        moduleKey: "settings",
        name: "General Settings",
      },
      {
        path: "/settings/roles",
        moduleKey: "settings",
        name: "Roles",
      },
      {
        path: "/settings/permissions",
        moduleKey: "settings",
        name: "Permissions",
      },
      {
        path: "/settings/notifications",
        moduleKey: "settings",
        name: "Notification Preferences",
      },
      {
        path: "/settings/payments",
        moduleKey: "settings",
        name: "Payments",
      },
    ],
  },
  {
    icon: FiGlobe,
    name: "International",
    moduleKey: "settings",
    routes: [
      { path: "/languages", moduleKey: "settings", name: "Languages" },
      { path: "/currencies", moduleKey: "settings", name: "Currencies" },
    ],
  },
  {
    icon: FiTarget,
    name: "OnlineStore",
    moduleKey: "online-store",
    routes: [
      {
        name: "ViewStore",
        moduleKey: "online-store",
        path: "/store",
        outside: "store",
      },
      {
        path: "/store/customization",
        moduleKey: "online-store",
        name: "StoreCustomization",
      },
      {
        path: "/store/themes",
        moduleKey: "online-store",
        name: "Themes",
      },
      {
        path: "/store/store-settings",
        moduleKey: "online-store",
        name: "StoreSettings",
      },
      {
        path: "/store/pages",
        moduleKey: "online-store",
        name: "Pages",
      },
    ],
  },
  {
    icon: FiSlack,
    name: "Pages",
    moduleKey: "pages",
    routes: [
      {
        path: "/404",
        moduleKey: "pages",
        name: "404",
      },
      {
        path: "/coming-soon",
        moduleKey: "pages",
        name: "Coming Soon",
      },
    ],
  },
];

export default sidebar;
