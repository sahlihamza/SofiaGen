const { normalizePermissionCode } = require("../../utils/normalizePermissionCode");

const standardActions = ["view", "create", "update", "delete"];

const modules = [
  { name: "Dashboard", actions: [...standardActions, "export"] },
  { name: "Platform Dashboard", actions: ["view"] },
  { name: "Products", actions: [...standardActions, "duplicate", "publish", "feature"] },
  { name: "Categories", actions: standardActions },
  { name: "Attributes", actions: standardActions },
  { name: "Coupons", actions: [...standardActions, "duplicate", "activate", "deactivate", "export"] },
  { name: "Customers", actions: standardActions },
  // SFG-155: print_label covers both the Packing Label and the Packing
  // Manifest  one permission for "may produce the shipping paperwork".
  { name: "Orders", actions: [...standardActions, "cancel", "refund", "print_label"] },
  { name: "Staff", actions: [...standardActions, "invite", "suspend", "reactivate", "assignRole", "resetPassword", "reset2fa", "logoutAllDevices"] },
  { name: "Riders", actions: standardActions },
  { name: "Reviews", actions: [...standardActions, "approve", "reply"] },
  { name: "Posts", actions: [...standardActions, "publish", "archive", "manageCategories", "manageTags", "manageComments"] },
  { name: "Analytics", actions: ["view", "export"] },
  { name: "Settings", actions: standardActions },
  { name: "Website Visibility", actions: ["view", "update", "preview"] },
  { name: "Online Store", actions: standardActions },
  { name: "Marketing", actions: ["view", "update", "test"] },
  { name: "Pages", actions: standardActions },
  { name: "Plans", actions: [...standardActions, "activate", "deactivate", "clone", "archive", "assign"] },
  { name: "Features", actions: standardActions },
  { name: "QuotaTypes", actions: standardActions },
  { name: "Subscriptions", actions: [...standardActions, "suspend", "reactivate", "retry"] },
  { name: "Invoices", actions: [...standardActions, "send"] },
  { name: "Payments", actions: [...standardActions, "refund"] },
  { name: "Notifications", actions: ["view", "update", "delete", "manage"] },
  { name: "Platform Notification", actions: [
    "view", "update", "delete", "manage",
    "events_view", "rules_view", "rules_manage",
    "templates_view", "templates_manage",
    "channels_view", "channels_manage",
    "logs_view", "analytics_view",
  ] },
  { name: "Platform Plan", actions: [...standardActions, "export"] },
  { name: "Platform Billing", actions: [...standardActions, "export"] },
  { name: "Platform User", actions: [
    ...standardActions,
    "suspend", "activate", "sessions",
    "impersonate", "export", "login_history",
  ]},
  { name: "Platform Role", actions: [...standardActions, "export"] },
  { name: "Platform Coupons", actions: [...standardActions, "export"] },
  { name: "Platform Store", actions: ["view", "create", "update", "delete", "suspend", "activate", "restore", "transfer", "impersonate", "export", "view_members", "view_teams", "view_audit"] },
  { name: "Platform Settings", actions: ["view", "update"] },
  { name: "Platform Invitation", actions: ["view", "create", "resend", "cancel", "revoke", "export"] },
  { name: "Platform Team", actions: [...standardActions, "members_manage", "export"] },
  { name: "Platform Carrier", actions: [...standardActions, "stats"] },

  { name: "Audit", actions: ["view", "export"] },
  { name: "Support Ticket", actions: ["view", "create", "update", "assign", "reply"] },
  { name: "Support Analytics", actions: ["view"] },
  { name: "Platform Support Ticket", actions: ["view"] },
  { name: "Theme", actions: ["view", "create", "update", "delete", "publish", "duplicate", "export", "import"] },
  { name: "Page", actions: ["view", "create", "update", "delete", "publish", "duplicate", "set_home", "restore_version", "compare_versions"] },
  { name: "Media", actions: ["view", "create", "update", "delete", "upload"] },
  { name: "Sections", actions: ["view", "create", "update", "delete"] },
  { name: "Template", actions: ["view", "create", "update", "delete", "duplicate"] },
  { name: "Saved Blocks", actions: ["view", "create", "update", "delete"] },
  { name: "Team", actions: ["view", "create", "update", "delete", "members_manage"] },
  { name: "Platform Email", actions: ["test"] },
// Internal notes attached to any resource (orders, customers, products, tickets,
  // shipments, invoices, stores, ...). Multi-tenant, always scoped to a storeId.
  // Frontend MUST NOT send storeId / authorId; they are derived from the auth context.
  // The "Platform Notes" module (platform.notes.*) powers the super-admin
  // memos that are NOT attached to a tenant resource  see platformNoteRoutes.
  { name: "Notes", actions: ["view", "create", "update", "delete", "pin"] },
  { name: "Platform Notes", actions: ["view", "create", "update", "delete", "pin"] },

  // Malla  the in-app AI assistant.
  // All actions are store-scoped: every chat, conversation and tool call is
  // resolved against `req.authContext.storeId` (NOT the body, NOT the query)
  // and the underlying provider is invoked server-side, so the user's role
  // and the active plan are the only things that ever gate access.
  // Canonical codes: ai_assistant.use, ai_assistant.history.view,
  //                  ai_assistant.actions.confirm, ai_assistant.settings.manage,
  //                  ai_assistant.usage.view, ai_assistant.providers.manage.
  // Sales channels / store-side integrations (Facebook Catalog, Google
  // Shopping, Instagram, ...). Each new channel adds actions on the same
  // module so admins only need to manage one permission prefix per store.
  { name: "Integrations", actions: ["view", "create", "update", "delete", "test", "regenerate"] },

  { name: "AI Assistant", actions: [
    "view",
    "use",
    "history_view",
    "conversations_view",
    "settings_manage",
    "usage_view",
    "providers_manage",
    "actions_confirm",
  ] },

  { name: "Carrier", actions: [...standardActions] },
];

const getCategoryForModule = (moduleName) => {
  const platformModules = [
    "Dashboard", "Platform Dashboard", "Plans", "Platform Plan", "Platform Billing",
    "Platform User", "Platform Role", "Platform Coupons", "Platform Store",
    "Platform Settings", "Platform Invitation", "Platform Team",
    "Audit", "Analytics", "Settings", "Platform Support Ticket",
  ];
  const billingModules = ["Subscriptions", "Invoices", "Payments"];
  const catalogModules = ["Products", "Categories", "Attributes", "Coupons", "Reviews", "Pages", "Online Store"];
  const customerModules = ["Customers", "Orders", "Staff", "Riders", "Support Ticket", "Support Analytics"];
  const featureModules = ["Features", "QuotaTypes"];
  const contentModules = ["Posts"];
const storeModules = ["Settings", "Theme", "Page", "Media", "Sections", "Marketing", "Template", "Saved Blocks"];

  if (platformModules.includes(moduleName)) return "Platform Management";
  if (billingModules.includes(moduleName)) return "Billing";
  if (catalogModules.includes(moduleName)) return "Catalog";
  if (customerModules.includes(moduleName)) return "Customers & Operations";
  if (featureModules.includes(moduleName)) return "Features & Quotas";
  if (contentModules.includes(moduleName)) return "Content";
  if (storeModules.includes(moduleName)) return "Store Management";
  return "General";
};

const getScopeForModule = (moduleName) => {
  const platformModules = [
    "Platform Dashboard", "Platform Plan", "Platform Billing", "Platform User",
    "Platform Role", "Platform Coupons", "Platform Store", "Platform Settings",
    "Platform Invitation", "Platform Team", "Audit", "Analytics",
    "Platform Email", "Platform Support Ticket", "Platform Notification",
    "Platform Notes",
    // Malla / Sofia AI Assistant is reachable both from the store-side
    // (where ai.assistant.use is gated per-store) AND from the platform
    // side (super-admins browsing without an active store).
    "AI Assistant",
  ];
  return platformModules.includes(moduleName) ? "platform" : "store";
};

const RISK_BY_ACTION = {
  view: "low",
  list: "low",
  create: "medium",
  update: "medium",
  publish: "medium",
  activate: "medium",
  deactivate: "high",
  delete: "high",
  refund: "high",
  archive: "high",
  suspend: "high",
  reactivate: "high",
  cancel: "high",
  revoke: "high",
  export: "medium",
  // Reading an order's shipping paperwork  no state change on the order.
  print_label: "low",
  assign: "high",
  clone: "medium",
  send: "medium",
  retry: "medium",
  manage: "medium",
  members_manage: "high",
  duplicate: "medium",
  feature: "medium",
  approve: "medium",
  reply: "medium",
  assignRole: "high",
  resetPassword: "high",
  reset2fa: "critical",
  logoutAllDevices: "high",
  "set.home": "medium",
  "restore.version": "medium",
  "compare.versions": "low",
  preview: "low",
  manageCategories: "medium",
  manageTags: "medium",
  manageComments: "medium",
  "view.activity": "low",
  "revoke.sessions": "high",
  "reset.password": "high",
  block: "high",
  unblock: "medium",
  impersonate: "critical",
  invite: "medium",
  role_assign: "high",
  team_manage: "high",
  restore: "high",
  transfer: "critical",
  view_members: "low",
  view_teams: "low",
  view_audit: "low",
  import: "medium",
  upload: "medium",
  set_home: "medium",
  restore_version: "medium",
  compare_versions: "low",
  pin: "medium",
};

function getRiskLevel(action) {
  return RISK_BY_ACTION[action] || "low";
}

const permissions = [];
for (const { name: mod, actions } of modules) {
  for (const action of actions) {
    // The action is author-written and may be camelCase or snake_case
    // ("assignRole", "login_history"), neither of which the Permission model's
    // code validator accepts. normalizePermissionCode is the same function the
    // RBAC middleware runs on both sides of a permission check, so building the
    // code through it keeps the seeded code and the checked code identical.
    const code = normalizePermissionCode(`${mod}.${action}`);
    permissions.push({
      code,
      name: `${mod.toLowerCase().replace(/\s+/g, "_")}_${action.replace(/\./g, "_")}`,
      module: mod,
      action,
      scope: getScopeForModule(mod),
      category: getCategoryForModule(mod),
      riskLevel: getRiskLevel(action),
      description: `${action.replace(/\./g, " ")} ${mod.toLowerCase()}`,
    });
  }
}

module.exports = { permissions, modules, RISK_BY_ACTION, getRiskLevel };
