const mongoose = require("mongoose");
const QuotaType = require("../models/QuotaType");
const Store = require("../models/Store");
const StoreUsage = require("../models/StoreUsage");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const quotaTypesData = [
  { code: "products", name: "Products", unit: "number", minValue: 0, maxValue: 10000, defaultValue: 100, allowUnlimited: false },
  { code: "admins", name: "Admins", unit: "number", minValue: 0, maxValue: 100, defaultValue: 5, allowUnlimited: false },
  { code: "images", name: "Images", unit: "number", minValue: 0, maxValue: 50000, defaultValue: 1000, allowUnlimited: false },
  { code: "storage", name: "Storage", unit: "gb", minValue: 0, maxValue: 500, defaultValue: 10, allowUnlimited: false },
  { code: "bandwidth", name: "Bandwidth", unit: "gb", minValue: 0, maxValue: 1000, defaultValue: 100, allowUnlimited: false },
  { code: "orders", name: "Orders", unit: "number", minValue: 0, maxValue: 100000, defaultValue: 5000, allowUnlimited: false },
  { code: "staff", name: "Staff", unit: "number", minValue: 0, maxValue: 50, defaultValue: 10, allowUnlimited: false },
  { code: "stores", name: "Stores", unit: "number", minValue: 0, maxValue: 10, defaultValue: 1, allowUnlimited: false },
  { code: "api_keys", name: "API Keys", unit: "number", minValue: 0, maxValue: 100, defaultValue: 10, allowUnlimited: false },
  { code: "custom_fields", name: "Custom Fields", unit: "number", minValue: 0, maxValue: 200, defaultValue: 20, allowUnlimited: false },
  { code: "integrations", name: "Integrations", unit: "number", minValue: 0, maxValue: 50, defaultValue: 5, allowUnlimited: false },
  { code: "webhooks", name: "Webhooks", unit: "number", minValue: 0, maxValue: 100, defaultValue: 10, allowUnlimited: false },
  { code: "domains", name: "Domains", unit: "number", minValue: 0, maxValue: 20, defaultValue: 3, allowUnlimited: false },
  { code: "users", name: "Users", unit: "number", minValue: 0, maxValue: 500, defaultValue: 50, allowUnlimited: false },
  { code: "reports", name: "Reports", unit: "number", minValue: 0, maxValue: 1000, defaultValue: 100, allowUnlimited: false },
];

const generateUsage = (quotaType) => {
  if (quotaType.unit === "gb") {
    return Math.floor(Math.random() * 500);
  }
  return Math.floor(Math.random() * (quotaType.maxValue || 5000));
};

const seedUsageQuotas = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await StoreUsage.deleteMany({});
    await QuotaType.deleteMany({});

    console.log("Cleared existing usage and quota data");

    const quotaTypes = await QuotaType.insertMany(quotaTypesData);
    console.log(`Created ${quotaTypes.length} quota types`);

    const stores = await Store.find({});
    if (stores.length === 0) {
      console.log("No stores found. Please run seed:store or seed:payments first.");
      await mongoose.disconnect();
      return;
    }

    const storeUsages = [];
    for (const store of stores) {
      for (const qt of quotaTypes) {
        const used = generateUsage(qt);
        storeUsages.push(
          new StoreUsage({
            storeId: store._id,
            quotaTypeId: qt._id,
            used,
          })
        );
      }
    }

    if (storeUsages.length > 0) {
      await StoreUsage.insertMany(storeUsages);
      console.log(`Created ${storeUsages.length} store usage records`);
    }

    console.log("\n=== Usage & Quotas Seed Data Summary ===");
    console.log(`Quota Types: ${quotaTypes.length}`);
    console.log(`Stores: ${stores.length}`);
    console.log(`Store Usage Records: ${storeUsages.length}`);
    console.log("\nDone!");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding usage & quotas data:", err);
    process.exit(1);
  }
};

seedUsageQuotas();