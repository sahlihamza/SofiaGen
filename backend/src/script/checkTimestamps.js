const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const Page = require('../models/Page');
  const pages = await Page.find({}, { title: 1, renderedAt: 1, updatedAt: 1 }).lean();
  console.log("=== DB PAGES ===");
  console.log(JSON.stringify(pages, null, 2));
  process.exit(0);
}

main().catch(console.error);
