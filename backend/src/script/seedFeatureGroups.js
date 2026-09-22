const mongoose = require("mongoose");
const FeatureGroup = require("../models/FeatureGroup");
const Feature = require("../models/Feature");

const featureGroupsData = [
  { code: "catalog", name: "Catalog", icon: "FiPackage", color: "#3B82F6", displayOrder: 1, description: "Products, categories, brands, variants and inventory" },
  { code: "orders", name: "Orders", icon: "FiShoppingCart", color: "#10B981", displayOrder: 2, description: "Order management, fulfillment and checkouts" },
  { code: "customers", name: "Customers", icon: "FiUsers", color: "#8B5CF6", displayOrder: 3, description: "Customer management, groups and CRM" },
  { code: "cms", name: "CMS", icon: "FiFileText", color: "#F59E0B", displayOrder: 4, description: "Content management, pages and blog" },
  { code: "analytics", name: "Analytics", icon: "FiBarChart2", color: "#EF4444", displayOrder: 5, description: "Reports, analytics and dashboards" },
  { code: "api", name: "API", icon: "FiCode", color: "#6366F1", displayOrder: 6, description: "API access, webhooks and integrations" },
  { code: "ai", name: "AI", icon: "FiCpu", color: "#EC4899", displayOrder: 7, description: "AI features, credits and assistants" },
  { code: "pos", name: "POS", icon: "FiMonitor", color: "#14B8A6", displayOrder: 8, description: "Point of sale and terminals" },
  { code: "shipping", name: "Shipping", icon: "FiTruck", color: "#F97316", displayOrder: 9, description: "Shipping, carriers and rates" },
  { code: "marketing", name: "Marketing", icon: "FiTrendingUp", color: "#22C55E", displayOrder: 10, description: "Campaigns, email marketing and coupons" },
  { code: "settings", name: "Settings", icon: "FiSettings", color: "#64748B", displayOrder: 11, description: "Store settings, domains and languages" },
];

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const seedFeatureGroups = async () => {
  const { connectDB, withRetry } = require("../config/db");
  await connectDB();

  try {
    await withRetry(async () => {
      await FeatureGroup.deleteMany({});
      console.log("Cleared existing feature groups");
    }, "clear feature groups");

    const groups = await FeatureGroup.insertMany(
      featureGroupsData.map((g) => ({
        ...g,
        code: g.code.toLowerCase(),
        slug: slugify(g.name),
        status: "active",
      }))
    );
    console.log(`Created ${groups.length} feature groups`);

    await withRetry(async () => {
      for (const group of groups) {
        const count = await Feature.countDocuments({ featureGroupId: group._id });
        await FeatureGroup.updateOne({ _id: group._id }, { $set: { featureCount: count } });
      }
    }, "recompute feature counts");

    console.log("\n=== Feature Groups Seed Summary ===");
    console.log(`Groups: ${groups.length}`);
    console.log(groups.map((g) => ` - ${g.name} (${g.code})`).join("\n"));
  } catch (err) {
    console.error("Error seeding feature groups:", err);
    throw err;
  }
};

module.exports = { featureGroupsData, seedFeatureGroups };

if (require.main === module) {
  (async () => {
    try {
      await seedFeatureGroups();
      process.exit(0);
    } catch (error) {
      console.error("Failed to seed feature groups", error);
      process.exit(1);
    }
  })();
}