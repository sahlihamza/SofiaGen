const { modules } = require("./permissions");

const MODULE_PERMISSION_PREFIXES = {
  dashboard: [],
  analytics: ["analytics."],
  products: ["products."],
  categories: ["categories."],
  attributes: ["attributes."],
  coupons: ["coupons."],
  "platform-coupons": ["platform.coupons."],
  plans: ["plans."],
  features: ["features."],
  "quota-types": ["quotatypes."],
  subscriptions: ["subscriptions."],
  invoices: ["invoices."],
  payments: ["payments."],
  "usage-tracking": [],
  customers: ["customers."],
  orders: ["orders."],
  staff: ["staff."],
  riders: ["riders."],
  reviews: ["reviews."],
  posts: ["posts."],
  settings: ["settings."],
  "online-store": ["online.store."],
  notifications: ["notifications."],
  pages: ["pages."],
  "platform-dashboard": ["platform.dashboard."],
  "platform-billing": ["platform.billing."],
  "platform-user": ["platform.user."],
  "platform-role": ["platform.role."],
  "platform-store": ["platform.store."],
  "platform-settings": ["platform.settings."],
  "platform-invitation": ["platform.invitation."],
  "platform-team": ["platform.team."],
  "platform-notification": ["platform.notification.", "notifications."],
  audit: ["audit."],
  team: ["team."],
  template: ["template."],
  "saved-blocks": ["saved.blocks."],
  "website-visibility": ["website.visibility."],
  "integrations": ["integrations."],
  notes: ["notes."],
  "platform-notes": ["platform.notes."],
};

function computeAccessibleModules(permissionCodes) {
  return Object.entries(MODULE_PERMISSION_PREFIXES)
    .filter(([, prefixes]) =>
      prefixes.length === 0 || prefixes.some((p) => permissionCodes.some((code) => code.startsWith(p)))
    )
    .map(([module]) => module);
}

module.exports = { MODULE_PERMISSION_PREFIXES, computeAccessibleModules };
