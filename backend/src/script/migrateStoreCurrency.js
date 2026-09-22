const mongoose = require("mongoose");
const Store = require("../models/Store");
const GeneralSettings = require("../models/GeneralSettings");
const Currency = require("../models/Currency");

const migrateStoreCurrency = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");

  const stores = await Store.find({}).lean();
  let migrated = 0;
  let skipped = 0;

  for (const store of stores) {
    if (!store.currency) {
      skipped++;
      continue;
    }

    const existingSettings = await GeneralSettings.findOne({ storeId: store._id }).lean();
    if (existingSettings?.currencyId) {
      skipped++;
      continue;
    }

    const currencyDoc = await Currency.findOne({ isoCode: store.currency.toUpperCase() }).lean();
    if (!currencyDoc) {
      const fallback = await Currency.findOne({ isoCode: "USD" }).lean();
      if (fallback) {
        await GeneralSettings.findOneAndUpdate(
          { storeId: store._id },
          { currencyId: fallback._id },
          { upsert: true }
        );
        migrated++;
      } else {
        skipped++;
      }
      continue;
    }

    await GeneralSettings.findOneAndUpdate(
      { storeId: store._id },
      { currencyId: currencyDoc._id },
      { upsert: true }
    );
    migrated++;
  }

  console.log(`Migration complete: ${migrated} stores migrated, ${skipped} skipped`);
  await mongoose.disconnect();
};

migrateStoreCurrency().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
