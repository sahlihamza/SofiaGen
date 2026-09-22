require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("../config/logger");
const Role = require("../models/Role");
const User = require("../models/User");
const Permission = require("../models/Permission");
const seedPermissions = require("./seedPermissions");
const seedPlatformSettings = require("./seedPlatformSettings");
const { DEFAULT_ROLES, resolvePermissionIds } = require("../config/rbac/roles");

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "12345678";

const seedSuperAdmin = async () => {
  const permissions = await seedPermissions();
  await seedPlatformSettings();

  let superAdminRole = await Role.findOne({ slug: "super-admin", scope: "platform" });

  const superAdminPermissionIds = resolvePermissionIds("Super Admin", permissions);

  if (superAdminRole) {
    superAdminRole = await Role.findByIdAndUpdate(
      superAdminRole._id,
      {
        name: "Super Admin",
        slug: "super-admin",
        description: "Accès complet  toutes les fonctionnalités",
        scope: "platform",
        isSystem: true,
        permissions: superAdminPermissionIds,
        storeId: null,
      },
      { new: true, runValidators: true }
    );
  } else {
    superAdminRole = await Role.findOneAndUpdate(
      { slug: "super-admin", scope: "platform" },
      {
        name: "Super Admin",
        slug: "super-admin",
        description: "Accès complet  toutes les fonctionnalités",
        scope: "platform",
        isSystem: true,
        permissions: superAdminPermissionIds,
        storeId: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const existingUser = await User.findOne({ email: SUPER_ADMIN_EMAIL, deletedAt: null });
  if (existingUser) {
    existingUser.role = [superAdminRole._id];
    existingUser.isSuperAdmin = true;
    existingUser.userType = "superadmin";
    existingUser.status = "Active";
    await existingUser.save();
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  return User.create({
    name: "Super Admin",
    email: SUPER_ADMIN_EMAIL,
    password: hashedPassword,
    role: [superAdminRole._id],
    userType: "superadmin",
    isSuperAdmin: true,
    status: "Active",
  });
};

const seedPlatformRoles = async () => {
  const permissions = await Permission.find({});

  const platformRoleTemplates = DEFAULT_ROLES.filter((t) => t.scope === "platform");

  const platformRoles = platformRoleTemplates.map((template) => ({
    name: template.name,
    slug: template.slug,
    description: template.description,
    scope: "platform",
    isSystem: template.isSystem || false,
    storeId: null,
    permissions: resolvePermissionIds(template.name, permissions),
  }));

  for (const roleData of platformRoles) {
    await Role.findOneAndUpdate(
      { slug: roleData.slug, scope: roleData.scope },
      roleData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  logger.info(`Seeded ${platformRoles.length} platform roles`);
};

module.exports = { seedSuperAdmin, seedPlatformRoles };

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      await seedSuperAdmin();
      await seedPlatformRoles();
      logger.info(
        `Super Admin ready : ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`
      );
      process.exit(0);
    } catch (error) {
      logger.error("Seed super admin error:", error.message);
      process.exit(1);
    }
  })();
}
