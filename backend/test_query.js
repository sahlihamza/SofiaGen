const mongoose = require("mongoose");
require("dotenv").config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sofiaGEN");
    console.log("Connected to MongoDB");
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }));
    
    const query = { deletedAt: null };
    const andConditions = [];
    
    // Simulate platformOnly
    const platformRoleIds = await Role.find({ scope: "platform" }).distinct("_id");
    console.log("platformRoleIds:", platformRoleIds);
    andConditions.push({
      $or: [
        { isSuperAdmin: true },
        { role: { $in: platformRoleIds } },
      ],
    });
    
    query.$and = andConditions;
    console.log("Query:", JSON.stringify(query, null, 2));

    const total = await User.countDocuments(query);
    console.log(`Total count: ${total}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
check();
