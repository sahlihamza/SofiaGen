require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../config/logger");
const PlatformSettings = require("../models/PlatformSettings");

const seedPlatformSettings = async () => {
  const existing = await PlatformSettings.findOne();
  if (existing) {
    logger.info("Platform settings already exist, skipping seed");
    return existing;
  }

  const settings = await PlatformSettings.create({
    platformName: "SofiaGen",
    currency: "USD",
    timezone: "UTC",
    twoFactorRequired: false,
    allowUserRegistration: true,
    requireEmailVerification: false,
    sessionTimeout: 480,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    },
  });

  logger.info("Platform settings seeded successfully");
  return settings;
};

module.exports = seedPlatformSettings;

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      await seedPlatformSettings();
      process.exit(0);
    } catch (error) {
      logger.error("Seed platform settings error:", error.message);
      process.exit(1);
    }
  })();
}
