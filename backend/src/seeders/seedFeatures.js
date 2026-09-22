const mongoose = require("mongoose");
const Feature = require("../models/Feature");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedFeatures = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Feature.deleteMany({});
    console.log("Cleared existing features");

    const features = [
      {
        name: "Users Management",
        slug: "users-management",
        description: "Manage users and their roles",
        code: "users_management",
        category: "core",
        icon: "FiUsers",
      },
      {
        name: "Products Management",
        slug: "products-management",
        description: "Manage products and inventory",
        code: "products_management",
        category: "core",
        icon: "FiShoppingBag",
      },
      {
        name: "Orders Management",
        slug: "orders-management",
        description: "Manage orders and fulfillment",
        code: "orders_management",
        category: "core",
        icon: "FiShoppingCart",
      },
      {
        name: "Reports & Analytics",
        slug: "reports-analytics",
        description: "Access reports and analytics dashboard",
        code: "reports_analytics",
        category: "analytics",
        icon: "FiBarChart2",
      },
      {
        name: "API Access",
        slug: "api-access",
        description: "Access platform API for integrations",
        code: "api_access",
        category: "integrations",
        icon: "FiGlobe",
      },
      {
        name: "Custom Domains",
        slug: "custom-domains",
        description: "Use custom domain for your store",
        code: "custom_domains",
        category: "store",
        icon: "FiGlobe",
      },
      {
        name: "Email Notifications",
        slug: "email-notifications",
        description: "Send automated email notifications",
        code: "email_notifications",
        category: "store",
        icon: "FiMail",
      },
      {
        name: "Multi-currency",
        slug: "multi-currency",
        description: "Accept payments in multiple currencies",
        code: "multi_currency",
        category: "payments",
        icon: "FiDollarSign",
      },
    ];

    await Feature.insertMany(features);
    console.log(`Seeded ${features.length} features`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding features:", error);
    process.exit(1);
  }
};

seedFeatures();