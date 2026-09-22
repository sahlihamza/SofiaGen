const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");
const Role = require("./src/models/Role");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sofiaGEN");
    console.log("Connected to MongoDB");
    
    const filters = {
      userType: ["superadmin", "platform_admin"],
      platformOnly: true,
    };
    
    const query = { deletedAt: null };
    const andConditions = [];
    
    if (filters.platformOnly) {
      const platformRoleIds = await Role.find({ scope: "platform" }).distinct("_id");
      andConditions.push({
        $or: [
        { isSuperAdmin: true },
        { role: { $in: platformRoleIds } },
        ],
      });
    }

    if (filters.userType) {
      if (Array.isArray(filters.userType)) {
        query.userType = { $in: filters.userType };
      } else {
        query.userType = filters.userType;
      }
    }
    
    if (andConditions.length > 0) query.$and = andConditions;
    
    console.log("Query:", JSON.stringify(query, null, 2));
    
    const total = await User.countDocuments(query);
    console.log("Total users matching query:", total);

    const activeCount = await User.countDocuments({ ...query, status: "Active" });
    console.log("Active users:", activeCount);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
check();
