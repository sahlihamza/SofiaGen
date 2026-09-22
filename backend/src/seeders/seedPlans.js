const mongoose = require("mongoose");
const Plan = require("../models/Plan");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPlans = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Plan.deleteMany({});
    console.log("Cleared existing plans");

    const plans = [
      {
        name: "Starter",
        slug: "starter",
        description: "Essential plan for small businesses",
        badge: "Starter",
        color: "#10B981",
        icon: "FiZap",
        pricing: {
          monthly: 29,
          yearly: 290,
          currency: "USD",
          taxIncluded: true,
          trialDays: 14,
        },
        features: {
          users: true,
          products: true,
          orders: true,
          reports: false,
          api: false,
        },
        limits: {
          maxUsers: 5,
          maxProducts: 100,
          maxOrders: 1000,
          storage: "1GB",
        },
        version: 1,
        status: "active",
        visibility: "public",
      },
      {
        name: "Professional",
        slug: "professional",
        description: "Professional plan for growing businesses",
        badge: "Professional",
        color: "#3B82F6",
        icon: "FiAward",
        pricing: {
          monthly: 79,
          yearly: 790,
          currency: "USD",
          taxIncluded: true,
          trialDays: 14,
        },
        features: {
          users: true,
          products: true,
          orders: true,
          reports: true,
          api: true,
        },
        limits: {
          maxUsers: 25,
          maxProducts: 1000,
          maxOrders: 50000,
          storage: "10GB",
        },
        version: 1,
        status: "active",
        visibility: "public",
      },
      {
        name: "Enterprise",
        slug: "enterprise",
        description: "Enterprise plan for large organizations",
        badge: "Enterprise",
        color: "#8B5CF6",
        icon: "FiServer",
        pricing: {
          monthly: 199,
          yearly: 1990,
          currency: "USD",
          taxIncluded: true,
          trialDays: 30,
        },
        features: {
          users: true,
          products: true,
          orders: true,
          reports: true,
          api: true,
        },
        limits: {
          maxUsers: -1,
          maxProducts: -1,
          maxOrders: -1,
          storage: "100GB",
        },
        version: 1,
        status: "active",
        visibility: "public",
      },
    ];

    await Plan.insertMany(plans);
    console.log(`Seeded ${plans.length} plans`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding plans:", error);
    process.exit(1);
  }
};

seedPlans();