require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Role = require("../models/Role");
const User = require("../models/User");
const Permission = require("../models/Permission");
const seedPermissions = require("../script/seedPermissions");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const ADMIN_EMAIL = "adminstore@gmail.com";
const ADMIN_PASSWORD = "12345678";
const ADMIN_NAME = "Admin Store";

const ROLE_SLUG = "adminstore";

const seedAdminStoreRole = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await seedPermissions();
    console.log("Permissions seeded");

    const permissions = await Permission.find({});
    const storePermissions = permissions.filter((p) => p.scope === "store");
    const storePermissionIds = storePermissions.map((p) => p._id);
    console.log(`Store-scoped permissions found: ${storePermissionIds.length}`);

    let adminRole = await Role.findOne({ slug: ROLE_SLUG, scope: "store" });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "adminstore",
        slug: ROLE_SLUG,
        description: "Store owner with dedicated store management permissions",
        scope: "store",
        isPredefined: true,
        permissions: storePermissionIds,
      });
      console.log(`Role created: ${adminRole.name} (${adminRole.slug})`);
    } else {
      adminRole = await Role.findByIdAndUpdate(
        adminRole._id,
        { permissions: storePermissionIds },
        { new: true }
      );
      console.log(`Role updated: ${adminRole.name} (${adminRole.slug})  ${storePermissionIds.length} permissions`);
    }

    let adminUser = await User.findOne({ email: ADMIN_EMAIL, deletedAt: null });
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (adminUser) {
      adminUser = await User.findByIdAndUpdate(
        adminUser._id,
        {
          role: [adminRole._id],
          userType: "store_admin",
          status: "Active",
          isSuperAdmin: false,
        },
        { new: true }
      );
      console.log(`User updated: ${adminUser.email}`);
    } else {
      adminUser = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: [adminRole._id],
        userType: "store_admin",
        status: "Active",
        isSuperAdmin: false,
      });
      console.log(`User created: ${adminUser.email}`);
    }

    console.log("\n=== Admin Store Role Ready ===");
    console.log(`Email   : ${adminUser.email}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Role    : ${adminRole.name} (${adminRole.slug})`);
    console.log(`Scope   : ${adminRole.scope}`);
    console.log(`Perms   : ${adminRole.permissions.length}`);
    console.log("\nDone!");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding admin store role:", err);
    process.exit(1);
  }
};

seedAdminStoreRole();
