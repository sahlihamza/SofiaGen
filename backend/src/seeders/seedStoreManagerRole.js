require("dotenv").config();
const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const seedPermissions = require("../script/seedPermissions");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const ROLE_NAME = "Store Manager";
const ROLE_SLUG = "store-manager";

const seedStoreManagerRole = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await seedPermissions();
    console.log("Permissions seeded");

    const permissions = await Permission.find({});
    const storePermissions = permissions.filter((p) => p.scope === "store");
    const storePermissionIds = storePermissions.map((p) => p._id);
    console.log(`Store-scoped permissions found: ${storePermissionIds.length}`);

    const existing = await Role.findOne({ slug: ROLE_SLUG, scope: "store" });
    if (existing) {
      console.log(`Role "${ROLE_NAME}" (${ROLE_SLUG}) already exists with ${existing.permissions.length} permissions.`);
      await mongoose.disconnect();
      return;
    }

    const role = await Role.create({
      name: ROLE_NAME,
      slug: ROLE_SLUG,
      description: "Full store management permissions",
      scope: "store",
      isPredefined: true,
      permissions: storePermissionIds,
    });

    console.log(`Role created: ${role.name} (${role.slug})`);
    console.log(`Scope   : ${role.scope}`);
    console.log(`Perms   : ${role.permissions.length}`);
    console.log("\nDone!");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error creating store manager role:", err);
    process.exit(1);
  }
};

seedStoreManagerRole();
