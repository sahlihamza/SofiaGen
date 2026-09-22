const mongoose = require("mongoose");
const logger = require("../config/logger");
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const UserStore = require("../models/UserStore");

const normalizePermissionCode = (code) => {
  if (typeof code !== "string") return "";
  return code.trim().toLowerCase().replace(/_/g, ".").replace(/\.+/g, ".");
};

const dumpCollection = async (model, filename) => {
  const docs = await model.find({}).lean().exec();
  const fs = require("fs");
  const path = require("path");
  const backupsDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const filepath = path.join(backupsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(docs, null, 2), "utf8");
  logger.info(`Backup ${model.modelName}: ${docs.length} docs -> ${filepath}`);
  return docs;
};

const backupCollections = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await dumpCollection(Permission, `permissions-${timestamp}.json`);
  await dumpCollection(Role, `roles-${timestamp}.json`);
  await dumpCollection(UserStore, `userStores-${timestamp}.json`);
  await mongoose.disconnect();
  logger.info("Backup completed");
};

if (require.main === module) {
  backupCollections().catch((error) => {
    logger.error("Backup failed:", error);
    process.exit(1);
  });
}

module.exports = { backupCollections, dumpCollection };
