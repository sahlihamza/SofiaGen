const mongoose = require("mongoose");
require("dotenv").config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sofiaGEN");
    console.log("Connected to MongoDB");
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }));
    
    const count = await User.countDocuments();
    const users = await User.find({}, { name: 1, email: 1, userType: 1, role: 1, isSuperAdmin: 1 }).lean();
    console.log(`Total users: ${count}`);
    console.log("Users:", JSON.stringify(users, null, 2));

    const roles = await Role.find({}, { name: 1, scope: 1 }).lean();
    console.log(`Total roles: ${roles.length}`);
    console.log("Roles:", JSON.stringify(roles, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
check();
