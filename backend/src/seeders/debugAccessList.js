const mongoose = require("mongoose");
require("../models/User");
require("../models/Role");
require("../models/Permission");
const User = require("../models/User");

const routeAccessList = [
  "dashboard", "platform-users", "platform-dashboard", "platform-invitations",
  "platform-teams", "platform-roles", "platform-audit",
  "platform-settings", "analytics", "stores", "products",
  "categories", "attributes", "product-tags", "brands", "product-reviews",
  "coupons", "platform-coupons", "plans", "plan-detail", "plan-prices",
  "plan-versions", "plan-templates", "trial-factors", "trial-rules",
  "upgrade-rules", "downgrade-rules", "overages", "grace-periods",
  "discounts", "invoices", "plan-eligibility", "soft-limits", "features",
  "feature-groups", "quota-types", "subscriptions", "payments",
  "payment-methods", "my-subscription", "my-usage", "my-invoices",
  "usage-tracking", "platform-user", "platform-role",
  "audit", "billing-audit-logs-enriched", "analytics", "customers",
  "orders", "our-staff", "list-staff", "riders", "posts", "post-categories",
  "post-tags", "post-comments", "settings", "roles", "permissions",
  "payment-settings", "languages", "currencies", "store", "customization",
  "themes", "store-settings", "product", "order", "edit-profile",
  "customer-order", "notifications", "coming-soon"
];

const permissionModuleToRouteKeys = {
  dashboard: ["dashboard"],
  analytics: ["analytics"],
  products: ["products", "product"],
  categories: ["categories"],
  attributes: ["attributes"],
  coupons: ["coupons"],
  "platform-coupons": ["platform-coupons"],
  plans: ["plans", "plan-detail"],
  features: ["features"],
  "quota-types": ["quota-types", "quotatypes"],
  subscriptions: ["subscriptions"],
  invoices: ["invoices"],
  payments: ["payments"],
  "usage-tracking": ["usage-tracking"],
  customers: ["customers", "customer-order"],
  orders: ["orders", "order"],
  staff: ["our-staff"],
  riders: ["riders"],
  reviews: ["product-reviews"],
  posts: ["posts", "post-categories", "post-tags", "post-comments", "post"],
  settings: ["settings", "edit-profile", "roles", "permissions"],
  "online store": ["store", "customization", "themes", "store-settings"],
  "online-store": ["store", "customization", "themes", "store-settings"],
  notifications: ["notifications"],
  pages: ["404", "coming-soon", "currencies"],
  "platform-user": ["platform-users"],
  "platform-role": ["platform-roles"],
  audit: ["audit", "platform-audit", "platform-audit-logs"],
};

const normalizeRouteKey = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "-")
    : "";

const extractAccessFromPermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];
  return permissions.flatMap((permission) => {
    if (typeof permission === "string") {
      const parts = permission.split(/[._]/).filter(Boolean);
      if (parts.length <= 1) return [];
      const moduleKey = normalizeRouteKey(parts.slice(0, -1).join(" "));
      if (!moduleKey) return [];
      return permissionModuleToRouteKeys[moduleKey] || [moduleKey];
    }
    const moduleKey = normalizeRouteKey(permission?.module);
    if (!moduleKey) return [];
    return permissionModuleToRouteKeys[moduleKey] || [moduleKey];
  });
};

const filterValidAccessKeys = (values) => {
  const deduped = [...new Set(values.filter(Boolean))];
  const valid = deduped.filter((key) => routeAccessList.includes(key));
  const invalid = deduped.filter((key) => !routeAccessList.includes(key));
  if (invalid.length) {
    console.log("filtered out keys:", invalid.slice(0, 20));
  }
  return valid;
};

const normalizeAccessList = (source) => {
  const sourceList = Array.isArray(source) ? source : source ? [source] : [];
  const access = sourceList.flatMap((item) => {
    if (typeof item === "string") {
      return [normalizeRouteKey(item)];
    }
    if (Array.isArray(item)) {
      return normalizeAccessList(item);
    }
    if (item && typeof item === "object") {
      if (typeof item.value === "string") {
        return [normalizeRouteKey(item.value)];
      }
      if (typeof item.path === "string") {
        const segments = item.path.split("?")[0].split("/").filter(Boolean) || [];
        const last = segments[segments.length - 1] || "";
        return [normalizeRouteKey(last)];
      }
      if (item.module && item.action) {
        return extractAccessFromPermissions([item]);
      }
      if (Array.isArray(item.permissions)) {
        return extractAccessFromPermissions(item.permissions);
      }
    }
    return [];
  });
  return filterValidAccessKeys(access);
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");
  const user = await User.findOne({ email: "adminstore@gmail.com", deletedAt: null })
    .populate({ path: "role", populate: { path: "permissions" } })
    .lean();

  if (!user || !user.role || !user.role.length) {
    console.log("No role found on user");
    await mongoose.disconnect();
    return;
  }

  const role = user.role[0];
  console.log("Role:", role.name, "(" + role.slug + ")");
  console.log("Permissions count:", role.permissions?.length || 0);

  const accessList = normalizeAccessList(role);
  console.log("AccessList length:", accessList.length);
  console.log("AccessList full:", accessList);

  const modules = [...new Set((role.permissions || []).map(p => p.module))];
  console.log("Unique modules in role:", modules.length);
  console.log("Modules:", modules.sort().join(", "));

  const debugModules = ["QuotaTypes", "Pages", "Online Store"];
  debugModules.forEach((moduleName) => {
    const perms = (role.permissions || []).filter((p) => p.module === moduleName);
    const extracted = extractAccessFromPermissions(perms);
    console.log(`\nDebug ${moduleName}: perms=${perms.length}, extracted=${JSON.stringify(extracted)}`);
  });

  const sidebarPaths = [
    "/dashboard", "/analytics", "/stores", "/products", "/categories",
    "/attributes", "/product-tags", "/brands", "/product-reviews", "/coupons",
    "/platform/coupons", "/billing/plans", "/features", "/quota-types",
    "/subscriptions", "/invoices", "/payments", "/usage-tracking",
    "/customers", "/orders", "/our-staff", "/riders", "/posts",
    "/post-categories", "/post-tags", "/post-comments", "/settings",
    "/settings/roles", "/settings/permissions", "/languages", "/currencies",
    "/store", "/store/customization", "/store/themes", "/store/store-settings",
    "/404", "/coming-soon", "/notifications",
    "/platform/users", "/platform/roles", "/platform/audit-logs",
    "/platform/settings"
  ];

  console.log("\nSimulated filterRoutes for sample paths:");
  sidebarPaths.forEach((path) => {
    const segments = path.split("?")[0].split("/").filter(Boolean) || [];
    const routeKey = segments[segments.length - 1];
    let matched = accessList.includes(routeKey);
    if (!matched && segments[0] === "platform") {
      matched = accessList.includes(`platform-${routeKey}`);
      if (!matched && segments.length > 2) {
        for (let i = 1; i < segments.length - 1; i++) {
          if (accessList.includes(segments[i]) || accessList.includes(`platform-${segments[i]}`)) {
            matched = true;
            break;
          }
        }
      }
    }
    console.log(` ${matched ? "" : ""} ${path}`);
  });

  await mongoose.disconnect();
})();
