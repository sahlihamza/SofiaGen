const mongoose = require("mongoose");
const Store = require("../models/Store");

const auditStoreDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");

    const fields = ["slug", "subdomain", "customDomain"];

    for (const field of fields) {
      const duplicates = await Store.aggregate([
        {
          $match: {
            [field]: { $exists: true, $ne: null, $ne: "" },
          },
        },
        {
          $group: {
            _id: `$${field}`,
            count: { $sum: 1 },
            ids: { $push: "$_id" },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ]);

      if (duplicates.length > 0) {
        console.log(`\né  Doublons trouvés sur "${field}":`);
        for (const dup of duplicates) {
          console.log(`  Valeur: "${dup._id}"  ${dup.count} stores  IDs: ${dup.ids.join(", ")}`);
        }
      } else {
        console.log(`\n Pas de doublon sur "${field}"`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Erreur audit:", error);
    process.exit(1);
  }
};

auditStoreDuplicates();
