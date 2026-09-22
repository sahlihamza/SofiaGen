const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const Page = require("../models/Page");
  const GlobalSection = require("../models/GlobalSection");

  const pages = await Page.find({}).select("title urlSlug storeId themeId isPublished renderedAt updatedAt").lean();
  console.log("=== PAGES ===");
  console.log(JSON.stringify(pages, null, 2));

  const sections = await GlobalSection.find({}).select("type storeId themeId compiledHtml compiledCss updatedAt").lean();
  console.log("=== GLOBAL SECTIONS ===");
  console.log(JSON.stringify(sections, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
