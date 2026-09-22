const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const GlobalSection = require('../models/GlobalSection');
  const header = await GlobalSection.findOne({ type: 'header' });
  header.compiledHtml = '<header><h1>Super Promo 2026! (V4)</h1></header>';
  // manually trigger updatedAt update
  header.markModified('compiledHtml');
  await header.save();
  console.log('Header updated!');
  process.exit(0);
}

main().catch(console.error);
