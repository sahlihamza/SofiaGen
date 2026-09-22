const mongoose = require("mongoose");
require("dotenv").config();
const TrialFactor = require("../models/TrialFactor");

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/saas";

const factors = [
  // TIME
  { code: "days", name: "Days", category: "time", unit: "days", isTimeFactor: true, operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of days since trial start" },
  { code: "hours", name: "Hours", category: "time", unit: "hours", isTimeFactor: true, operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of hours since trial start" },

  // CATALOG
  { code: "products", name: "Products", category: "catalog", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of products in the catalog" },
  { code: "categories", name: "Categories", category: "catalog", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of categories in the catalog" },
  { code: "brands", name: "Brands", category: "catalog", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of brands in the catalog" },
  { code: "variants", name: "Variants", category: "catalog", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of product variants" },

  // BUSINESS
  { code: "orders", name: "Orders", category: "business", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Total number of orders" },
  { code: "revenue", name: "Revenue", category: "business", unit: "currency", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Total revenue generated" },
  { code: "customers", name: "Customers", category: "business", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Total number of customers" },

  // API
  { code: "api_calls", name: "API Calls", category: "api", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Total number of API calls" },

  // STORAGE
  { code: "storage", name: "Storage", category: "storage", unit: "gb", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Storage used in GB" },
  { code: "images", name: "Images", category: "storage", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of images stored" },

  // MARKETING
  { code: "emails", name: "Emails", category: "marketing", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of emails sent" },
  { code: "coupons", name: "Coupons", category: "marketing", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of coupons created" },

  // AI
  { code: "ai_credits", name: "AI Credits", category: "ai", unit: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "between"], description: "Number of AI credits used" },
];

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    const existing = await TrialFactor.countDocuments({});
    if (existing > 0) {
      console.log(`Trial factors already seeded (${existing}). Skipping.`);
      await mongoose.disconnect();
      return;
    }

    await TrialFactor.insertMany(factors);
    console.log(`Seeded ${factors.length} trial factors`);

    // Print summary by category
    const byCat = await TrialFactor.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    byCat.forEach((c) => console.log(`  ${c._id}: ${c.count}`));

    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error("Seeding failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
