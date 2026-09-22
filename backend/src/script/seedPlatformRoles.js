require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../config/logger");
const { seedPlatformRoles } = require("./seedSuperAdmin");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await seedPlatformRoles();
  logger.info("Platform roles seeded successfully");
  process.exit(0);
};

run().catch((error) => {
  logger.error("Seed platform roles error:", error.message);
  process.exit(1);
});
