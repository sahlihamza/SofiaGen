const mongoose = require("mongoose");
const Role = require("../models/Role");

const migrateRoleSystemFlag = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");

    const result = await Role.updateMany(
      { isPredefined: true },
      { $set: { isSystem: true }, $unset: { isPredefined: "" } }
    );

    console.log(`Migration terminé : ${result.modifiedCount} rôles mis à jour vers isSystem`);
    console.log(`Rôles avec isPredefined restant : ${await Role.countDocuments({ isPredefined: { $exists: true } })}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Erreur migration:", error);
    process.exit(1);
  }
};

migrateRoleSystemFlag();
