const test = require("node:test");
const assert = require("node:assert/strict");

const { permissions } = require("../config/rbac/permissions");
const { DEFAULT_ROLES, resolvePermissionIds, getRolePermissionCodes } = require("../config/rbac/roles");

const mockModule = (modulePath, mockExports) => {
  const resolved = require.resolve(modulePath);
  const original = require.cache[resolved]?.exports;
  require.cache[resolved] = { ...require.cache[resolved], exports: mockExports };
  return original;
};

const restoreModule = (modulePath, original) => {
  const resolved = require.resolve(modulePath);
  if (original === undefined) {
    delete require.cache[resolved];
  } else {
    require.cache[resolved].exports = original;
  }
};

const freshRequire = (modulePath) => {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
};

test("seedPlatformRoles uses resolvePermissionIds for each platform role", async () => {
  const mockPerms = permissions.map((p, i) => ({
    _id: `507f1f77bcf86cd7994390${String(i).padStart(3, "0")}`,
    code: p.code,
    module: p.module,
    action: p.action,
    scope: p.scope,
  }));

  const capturedRoles = [];

  const origPermission = mockModule("../models/Permission", {
    find: async () => mockPerms,
  });
  const origRole = mockModule("../models/Role", {
    findOneAndUpdate: async (filter, data) => {
      capturedRoles.push({ filter, data });
      return { ...data, _id: `role_${capturedRoles.length}` };
    },
  });

  try {
    const logger = require("../config/logger");
    logger.info = () => {};
    mockModule("../lib/eventBus", { emitEvent: () => {} });

    const { seedPlatformRoles } = freshRequire("./seedSuperAdmin");

    await seedPlatformRoles();

    const platformTemplates = DEFAULT_ROLES.filter((t) => t.scope === "platform");
    assert.equal(capturedRoles.length, platformTemplates.length);

    for (const { filter, data } of capturedRoles) {
      assert.equal(filter.scope, "platform", "Should upsert on scope:platform");
      assert.ok(filter.slug, "Should upsert on slug");
      assert.equal(data.scope, "platform", "Role data should have scope:platform");
      assert.equal(data.storeId, null, "Platform role should have storeId: null");

      const matchingTemplate = platformTemplates.find((t) => t.slug === filter.slug);
      assert.ok(matchingTemplate, `Template for slug ${filter.slug} should exist`);

      const expectedIds = resolvePermissionIds(matchingTemplate.name, mockPerms);
      const actualCodes = data.permissions;
      assert.deepEqual(actualCodes, expectedIds, `Permissions for ${matchingTemplate.name} should match resolvePermissionIds output`);
    }
  } finally {
    restoreModule("../models/Permission", origPermission);
    restoreModule("../models/Role", origRole);
  }
});

test("seedPlatformRoles does not duplicate platform roles on re-run", async () => {
  const mockPerms = permissions.map((p, i) => ({
    _id: `507f1f77bcf86cd7994390${String(i).padStart(3, "0")}`,
    code: p.code,
    module: p.module,
    action: p.action,
    scope: p.scope,
  }));

  let updateCallCount = 0;
  const capturedRoles = [];

  const origPermission = mockModule("../models/Permission", {
    find: async () => mockPerms,
  });
  const origRole = mockModule("../models/Role", {
    findOneAndUpdate: async (filter, data) => {
      updateCallCount++;
      capturedRoles.push({ filter, data });
      return { ...data, _id: `role_${updateCallCount}` };
    },
  });

  try {
    const { seedPlatformRoles } = freshRequire("./seedSuperAdmin");

    await seedPlatformRoles();
    const firstCount = updateCallCount;
    assert.ok(firstCount > 0, "Should have called update for each platform role");

    capturedRoles.length = 0;
    updateCallCount = 0;

    await seedPlatformRoles();
    assert.equal(updateCallCount, firstCount, "Should call same number of updates on re-run (idempotent via upsert)");
  } finally {
    restoreModule("../models/Permission", origPermission);
    restoreModule("../models/Role", origRole);
  }
});

test("seedPlatformRoles grants exactly the permissions defined in DEFAULT_ROLES", async () => {
  const mockPerms = permissions.map((p, i) => ({
    _id: `507f1f77bcf86cd7994390${String(i).padStart(3, "0")}`,
    code: p.code,
    module: p.module,
    action: p.action,
    scope: p.scope,
  }));

  const capturedRoles = [];

  const origPermission = mockModule("../models/Permission", {
    find: async () => mockPerms,
  });
  const origRole = mockModule("../models/Role", {
    findOneAndUpdate: async (filter, data) => {
      capturedRoles.push(data);
      return data;
    },
  });

  try {
    const { seedPlatformRoles } = freshRequire("./seedSuperAdmin");
    await seedPlatformRoles();

    for (const role of capturedRoles) {
      const template = DEFAULT_ROLES.find((t) => t.name === role.name);
      assert.ok(template, `Role ${role.name} should match a template`);

      const expectedPermissionIds = resolvePermissionIds(template.name, mockPerms);
      assert.deepEqual(role.permissions, expectedPermissionIds,
        `Role "${role.name}" permissions should exactly match resolvePermissionIds(template.name)`
      );

      const expectedCodes = getRolePermissionCodes(role.name, permissions.map((p) => p.code));
      const actualPermIds = role.permissions;
      assert.equal(actualPermIds.length, expectedCodes.length,
        `Role "${role.name}" should have ${expectedCodes.length} permissions, got ${actualPermIds.length}`
      );
    }
  } finally {
    restoreModule("../models/Permission", origPermission);
    restoreModule("../models/Role", origRole);
  }
});

test("seedSuperAdmin uses resolvePermissionIds for Super Admin role", async () => {
  const mockPerms = permissions.map((p, i) => ({
    _id: `507f1f77bcf86cd7994390${String(i).padStart(3, "0")}`,
    code: p.code,
    module: p.module,
    action: p.action,
    scope: p.scope,
  }));

  const capturedRoles = [];

  const origPermission = mockModule("../models/Permission", {
    find: async () => mockPerms,
  });
  const origRole = mockModule("../models/Role", {
    findByIdAndUpdate: async (id, data) => { capturedRoles.push(data); return data; },
    findOneAndUpdate: async (filter, data) => { capturedRoles.push(data); return data; },
    findOne: async () => null,
  });
  const origUser = mockModule("../models/User", {
    findOne: async () => null,
    create: async (data) => data,
  });
  mockModule("./seedPermissions", async () => mockPerms);
  mockModule("./seedPlatformSettings", async () => {});

  try {
    const { seedSuperAdmin } = freshRequire("./seedSuperAdmin");
    await seedSuperAdmin();

    const superAdminRole = capturedRoles.find((r) => r.slug === "super-admin");
    assert.ok(superAdminRole, "Super Admin role should have been created/updated");

    const expectedIds = resolvePermissionIds("Super Admin", mockPerms);
    assert.deepEqual(superAdminRole.permissions, expectedIds,
      "Super Admin role permissions should match resolvePermissionIds('Super Admin', ...)"
    );
  } finally {
    restoreModule("../models/Permission", origPermission);
    restoreModule("../models/Role", origRole);
    restoreModule("../models/User", origUser);
  }
});

test("seedSuperAdmin script does not block on NODE_ENV=production", () => {
  // The script execution block should not exit when NODE_ENV is production
  // We verify by checking the source code does not contain the guard
  const fs = require("fs");
  const source = fs.readFileSync(require.resolve("./seedSuperAdmin"), "utf8");
  assert.ok(
    !source.includes('process.env.NODE_ENV === "production"'),
    "seedSuperAdmin.js should not have NODE_ENV production guard in script execution"
  );
  assert.ok(
    !source.includes("Seed scripts cannot be run in production"),
    "seedSuperAdmin.js should not block execution in production"
  );
});
