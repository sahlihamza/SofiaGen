const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const { normalizePermissionCode } = require("../utils/normalizePermissionCode");
const { validatePermissionCode } = require("../utils/validatePermissionCode");
const { permissions } = require("../config/rbac/permissions");

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("normalizePermissionCode converts underscore to dot", () => {
  assert.equal(normalizePermissionCode("theme_create"), "theme.create");
  assert.equal(normalizePermissionCode("platform_role_view"), "platform.role.view");
  assert.equal(normalizePermissionCode("Theme.Create"), "theme.create");
  assert.equal(normalizePermissionCode("  theme.create  "), "theme.create");
  assert.equal(normalizePermissionCode(""), "");
  assert.equal(normalizePermissionCode(null), "");
  assert.equal(normalizePermissionCode("already.dot"), "already.dot");
});

test("normalizePermissionCode collapses multiple dots", () => {
  assert.equal(normalizePermissionCode("theme__create"), "theme.create");
  assert.equal(normalizePermissionCode("platform..role.view"), "platform.role.view");
});

test("validatePermissionCode accepts valid dot format", () => {
  assert.equal(validatePermissionCode("theme.create"), true);
  assert.equal(validatePermissionCode("platform.role.view"), true);
  assert.equal(validatePermissionCode("a.b.c"), true);
});

test("validatePermissionCode rejects underscore format", () => {
  assert.equal(validatePermissionCode("theme_create"), false);
  assert.equal(validatePermissionCode("platform_role_view"), false);
});

test("validatePermissionCode rejects invalid formats", () => {
  assert.equal(validatePermissionCode(""), false);
  assert.equal(validatePermissionCode(null), false);
  assert.equal(validatePermissionCode("123.invalid"), false);
  assert.equal(validatePermissionCode("nodot"), false);
  assert.equal(validatePermissionCode(".leadingdot"), false);
  assert.equal(validatePermissionCode("trailingdot."), false);
});

test("permissions.js exports valid permission codes", () => {
  const invalidCodes = permissions.filter((p) => !validatePermissionCode(p.code));
  assert.equal(invalidCodes.length, 0, `Found ${invalidCodes.length} invalid permission codes: ${invalidCodes.map((p) => p.code).join(", ")}`);
});

test("permissions.js has no duplicate codes", () => {
  const codes = permissions.map((p) => p.code);
  const uniqueCodes = new Set(codes);
  assert.equal(codes.length, uniqueCodes.size, `Found ${codes.length - uniqueCodes.size} duplicate permission codes`);
});

test("permissions.js scope is consistent with module", () => {
  const platformModules = [
    "Platform Dashboard", "Platform Plan", "Platform Billing", "Platform User",
    "Platform Role", "Platform Coupons", "Platform Store", "Platform Settings",
    "Platform Invitation", "Platform Team", "Audit", "Analytics",
    "Platform Notification", "Platform Support Ticket", "Platform Email",
  ];
  const mismatches = permissions.filter((p) => {
    if (platformModules.includes(p.module)) return p.scope !== "platform";
    return p.scope !== "store";
  });
  assert.equal(mismatches.length, 0, `Found ${mismatches.length} scope mismatches: ${mismatches.map((p) => `${p.code} (${p.scope})`).join(", ")}`);
});

test("DEFAULT_ROLES Platform Admin has valid permission codes", () => {
  const { DEFAULT_ROLES } = require("../config/rbac/roles");
  const platformAdmin = DEFAULT_ROLES.find((r) => r.name === "Platform Admin");
  assert.ok(platformAdmin, "Platform Admin role should exist");

  const validCodes = new Set(permissions.map((p) => p.code));
  const invalidCodes = platformAdmin.permissionCodes.filter((c) => !validCodes.has(c));
  assert.equal(invalidCodes.length, 0, `Platform Admin has ${invalidCodes.length} invalid permission codes: ${invalidCodes.join(", ")}`);
});

test("DEFAULT_ROLES has expected role names", () => {
  const { DEFAULT_ROLES } = require("../config/rbac/roles");
  const expectedNames = ["Super Admin", "Platform Admin", "Store Owner", "CEO", "Manager", "Accountant", "Cashier", "Security Guard", "Driver", "Admin"];
  const actualNames = DEFAULT_ROLES.map((r) => r.name);
  for (const name of expectedNames) {
    assert.ok(actualNames.includes(name), `Role "${name}" should exist in DEFAULT_ROLES`);
  }
});

test("buildPermissionGuard: SuperAdmin bypasses all permission checks", async () => {
  const { buildPermissionGuard } = require("../middleware/auth");
  const guard = buildPermissionGuard((perms) => ({ ok: perms.has("theme.create") }));

  let result;
  const mockRes = {
    status: () => ({ json: (body) => { result = body; } }),
  };
  const mockNext = () => { result = "next"; };

  await guard({ user: { isSuperAdmin: true }, authContext: { permissions: new Set() } }, mockRes, mockNext);
  assert.equal(result, "next", "SuperAdmin should bypass permission check");
});

test("buildPermissionGuard: non-SuperAdmin needs explicit permission", async () => {
  const { buildPermissionGuard } = require("../middleware/auth");
  const guard = buildPermissionGuard((perms) => ({ ok: perms.has("theme.create") }));

  let result;
  const mockRes = {
    status: () => ({ json: (body) => { result = body; } }),
  };
  const mockNext = () => { result = "next"; };

  await guard(
    { user: { isSuperAdmin: false }, authContext: { permissions: new Set(["theme.create"]) } },
    mockRes,
    mockNext
  );
  assert.equal(result, "next", "User with theme.create permission should pass");

  await guard(
    { user: { isSuperAdmin: false }, authContext: { permissions: new Set(["page.view"]) } },
    mockRes,
    mockNext
  );
  assert.ok(result && result.success === false, "User without theme.create permission should be denied");
});

test("buildPermissionGuard: scope mismatch blocks permission even if code matches", async () => {
  const { buildPermissionGuard } = require("../middleware/auth");
  // `needed` must be set on the ok:true branch too  see SO-17's fix to
  // requirePermission() in auth.js: the scope-check reads result.needed to
  // look the permission doc up, so leaving it undefined on success (as a
  // naive resolver would) makes the whole mismatch check unreachable.
  const guard = buildPermissionGuard((perms) => ({ ok: perms.has("product.create"), needed: "product.create" }));

  let result;
  const mockRes = {
    status: () => ({ json: (body) => { result = body; } }),
  };
  const mockNext = () => { result = "next"; };

  await guard(
    {
      user: { isSuperAdmin: false },
      authContext: {
        scope: "platform",
        permissions: new Set(["product.create"]),
        permissionByCode: new Map([["product.create", { scope: "store" }]]),
      },
    },
    mockRes,
    mockNext
  );
  assert.ok(result && result.success === false, "Store permission should be rejected on platform scope");
  assert.ok(result && result.message.includes("scope"), "Error message should mention scope mismatch");
});

test("resolveAuthorizationContext: platform route sets platform scope", async () => {
  const resolveAuthorizationContext = require("../middleware/resolveAuthorizationContext");
  const { DEFAULT_ROLES } = require("../config/rbac/roles");

  let result;
  const mockRes = {
    status: () => ({ json: (body) => { result = body; } }),
  };
  const mockNext = () => { result = "next"; };

  // resolvePlatformPermissions reads role.permissions[].code (the shape
  // loadUser's own populate() produces in the real request pipeline)  NOT
  // role.permissionCodes (a flat string array), which is what DEFAULT_ROLES
  // itself stores. Build a role shaped like the real populated one instead
  // of passing a DEFAULT_ROLES entry (or its _id) directly.
  const platformAdmin = DEFAULT_ROLES.find((r) => r.name === "Platform Admin");
  const mockReq = {
    user: {
      isSuperAdmin: false,
      role: [{ permissions: platformAdmin.permissionCodes.map((code) => ({ code })) }],
    },
    baseUrl: "/api/v1/platform",
    path: "/api/v1/platform/roles",
    authContext: null,
  };

  await resolveAuthorizationContext(mockReq, mockRes, mockNext);
  assert.equal(result, "next", "Should call next()");
  assert.equal(mockReq.authContext.scope, "platform", "Platform route should set scope to platform");
  assert.ok(mockReq.authContext.permissions.has("platform.role.view"), "Platform Admin should have platform.role.view");
});

test("resolveAuthorizationContext: store route sets store scope and resolves membership", async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  const resolveAuthorizationContext = require("../middleware/resolveAuthorizationContext");

  let result;
  const mockRes = {
    status: () => ({ json: (body) => { result = body; } }),
  };
  const mockNext = () => { result = "next"; };

  const mockReq = {
    user: { _id: new mongoose.Types.ObjectId(), isSuperAdmin: false },
    baseUrl: "/api",
    path: "/api/stores/store123",
    params: { storeId: "store123" },
    authContext: null,
  };

  await resolveAuthorizationContext(mockReq, mockRes, mockNext);
  assert.equal(result, "next", "Should call next()");
  assert.equal(mockReq.authContext.scope, "store", "Store route should set scope to store");
  assert.equal(mockReq.authContext.storeId, "store123", "Should resolve storeId from params");
});

test("resolveAuthorizationContext: SuperAdmin never gets a fabricated permission or membership", async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  const resolveAuthorizationContext = require("../middleware/resolveAuthorizationContext");

  let result;
  const mockRes = {
    status: () => ({ json: (body) => { result = body; } }),
  };
  const mockNext = () => { result = "next"; };

  const mockReq = {
    user: { _id: new mongoose.Types.ObjectId(), isSuperAdmin: true },
    baseUrl: "/api/v1/platform",
    path: "/api/v1/platform/roles",
    authContext: null,
  };

  await resolveAuthorizationContext(mockReq, mockRes, mockNext);
  assert.equal(result, "next", "Should call next()");
  // SO-16.2: the bypass is the isSuperAdmin flag itself  a "*" sentinel (or
  // any other fabricated permission) would be exactly the kind of fake
  // grant the contract explicitly forbids inventing.
  assert.equal(mockReq.authContext.isSuperAdmin, true);
  assert.equal(mockReq.authContext.membership, null, "must never fabricate a membership");
  assert.equal(mockReq.authContext.scope, "platform", "SuperAdmin should have platform scope");
});

test("DEFAULT_ROLES Store Owner gets all store permissions", () => {
  const { DEFAULT_ROLES, resolvePermissionIds } = require("../config/rbac/roles");
  const storeOwner = DEFAULT_ROLES.find((r) => r.name === "Store Owner");
  assert.ok(storeOwner, "Store Owner role should exist");

  const storePermissions = permissions.filter((p) => p.scope === "store");
  assert.ok(
    storeOwner.permissionCodes.length >= storePermissions.length,
    `Store Owner should have at least ${storePermissions.length} store permissions, got ${storeOwner.permissionCodes.length}`
  );
});

test("DEFAULT_ROLES all permissionCodes exist in permissions.js", () => {
  const { DEFAULT_ROLES } = require("../config/rbac/roles");
  const validCodes = new Set(permissions.map((p) => p.code));
  const invalidCodes = [];

  for (const role of DEFAULT_ROLES) {
    for (const code of role.permissionCodes) {
      if (!validCodes.has(code)) {
        invalidCodes.push(`${code} (in role "${role.name}")`);
      }
    }
  }

  assert.equal(
    invalidCodes.length,
    0,
    `Found ${invalidCodes.length} invalid permission codes in DEFAULT_ROLES: ${invalidCodes.join(", ")}`
  );
});
