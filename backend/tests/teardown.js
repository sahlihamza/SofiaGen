const mongoose = require("mongoose");

module.exports = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  console.log("Disconnected from test MongoDB");
};