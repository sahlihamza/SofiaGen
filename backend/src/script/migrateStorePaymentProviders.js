const mongoose = require("mongoose");
const Store = require("../models/Store");
const PaymentProvider = require("../models/payment/PaymentProvider");
const PaymentMethod = require("../models/payment/PaymentMethod");
const PaymentMethodProviderLink = require("../models/payment/PaymentMethodProviderLink");
const StorePaymentProvider = require("../models/payment/StorePaymentProvider");
const StorePaymentProviderMethod = require("../models/payment/StorePaymentProviderMethod");
const PaymentLog = require("../models/payment/PaymentLog");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const migrateStores = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const stores = await Store.find({ status: { $nin: ["deleted", "suspended"] } }).lean();
    console.log(`Found ${stores.length} active stores`);

    const activeProviders = await PaymentProvider.find({ enabled: true, status: "active" }).lean();
    console.log(`Found ${activeProviders.length} active platform providers`);

    if (!activeProviders.length) {
      console.log("No active providers to migrate. Exiting.");
      await mongoose.disconnect();
      return;
    }

    const allMethods = await PaymentMethod.find({ status: "active" }).lean();
    const methodByCode = new Map(allMethods.map((m) => [m.code, m]));

    const links = await PaymentMethodProviderLink.find({
      paymentProviderId: { $in: activeProviders.map((p) => p._id) },
      status: "active",
    })
      .populate("paymentMethodId")
      .lean();

    const linksByProvider = new Map();
    for (const link of links) {
      const pid = link.paymentProviderId.toString();
      if (!linksByProvider.has(pid)) linksByProvider.set(pid, []);
      linksByProvider.get(pid).push(link);
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const store of stores) {
      try {
        const existing = await StorePaymentProvider.findOne({ storeId: store._id }).lean();
        if (existing) {
          skipped++;
          continue;
        }

        const providerOps = [];

        for (const provider of activeProviders) {
          providerOps.push({
            storeId: store._id,
            providerId: provider._id,
            enabled: true,
            settings: {
              testMode: provider.environment === "sandbox",
              timeout: 30000,
              retryCount: 3,
              retryDelay: 1000,
            },
          });
        }

        if (!providerOps.length) continue;

        const createdSPPs = await StorePaymentProvider.insertMany(providerOps, { ordered: false });
        created += createdSPPs.length;

        const fullMethodOps = [];
        for (let i = 0; i < createdSPPs.length; i++) {
          const spp = createdSPPs[i];
          const provider = activeProviders[i];
          const pid = provider._id.toString();
          const providerLinks = linksByProvider.get(pid) || [];
          for (const link of providerLinks) {
            const method = link.paymentMethodId;
            if (!method) continue;
            fullMethodOps.push({
              storePaymentProviderId: spp._id,
              paymentMethodId: method._id,
              enabled: true,
              sortOrder: method.displayOrder ?? 0,
            });
          }
        }

        if (fullMethodOps.length) {
          await StorePaymentProviderMethod.insertMany(fullMethodOps, { ordered: false });
        }

        await PaymentLog.log({
          module: "store_payment_providers",
          action: "migration",
          message: `Auto-migrated ${createdSPPs.length} providers for store ${store._id}`,
          details: { storeId: store._id, providerCount: createdSPPs.length },
          actorId: null,
          storeId: store._id,
        });
      } catch (err) {
        errors++;
        console.error(`Failed to migrate store ${store._id}:`, err.message);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Stores processed: ${stores.length}`);
    console.log(`Stores skipped (already configured): ${skipped}`);
    console.log(`StorePaymentProviders created: ${created}`);
    console.log(`Errors: ${errors}`);
    console.log("\nDone!");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrateStores();
