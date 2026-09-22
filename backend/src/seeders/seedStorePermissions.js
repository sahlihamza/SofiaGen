require("dotenv").config();
const mongoose = require("mongoose");
const Permission = require("../models/Permission");
const Role = require("../models/Role");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const standardActions = ["view", "create", "update", "delete"];

const modules = [
  { name: "Dashboard", actions: [...standardActions, "export"] },
  { name: "Products", actions: [...standardActions, "duplicate", "publish", "feature"] },
  { name: "Categories", actions: standardActions },
  { name: "Attributes", actions: standardActions },
  { name: "Coupons", actions: [...standardActions, "duplicate", "activate", "deactivate", "export"] },
  { name: "Customers", actions: standardActions },
  { name: "Orders", actions: [...standardActions, "cancel", "refund"] },
  { name: "Staff", actions: [...standardActions, "suspend", "reactivate", "assignRole", "resetPassword", "reset2fa", "logoutAllDevices"] },
  { name: "Riders", actions: standardActions },
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
  { name: "Analytics", actions: ["view"] },
  { name: "Settings", actions: standardActions },
  { name: "Website Visibility", actions: ["view", "update", "preview"] },
  { name: "Online Store", actions: standardActions },
  { name: "Pages", actions: standardActions },
  { name: "Stores", actions: standardActions },
  { name: "Brands", actions: standardActions },
  { name: "Product Tags", actions: standardActions },
  { name: "Theme", actions: [...standardActions, "publish", "duplicate", "export", "import"] },
  { name: "Page", actions: [...standardActions, "publish", "duplicate", "set_home", "restore_version", "compare_versions"] },
  { name: "Media", actions: [...standardActions, "upload"] },
  { name: "Menus", actions: [...standardActions, "duplicate"] },
  { name: "Sections", actions: standardActions },
  { name: "Forms", actions: [...standardActions, "export"] },
  { name: "Testimonials", actions: [...standardActions, "approve", "reply"] },
  { name: "Saved Blocks", actions: standardActions },
  { name: "Templates", actions: [...standardActions, "duplicate"] },
  { name: "Plans", actions: [...standardActions, "activate", "deactivate", "clone", "archive", "assign"] },
  { name: "Features", actions: standardActions },
  { name: "QuotaTypes", actions: standardActions },
  { name: "Subscriptions", actions: [...standardActions, "suspend", "reactivate", "retry"] },
  { name: "Invoices", actions: [...standardActions, "send"] },
  { name: "Payments", actions: [...standardActions, "refund"] },
  { name: "Usage Tracking", actions: ["view"] },
  { name: "Languages", actions: standardActions },
  { name: "Notifications", actions: ["view"] },
  { name: "Currencies", actions: standardActions },
  { name: "Payment Settings", actions: standardActions },
  { name: "Platform Plan", actions: standardActions },
  { name: "Platform User", actions: [...standardActions, "suspend", "reactivate", "resetPassword", "reset2fa", "logoutAllDevices", "assignRole"] },
  { name: "Platform Role", actions: standardActions },
  { name: "Platform Coupons", actions: standardActions },
  { name: "Platform Store", actions: [...standardActions, "suspend", "activate"] },
  { name: "Audit", actions: ["view", "export"] },
  { name: "Support Ticket", actions: ["view", "create", "update", "assign", "reply"] },
  { name: "Support Analytics", actions: ["view"] },
  { name: "Analytics", actions: ["view", "export"] },
  { name: "Settings", actions: standardActions },
];

const getScopeForModule = (moduleName) => {
  const platformModules = [
    "Platform Plan", "Platform User", "Platform Role",
    "Platform Coupons", "Platform Store",
  ];
  return platformModules.includes(moduleName) ? "platform" : "store";
};

const getCategoryForModule = (moduleName) => {
  const platformModules = [
    "Dashboard", "Plans", "Platform Plan", "Platform User", "Platform Role",
    "Platform Coupons", "Platform Store", "Audit", "Analytics", "Settings",
  ];
  const billingModules = ["Subscriptions", "Invoices", "Payments"];
  const catalogModules = ["Products", "Categories", "Attributes", "Coupons", "Reviews", "Pages", "Online Store", "Brands", "Product Tags"];
  const customerModules = ["Customers", "Orders", "Staff", "Riders", "Stores", "Support Ticket", "Support Analytics"];
  const featureModules = ["Features", "QuotaTypes"];
  const contentModules = ["Posts", "Media", "Menus", "Sections", "Forms", "Testimonials", "Saved Blocks", "Templates", "Theme", "Page"];
  const storeModules = ["Settings", "Payment Settings"];

  if (platformModules.includes(moduleName)) return "Platform Management";
  if (billingModules.includes(moduleName)) return "Billing";
  if (catalogModules.includes(moduleName)) return "Catalog";
  if (customerModules.includes(moduleName)) return "Customers & Operations";
  if (featureModules.includes(moduleName)) return "Features & Quotas";
  if (contentModules.includes(moduleName)) return "Content";
  if (storeModules.includes(moduleName)) return "Store Management";
  return "General";
};

const seedPermissions = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const permissions = [];
  for (const { name: module, actions } of modules) {
    for (const action of actions) {
      const code = `${module.toLowerCase().replace(/\s+/g, "_")}.${action}`;
      permissions.push({
        code,
        name: `${module.toLowerCase().replace(/\s+/g, "_")}_${action}`,
        module,
        action,
        scope: getScopeForModule(module),
        category: getCategoryForModule(module),
        riskLevel: "low",
        description: `${action} ${module.toLowerCase()}`,
      });
    }
  }

  for (const perm of permissions) {
    await Permission.findOneAndUpdate(
      { module: perm.module, action: perm.action },
      perm,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Permissions synced: ${permissions.length}`);

  const storePerms = await Permission.find({ scope: "store" }).select("_id");
  const storeManager = await Role.findOne({ slug: "store-manager", scope: "store" });
  if (storeManager) {
    await Role.findByIdAndUpdate(storeManager._id, { permissions: storePerms.map((p) => p._id) });
    console.log(`Role store-manager updated with ${storePerms.length} store permissions`);
  } else {
    console.log("Role store-manager not found");
  }

  await mongoose.disconnect();
};

seedPermissions().catch((err) => {
  console.error(err);
  process.exit(1);
});
