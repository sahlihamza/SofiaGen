const mongoose = require("mongoose");

module.exports = async () => {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
  await mongoose.connect(MONGO_URI);
  console.log("Connected to test MongoDB");
};