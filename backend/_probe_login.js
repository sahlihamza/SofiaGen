require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const User = require("./src/models/User");
  const { generateAccessToken } = require("./src/config/jwt");
  const user = await User.findOne({ email: "superadmin@gmail.com" });
  fs.writeFileSync("_token.txt", generateAccessToken(user));
  console.log("token written");
  process.exit(0);
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
