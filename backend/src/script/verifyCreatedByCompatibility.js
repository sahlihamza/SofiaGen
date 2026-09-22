const mongoose = require("mongoose");
const Store = require("../models/Store");
const User = require("../models/User");
const Theme = require("../models/Theme");
const Section = require("../models/Section");
const Page = require("../models/Page");
const Notification = require("../models/Notification");
const StockMovement = require("../models/StockMovement");
const Menu = require("../models/Menu");
const GlobalSection = require("../models/GlobalSection");

const MODELS_WITH_CREATED_BY = [
  { model: Store, fields: ["createdBy", "updatedBy"] },
  { model: Theme, fields: ["createdBy", "updatedBy"] },
  { model: Section, fields: ["createdBy", "updatedBy"] },
  { model: Page, fields: ["createdBy", "updatedBy", "publishedBy"] },
  { model: Notification, fields: ["adminId"] },
  { model: StockMovement, fields: ["createdBy"] },
  { model: Menu, fields: ["updatedBy"] },
  { model: GlobalSection, fields: ["updatedBy"] },
];

const verifyCreatedByCompatibility = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");

    const userIds = await User.distinct("_id");
    const userIdStrings = new Set(userIds.map((id) => id.toString()));

    for (const { model, fields } of MODELS_WITH_CREATED_BY) {
      const modelName = model.modelName;
      for (const field of fields) {
        const distinctIds = await model.distinct(field, { [field]: { $exists: true, $ne: null } });
        const incompatible = distinctIds.filter((id) => !userIdStrings.has(id.toString()));

        if (incompatible.length > 0) {
          console.log(`\né  ${modelName}.${field}: ${incompatible.length} ID(s) incompatible(s) avec User:`);
          console.log(`   IDs: ${incompatible.slice(0, 10).join(", ")}${incompatible.length > 10 ? "..." : ""}`);
        } else {
          console.log(` ${modelName}.${field}: tous les IDs sont compatibles avec User`);
        }
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Erreur vérification:", error);
    process.exit(1);
  }
};

verifyCreatedByCompatibility();
