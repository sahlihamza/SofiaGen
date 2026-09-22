const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Rider = require("../models/Rider");

const BCRYPT_PREFIX = "$2a$";
const BCRYPT_PREFIX_2B = "$2b$";

const isBcryptHash = (value) => {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(BCRYPT_PREFIX) || value.startsWith(BCRYPT_PREFIX_2B);
};

const migrateRiderPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");

    const riders = await Rider.find({});
    let rehashed = 0;
    let skipped = 0;
    let noPassword = 0;

    for (const rider of riders) {
      if (!rider.password) {
        noPassword++;
        continue;
      }

      if (isBcryptHash(rider.password)) {
        skipped++;
        continue;
      }

      rider.password = await bcrypt.hash(rider.password, 10);
      await rider.save({ validateBeforeSave: false });
      rehashed++;
    }

    console.log(`Migration terminé :`);
    console.log(`  - ${rehashed} mot(s) de passe re-hashé(s)`);
    console.log(`  - ${skipped} déjà hashé(s), ignoré(s)`);
    console.log(`  - ${noPassword} rider(s) sans mot de passe`);
    console.log(`  - Total scanné : ${riders.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Erreur migration:", error);
    process.exit(1);
  }
};

migrateRiderPasswords();
