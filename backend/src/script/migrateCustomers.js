require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../config/logger");
const Customer = require("../models/Customer");

// Moves the customers collection from the old schema (single "name", "image",
// globally unique email) to the new one (firstName/lastName, avatar, soft
// delete, email unique per store).
const migrateCustomers = async () => {
  const collection = Customer.collection;

  // 1. Drop the stale global unique index on email. It would keep enforcing
  //    uniqueness across every boutique and defeat storeId + email.
  const indexes = await collection.indexes();
  const legacyEmailIndex = indexes.find((index) => index.name === "email_1");

  if (legacyEmailIndex) {
    await collection.dropIndex("email_1");
    logger.info(" Index legacy 'email_1' supprimé");
  } else {
    logger.info("9  Index legacy 'email_1' déjà absent");
  }

  // 2. Backfill the new columns on existing documents.
  const legacyCustomers = await collection
    .find({ $or: [{ firstName: { $exists: false } }, { deletedAt: { $exists: false } }] })
    .toArray();

  let updated = 0;
  for (const customer of legacyCustomers) {
    const parts = (customer.name || "").toString().trim().split(/\s+/);
    const set = {};

    if (customer.firstName === undefined) {
      set.firstName = parts.shift() || customer.email;
      set.lastName = parts.join(" ");
    }
    if (customer.deletedAt === undefined) set.deletedAt = null;
    if (customer.avatar === undefined && customer.image) set.avatar = customer.image;
    if (customer.storeId === undefined) set.storeId = null;
    if (customer.status === undefined) set.status = "active";
    if (customer.role === undefined) set.role = "customer";

    if (Object.keys(set).length) {
      await collection.updateOne({ _id: customer._id }, { $set: set });
      updated += 1;
    }
  }

  logger.info(` ${updated} client(s) migré(s) vers le nouveau schéma`);

  // 3. Build the Story 10 indexes.
  await Customer.syncIndexes();
  logger.info(" Index customers synchronisés");

  return updated;
};

module.exports = migrateCustomers;

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      await migrateCustomers();
      process.exit(0);
    } catch (error) {
      logger.error("L Erreur migration customers:", error.message);
      process.exit(1);
    }
  })();
}
