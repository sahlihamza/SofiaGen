const mongoose = require("mongoose");
const GlobalSection = require("../models/GlobalSection");
const GlobalComponent = require("../models/GlobalComponent");
require("dotenv").config({ path: "../../.env" });

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/dashter", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const sectionCount = await GlobalSection.countDocuments();
  const componentCount = await GlobalComponent.countDocuments();

  console.log(`GlobalSections count: ${sectionCount}`);
  console.log(`GlobalComponents count: ${componentCount}`);
  process.exit(0);
}

main().catch(console.error);
