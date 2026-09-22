const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Role = require("../../src/models/Role");
const Permission = require("../../src/models/Permission");
const Store = require("../../src/models/Store");
const UserStore = require("../../src/models/UserStore");
const seedPermissions = require("../../src/script/seedPermissions");
const RoleService = require("../../src/service/RoleService");
const { DEFAULT_ROLES, getRolePermissionCodes, resolvePermissionIds } = require("../../src/config/rbac/roles");
const { seedPlatformRoles } = require("../../src/script/seedSuperAdmin");
const { RoleService: RoleServiceClass } = require("../../src/service/RoleService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";

const connect = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
};

const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

// ─── Integration: seedDefaultRolesForStore ──────────────────────────────────

const wrap = (name, fn) => test(name, async () => {
  await connect();
  const roleService = new RoleServiceClass();
  const store = await Store.create({ name: `Test Store ${Date.now()}` });
  try {
    await fn(roleService, store);
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
  }
  await disconnect();
});

test("seedDefaultRolesForStore: should seed only store-scoped roles", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store A" });

  try {
    const roles = await roleService.seedDefaultRolesForStore(store._id);
    const platformRoles = roles.filter((r) => r.scope === "platform");
    assert.equal(platformRoles.length, 0, "No platform roles should be created for a store");
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("seedDefaultRolesForStore: should create roles with valid slug and scope", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store B" });

  try {
    const roles = await roleService.seedDefaultRolesForStore(store._id);
    for (const role of roles) {
      assert.ok(role.slug, "Role should have a slug");
      assert.notEqual(role.slug, "", "Slug should not be empty");
      assert.equal(role.scope, "store", "Scope should be store");
    }
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("seedDefaultRolesForStore: should assign exactly the permissions defined in DEFAULT_ROLES", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store C" });

  try {
    const roles = await roleService.seedDefaultRolesForStore(store._id);
    const allPermissions = await Permission.find({});
    for (const role of roles) {
      const expectedCodes = getRolePermissionCodes(role.name, allPermissions.map((p) => p.code));
      assert.equal(role.permissions.length, expectedCodes.length,
        `Role ${role.name} should have ${expectedCodes.length} permissions`);
      const roleCodes = role.permissions.map((pid) => {
        const perm = allPermissions.find((p) => p._id.toString() === pid.toString());
        return perm ? perm.code : null;
      }).filter(Boolean);
      for (const code of expectedCodes) {
        assert.ok(roleCodes.includes(code), `Role ${role.name} should have permission ${code}`);
      }
    }
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("seedDefaultRolesForStore: should be idempotent", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store D" });

  try {
    const first = await roleService.seedDefaultRolesForStore(store._id);
    const second = await roleService.seedDefaultRolesForStore(store._id);
    const allRoles = await Role.find({ storeId: store._id });
    assert.equal(allRoles.length, first.length, "No duplicate roles on re-run");
    assert.equal(second.length, 0, "Second call should create no new roles");
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("seedDefaultRolesForStore: should set storeId on every created role", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store E" });

  try {
    const roles = await roleService.seedDefaultRolesForStore(store._id);
    for (const role of roles) {
      assert.equal(role.storeId.toString(), store._id.toString(), "storeId should be set");
    }
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

// ─── Integration: resolveStoreRoleId ────────────────────────────────────────

test("resolveStoreRoleId: resolves by ObjectId within the correct store", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store F" });

  try {
    await roleService.seedDefaultRolesForStore(store._id);
    const adminRole = await Role.findOne({ storeId: store._id, slug: "admin" });

    const result = await roleService.resolveStoreRoleId(adminRole._id, store._id);
    assert.ok(result, "Should resolve by ObjectId");
    assert.equal(String(result), String(adminRole._id), "Should return the correct role _id");
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("resolveStoreRoleId: resolves by role name", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store G" });

  try {
    await roleService.seedDefaultRolesForStore(store._id);

    const result = await roleService.resolveStoreRoleId("Manager", store._id);
    assert.ok(result, "Should resolve by name");
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("resolveStoreRoleId: resolves by role slug", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store H" });

  try {
    await roleService.seedDefaultRolesForStore(store._id);

    const result = await roleService.resolveStoreRoleId("cashier", store._id);
    assert.ok(result, "Should resolve by slug");
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("resolveStoreRoleId: returns null for non-existent role", async () => {
  await connect();
  const roleService = new RoleServiceClass();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();
  const store = await Store.create({ name: "Test Store I" });

  try {
    await roleService.seedDefaultRolesForStore(store._id);

    const result = await roleService.resolveStoreRoleId("NonExistent", store._id);
    assert.equal(result, null, "Should return null for non-existent role");
  } finally {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

// ─── Integration: seedPlatformRoles ────────────────────────────────────────

test("seedPlatformRoles: creates platform roles with resolvePermissionIds", async () => {
  await connect();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();

  try {
    await seedPlatformRoles();

    const allPermissions = await Permission.find({});
    const platformTemplates = DEFAULT_ROLES.filter((t) => t.scope === "platform");

    for (const template of platformTemplates) {
      const role = await Role.findOne({ slug: template.slug, scope: "platform" });
      assert.ok(role, `Platform role ${template.name} (${template.slug}) should exist`);
      assert.equal(role.scope, "platform", `${template.name} should have scope "platform"`);
      assert.equal(role.storeId, null, `${template.name} should have storeId null`);

      const expectedIds = resolvePermissionIds(template.name, allPermissions);
      assert.equal(role.permissions.length, expectedIds.length,
        `${template.name} should have ${expectedIds.length} permissions`);

      for (const expectedId of expectedIds) {
        assert.ok(
          role.permissions.some((pid) => String(pid) === String(expectedId)),
          `${template.name} should have permission ${expectedId}`
        );
      }
    }
  } finally {
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("seedPlatformRoles: is idempotent (no duplicates on re-run)", async () => {
  await connect();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();

  try {
    await seedPlatformRoles();
    const countBefore = await Role.countDocuments({ scope: "platform" });

    await seedPlatformRoles();
    const countAfter = await Role.countDocuments({ scope: "platform" });

    assert.equal(countAfter, countBefore, "Role count should not increase on re-run");
  } finally {
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});

test("seedPlatformRoles: does not create any platform role with a non-null storeId", async () => {
  await connect();
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await seedPermissions();

  try {
    await seedPlatformRoles();

    const rolesWithStoreId = await Role.find({ scope: "platform", storeId: { $ne: null } });
    assert.equal(rolesWithStoreId.length, 0, "No platform role should have a non-null storeId");
  } finally {
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await disconnect();
  }
});
