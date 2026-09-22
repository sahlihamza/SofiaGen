const mongoose = require("mongoose");
require("dotenv").config();
const UserManagementService = require("./src/service/UserManagementService");
const Role = require("./src/models/Role");
const User = require("./src/models/User");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sofiaGEN");
    console.log("Connected to MongoDB");
    
    // Simulate what the controller does:
    const filters = {
      platformOnly: true
    };
    
    const service = new UserManagementService();
    const result = await service.getAllUsers(filters, { page: 1, limit: 25 }, "-createdAt");
    
    console.log(`Returned users count: ${result.users.length}`);
    console.log(`Total count: ${result.pagination.total}`);
    
  } catch (err) {
    console.error("Error in getAllUsers:", err);
  } finally {
    mongoose.disconnect();
  }
}
check();
