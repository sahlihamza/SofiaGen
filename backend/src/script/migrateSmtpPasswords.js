// MAIL-02  migrates FormSetting.smtp.pass (plaintext) to
// FormSetting.smtp.passwordEncrypted (AES-256-CBC, see utils/encryption.js).
// Idempotent: only touches records that still have a plaintext password and
// no encrypted one yet, so it's safe to run on every boot (mirrors
// seedPermissions.js / seedPlatformRoles.js  see index.js).
const FormSetting = require("../models/FormSetting");
const { encrypt } = require("../utils/encryption");
const logger = require("../config/logger");

const migrateSmtpPasswords = async () => {
  const pending = await FormSetting.find({
    "smtp.pass": { $exists: true, $ne: "" },
    $or: [{ "smtp.passwordEncrypted": { $exists: false } }, { "smtp.passwordEncrypted": "" }],
  }).select("+smtp.pass +smtp.passwordEncrypted");

  let migrated = 0;
  for (const setting of pending) {
    setting.smtp.passwordEncrypted = encrypt(setting.smtp.pass);
    setting.smtp.pass = "";
    await setting.save();
    migrated += 1;
  }

  if (migrated > 0) {
    logger.info(`migrateSmtpPasswords: encrypted ${migrated} store SMTP password(s)`);
  }

  return { migrated };
};

module.exports = migrateSmtpPasswords;

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");

  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const result = await migrateSmtpPasswords();
      logger.info(` SMTP password migration done: ${result.migrated} record(s) migrated`);
      process.exit(0);
    } catch (error) {
      logger.error("L SMTP password migration failed:", error.message);
      process.exit(1);
    }
  })();
}
