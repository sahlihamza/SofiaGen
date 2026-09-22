// Seed data for the `permissions` collection (models/Permission.js). Roles
// reference these documents by _id (see ./roles), the same pattern ./admin
// uses to reference ids from ./roles. Keep the module/action list in sync
// with src/script/seedPermissions.js.
const standardActions = ["view", "create", "update", "delete"];

const modules = [
  { name: "Dashboard", actions: standardActions },
  { name: "Products", actions: [...standardActions, "duplicate"] },
  { name: "Categories", actions: standardActions },
  { name: "Attributes", actions: standardActions },
  { name: "Coupons", actions: [...standardActions, "duplicate", "activate", "deactivate", "export"] },
  { name: "Customers", actions: standardActions },
  { name: "Orders", actions: standardActions },
  { name: "Staff", actions: standardActions },
  { name: "Riders", actions: standardActions },
  { name: "Settings", actions: standardActions },
{ name: "Online Store", actions: standardActions },
  { name: "Pages", actions: standardActions },
  { name: "Theme", actions: [...standardActions, "publish", "duplicate", "export", "import"] },
  { name: "Page", actions: [...standardActions, "publish", "duplicate", "set_home", "restore_version", "compare_versions"] },
  { name: "Media", actions: [...standardActions, "upload"] },
  { name: "Menus", actions: [...standardActions, "duplicate"] },
  { name: "Sections", actions: standardActions },
  { name: "Forms", actions: [...standardActions, "export"] },
  { name: "Testimonials", actions: [...standardActions, "approve", "reply"] },
  { name: "Saved Blocks", actions: standardActions },
  { name: "Templates", actions: [...standardActions, "duplicate"] },
  { name: "Payments", actions: [...standardActions, "refund"] },
  // Platform-level (SuperAdmin) permissions
  { name: "Platform Plan", actions: standardActions },
  { name: "Platform User", actions: ["view", "create", "delete"] },
  { name: "Platform Role", actions: [...standardActions] },
  { name: "Platform Coupons", actions: standardActions },
  // Global audit & analytics
  { name: "Audit", actions: ["view"] },
  { name: "Analytics", actions: ["view"] },
  { name: "Website Visibility", actions: ["view", "update", "preview"] },
  { name: "Reviews", actions: [...standardActions, "approve", "reply"] },
  {
    name: "Posts",
    actions: [
      ...standardActions,
      "publish",
      "archive",
      "manageCategories",
      "manageTags",
      "manageComments",
    ],
  },
];

const permissions = [];
let index = 1;
for (const { name: mod, actions } of modules) {
  for (const action of actions) {
    const code = `${mod.toLowerCase().replace(/\s+/g, "_")}.${action}`;
    permissions.push({
      _id: `64c0${String(index).padStart(20, "0")}`,
      code,
      name: `${mod.toLowerCase().replace(/\s+/g, "_")}_${action}`,
      module: mod,
      action,
      scope: ["Dashboard", "Products", "Categories", "Attributes", "Coupons", "Customers", "Orders", "Staff", "Riders", "Settings", "Online Store", "Pages", "Platform Plan", "Platform User", "Platform Role", "Platform Coupons", "Audit", "Analytics"].includes(mod) && ["Platform Plan", "Platform User", "Platform Role", "Platform Coupons", "Audit", "Analytics"].includes(mod) ? "platform" : "store",
      category: "General",
      riskLevel: "low",
      description: `${action} ${mod.toLowerCase()}`,
    });
    index++;
  }
}

module.exports = permissions;
