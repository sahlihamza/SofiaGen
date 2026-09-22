const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const RoleService = require("../service/RoleService");
const UserManagementService = require("../service/UserManagementService");
const PermissionService = require("../service/PermissionService");
const { seedPermissions } = require("../script/seedPermissions");

const crypto = require("crypto");

let db;
let platformPerm;
let storePerm;
let platformRole;
let storeRole;
let platformUser;
let superAdmin;

const unique = (suffix) => `${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  await seedPermissions();

  platformPerm = await Permission.findOne({ code: "platform.role.view" });
  storePerm = await Permission.findOne({ code: "products.view" });

  platformRole = await Role.create({
    name: unique("Platform Role"),
    slug: unique("platform-role"),
    scope: "platform",
    permissions: [platformPerm._id],
    isSystem: false,
  });

  storeRole = await Role.create({
    name: unique("Store Role"),
    slug: unique("store-role"),
    scope: "store",
    storeId: new mongoose.Types.ObjectId(),
    permissions: [storePerm._id],
    isSystem: false,
  });

  const systemPlatformRole = await Role.findOne({ slug: "super-admin", scope: "platform" }) ||
    await Role.create({ name: "Super Admin", slug: "super-admin", scope: "platform", isSystem: true });

  superAdmin = await User.create({
    name: "Super Admin",
    email: `superadmin-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    isSuperAdmin: true,
    userType: "superadmin",
    status: "Active",
    role: [systemPlatformRole._id],
  });

  platformUser = await User.create({
    name: unique("Platform User"),
    email: `platform-user-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "platform_admin",
    status: "Active",
    role: [platformRole._id],
  });
});

test.after(async () => {
  await Promise.all([
    User.deleteMany({ _id: { $in: [platformUser._id, superAdmin._id] } }),
    Role.deleteMany({ _id: { $in: [platformRole._id, storeRole._id] } }),
  ]);
  await mongoose.disconnect();
});

test("R1: getPlatformRoles ne retourne que scope=platform", async () => {
  const roles = await RoleService.getPlatformRoles();
  assert.ok(Array.isArray(roles), "getPlatformRoles should return an array");
  for (const role of roles) {
    assert.equal(role.scope, "platform", `Role ${role.name} should have scope=platform`);
  }
});

test("R2: createPlatformRole force scope=platform et storeId=null", async () => {
  const role = await RoleService.createRole({
    name: unique("New Platform Role"),
    slug: unique("new-platform-role"),
    description: "Test",
    permissions: [platformPerm._id],
    scope: "platform",
    storeId: null,
    isSystem: false,
  });
  assert.equal(role.scope, "platform");
  assert.equal(role.storeId, null);

  const loaded = await Role.findById(role._id).lean();
  assert.equal(loaded.scope, "platform");
  assert.equal(loaded.storeId, null);

  await Role.deleteOne({ _id: role._id });
});

test("R3: createPlatformRole rejette storeId non null", async () => {
  const fakeStoreId = new mongoose.Types.ObjectId();
  let threw = false;
  try {
    await RoleService.createRole({
      name: unique("Bad Role"),
      slug: unique("bad-role"),
      scope: "platform",
      storeId: fakeStoreId,
      isSystem: false,
    });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidRoleScope");
  }
  assert.ok(threw, "Should throw InvalidRoleScope when storeId is set on platform role");
});

test("R4: updatePlatformRole rejette scope=store", async () => {
  let threw = false;
  try {
    await RoleService.updateRole(platformRole._id, null, { scope: "store" });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidRoleScope");
  }
  assert.ok(threw, "Should throw InvalidRoleScope when trying to set scope=store on platform role");
});

test("R5: updatePlatformRole rejette permission store", async () => {
  let threw = false;
  try {
    await RoleService.updateRole(platformRole._id, null, { permissions: [storePerm._id] });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidPermissions");
  }
  assert.ok(threw, "Should throw InvalidPermissions when adding store permission to platform role");
});

test("R6: delete isSystem  403", async () => {
  const systemRole = await Role.findOne({ isSystem: true, scope: "platform" });
  if (!systemRole) {
    assert.ok(true, "No system role found, skipping");
    return;
  }
  let threw = false;
  try {
    await RoleService.deleteRole(systemRole._id);
  } catch (err) {
    threw = true;
    assert.equal(err.name, "Forbidden");
  }
  assert.ok(threw, "Should throw Forbidden when deleting system role");
});

test("R7: delete role avec users  409", async () => {
  let threw = false;
  try {
    await RoleService.deleteRole(platformRole._id);
  } catch (err) {
    threw = true;
    assert.equal(err.name, "RoleInUse");
  }
  assert.ok(threw, "Should throw RoleInUse when role has assigned users");
});

test("R8: assignRole store role sur user  400", async () => {
  let threw = false;
  try {
    await UserManagementService.assignRole(platformUser._id, storeRole._id, null, null, superAdmin._id);
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidRoleScope");
  }
  assert.ok(threw, "Should throw InvalidRoleScope when assigning store role via platform API");
});

test("R9: removeRole store role sur user  400", async () => {
  let threw = false;
  try {
    await UserManagementService.removeRole(platformUser._id, storeRole._id, superAdmin._id);
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidRoleScope");
  }
  assert.ok(threw, "Should throw InvalidRoleScope when removing store role via platform API");
});

test("R10: effective permissions superadmin = ['*']", async () => {
  const perms = await UserManagementService.getEffectivePermissions(superAdmin._id);
  assert.deepEqual(perms, ["*"], "SuperAdmin should have wildcard effective permissions");
});

test("R11: effective permissions agrége les roles platform", async () => {
  const perms = await UserManagementService.getEffectivePermissions(platformUser._id);
  assert.ok(Array.isArray(perms), "Should return an array");
  assert.ok(perms.includes("platform.role.view"), "Should include permissions from platform role");
});

test("R12: duplicateRole cré une copie sans storeId", async () => {
  const tempRole = await Role.create({
    name: unique("Duplicate Me"),
    slug: unique("duplicate-me"),
    scope: "platform",
    permissions: [platformPerm._id],
    isSystem: false,
  });

  const dup = await RoleService.duplicateRole(tempRole._id);
  assert.equal(dup.scope, "platform");
  assert.equal(dup.storeId, null);
  assert.ok(dup.slug.includes("copy"), "Duplicated slug should contain 'copy'");
  assert.ok(dup.name.includes("copie") || dup.name.includes("copy"), "Duplicated name should indicate copy");
  assert.equal(dup.isSystem, false);

  await Role.deleteOne({ _id: tempRole._id });
  await Role.deleteOne({ _id: dup._id });
});

test("R13: getUsersByRole retourne les utilisateurs", async () => {
  const users = await RoleService.getUsersByRole(platformRole._id);
  assert.ok(Array.isArray(users), "Should return an array");
  const ids = users.map((u) => String(u._id));
  assert.ok(ids.includes(String(platformUser._id)), "Should include the platform user");
});

test("R14: list roles platform n'inclut pas les roles store", async () => {
  const allRoles = await Role.find({}).lean();
  const storeRoles = allRoles.filter((r) => r.scope === "store");
  assert.ok(storeRoles.length > 0, "Should have store roles in DB for this test");

  const platformRoles = await RoleService.getPlatformRoles();
  for (const role of platformRoles) {
    assert.equal(role.scope, "platform");
  }
  const platformIds = platformRoles.map((r) => String(r._id));
  for (const sr of storeRoles) {
    assert.ok(!platformIds.includes(String(sr._id)), "Store role should not appear in platform roles list");
  }
});

test("R15: PermissionService.hasPermission superadmin bypass", async () => {
  const permService = new PermissionService();
  const hasPerm = await permService.hasPermission(superAdmin._id, "platform.role.delete");
  assert.ok(hasPerm, "SuperAdmin should have any permission via PermissionService");
});

test("R16: assignRole plateforme ajoute le rôle", async () => {
  const tempRole = await Role.create({
    name: unique("Assign Test"),
    slug: unique("assign-test"),
    scope: "platform",
    permissions: [platformPerm._id],
    isSystem: false,
  });

  await UserManagementService.assignRole(platformUser._id, tempRole._id, null, null, superAdmin._id);
  const user = await User.findById(platformUser._id).lean();
  assert.ok(user.role.some((r) => String(r) === String(tempRole._id)), "User should have the assigned role");

  await UserManagementService.removeRole(platformUser._id, tempRole._id, superAdmin._id);
  const updated = await User.findById(platformUser._id).lean();
  assert.ok(!updated.role.some((r) => String(r) === String(tempRole._id)), "User should no longer have the role");

  await Role.deleteOne({ _id: tempRole._id });
});
