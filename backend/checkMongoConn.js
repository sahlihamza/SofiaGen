const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('MONGO_URI=', process.env.MONGO_URI);

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('connected to mongo');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('mongo-err', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
