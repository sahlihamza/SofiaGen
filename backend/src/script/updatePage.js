const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const Page = require('../models/Page');
  const page = await Page.findOne({ slug: 'dd' });
  page.title = "dd (updated title)";
  await page.save();
  console.log('Page dd updated!');
  process.exit(0);
}

main().catch(console.error);
