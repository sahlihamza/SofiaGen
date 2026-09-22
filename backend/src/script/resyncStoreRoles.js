require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../config/logger");
const Store = require("../models/Store");
const seedPermissions = require("./seedPermissions");
const roleService = require("../service/RoleService");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const permissions = await seedPermissions();
  logger.info(`Permission catalog synced: ${permissions.length} permissions`);

  const stores = await Store.find({}).select("_id name");
  logger.info(`Re-syncing roles for ${stores.length} store(s)...`);

  let done = 0;
  for (const store of stores) {
    try {
      await roleService.seedDefaultRolesForStore(store._id);
      done += 1;
    } catch (err) {
      logger.error(`Failed to sync roles for store ${store._id} (${store.name}): ${err.message}`);
    }
  }

  logger.info(`Done: ${done}/${stores.length} stores re-synced.`);
  process.exit(0);
};

run().catch((err) => {
  logger.error("resyncStoreRoles failed:", err.message);
  process.exit(1);
});
