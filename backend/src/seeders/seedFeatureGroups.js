const mongoose = require("mongoose");
const FeatureGroup = require("../models/FeatureGroup");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedFeatureGroups = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await FeatureGroup.deleteMany({});
    console.log("Cleared existing feature groups");

    const groups = [
      { name: "Core Features", slug: "core-features", description: "Essential features for all plans", icon: "FiGrid", color: "#3B82F6" },
      { name: "Analytics", slug: "analytics", description: "Reports and analytics tools", icon: "FiBarChart2", color: "#8B5CF6" },
      { name: "Integrations", slug: "integrations", description: "Third-party integrations", icon: "FiGlobe", color: "#10B981" },
      { name: "Store Features", slug: "store-features", description: "Store customization and management", icon: "FiShoppingBag", color: "#F59E0B" },
      { name: "Payment Features", slug: "payment-features", description: "Payment and billing features", icon: "FiDollarSign", color: "#EF4444" },
    ];

    await FeatureGroup.insertMany(groups);
    console.log(`Seeded ${groups.length} feature groups`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding feature groups:", error);
    process.exit(1);
  }
};

seedFeatureGroups();