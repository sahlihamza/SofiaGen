require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const superAdminRole = await Role.findOne({ slug: "super-admin", scope: "platform" });
  console.log("Super Admin role _id:", superAdminRole ? superAdminRole._id.toString() : "NOT FOUND");
  const platformRoleIds = await Role.find({ scope: "platform" }).distinct("_id");
  console.log("Platform role IDs:", platformRoleIds.map((id) => id.toString()));
  const superAdmin = await User.findOne({ isSuperAdmin: true });
  console.log("Super Admin user:", superAdmin ? { name: superAdmin.name, email: superAdmin.email, role: superAdmin.role.map((r) => r.toString()) } : "NOT FOUND");
  const query = { deletedAt: null };
  query.$or = [{ isSuperAdmin: true }, { role: { $in: platformRoleIds } }];
  const users = await User.find(query).select("name email isSuperAdmin role");
  console.log("Matching users:", users.map((u) => u.name + " | super:" + u.isSuperAdmin + " | roles:" + u.role.map((r) => r.toString()).join(",")));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
