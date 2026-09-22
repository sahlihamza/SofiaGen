const mongoose = require("mongoose");
const PlanTemplate = require("../models/PlanTemplate");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPlanTemplates = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await PlanTemplate.deleteMany({});
    console.log("Cleared existing plan templates");

    const templates = [
      {
        name: "Default Starter Template",
        slug: "default-starter",
        description: "Default template for starter plans",
        planId: null,
        config: {
          features: ["users_management", "products_management"],
          limits: { maxUsers: 5, maxProducts: 100 },
          trialDays: 14,
        },
        isDefault: true,
        createdBy: null,
      },
      {
        name: "Default Professional Template",
        slug: "default-professional",
        description: "Default template for professional plans",
        planId: null,
        config: {
          features: ["users_management", "products_management", "orders_management", "reports_analytics", "api_access"],
          limits: { maxUsers: 25, maxProducts: 1000 },
          trialDays: 14,
        },
        isDefault: true,
        createdBy: null,
      },
      {
        name: "Default Enterprise Template",
        slug: "default-enterprise",
        description: "Default template for enterprise plans",
        planId: null,
        config: {
          features: ["users_management", "products_management", "orders_management", "reports_analytics", "api_access", "custom_domains", "email_notifications", "multi_currency"],
          limits: { maxUsers: -1, maxProducts: -1, maxOrders: -1, storage: "100GB" },
          trialDays: 30,
        },
        isDefault: true,
        createdBy: null,
      },
    ];

    await PlanTemplate.insertMany(templates);
    console.log(`Seeded ${templates.length} plan templates`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding plan templates:", error);
    process.exit(1);
  }
};

seedPlanTemplates();