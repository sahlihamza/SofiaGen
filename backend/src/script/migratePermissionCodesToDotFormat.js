const mongoose = require("mongoose");
const logger = require("../config/logger");
const Permission = require("../models/Permission");
const { normalizePermissionCode } = require("../utils/normalizePermissionCode");

const migratePermissionCodesToDotFormat = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const allPermissions = await Permission.find({}).lean().exec();
  const underscorePermissions = allPermissions.filter((p) => p.code && p.code.includes("_"));

  logger.info(`Found ${underscorePermissions.length} permissions with underscore codes`);

  const collisions = [];
  const migrated = [];

  for (const perm of underscorePermissions) {
    const normalizedCode = normalizePermissionCode(perm.code);
    const existing = await Permission.findOne({ code: normalizedCode }).lean().exec();

    if (existing) {
      collisions.push({ oldCode: perm.code, newCode: normalizedCode, existingId: existing._id });
      continue;
    }

    await Permission.findByIdAndUpdate(perm._id, { code: normalizedCode }).exec();
    migrated.push({ oldCode: perm.code, newCode: normalizedCode });
  }

  logger.info(`Migrated ${migrated.length} permission codes`);
  if (collisions.length > 0) {
    logger.error(`Collisions detected: ${collisions.length}`);
    console.error("COLLISIONS:", JSON.stringify(collisions, null, 2));
    await mongoose.disconnect();
    throw new Error(`Migration blocked: ${collisions.length} collision(s) detected`);
  }

  await mongoose.disconnect();
  return { migrated, collisions };
};

const validatePermissionMigration = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const remaining = await Permission.find({ code: /_/ }).lean().exec();
  await mongoose.disconnect();

  if (remaining.length > 0) {
    logger.error(`Validation failed: ${remaining.length} permissions still have underscore codes`);
    console.error("REMAINING:", JSON.stringify(remaining.map((p) => ({ _id: p._id, code: p.code })), null, 2));
    return { valid: false, remaining: remaining.length };
  }

  logger.info("Validation passed: 0 underscore codes remaining");
  return { valid: true, remaining: 0 };
};

if (require.main === module) {
  require("dotenv").config();
  (async () => {
    try {
      const result = await migratePermissionCodesToDotFormat();
      logger.info(`Migration result: ${result.migrated.length} migrated, ${result.collisions.length} collisions`);
      const validation = await validatePermissionMigration();
      if (!validation.valid) {
        process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      logger.error("Migration failed:", error);
      process.exit(1);
    }
  })();
}

module.exports = { migratePermissionCodesToDotFormat, validatePermissionMigration };
