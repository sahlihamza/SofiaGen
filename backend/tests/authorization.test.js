require("dotenv").config();
const mongoose = require("mongoose");
const {
  requirePermission,
  normalizePermissionCode,
  validateStoreAccess,
  isSuperAdminRole,
} = require("../src/middleware/auth");
const Role = require("../src/models/Role");
const Permission = require("../src/models/Permission");
const User = require("../src/models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";

// Helper to build a fake req/res/next
const makeReq = (user, overrides = {}) => ({
  user,
  params: overrides.params || {},
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const nextSpy = () => {
  const next = jest.fn();
  next.called = () => next.mock.calls.length > 0;
  next.error = () => next.mock.calls[0]?.[0];
  return next;
};

const superAdminUser = {
  _id: new mongoose.Types.ObjectId(),
  isSuperAdmin: true,
  role: [],
};

const superAdminRoleUser = {
  _id: new mongoose.Types.ObjectId(),
  isSuperAdmin: false,
  role: [{ _id: new mongoose.Types.ObjectId(), name: "Super Admin" }],
};

const buildRoleUser = (roleId, storeIds = []) => ({
  _id: new mongoose.Types.ObjectId(),
  isSuperAdmin: false,
  role: [{ _id: roleId }],
  storeIds,
  currentStoreId: storeIds[0] || null,
});

let mediaViewPerm;
let mediaDeletePerm;
let managerRole;
let managerStoreA;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});

  // Create permissions
  [mediaViewPerm, mediaDeletePerm] = await Permission.insertMany([
    {
      code: "media.view",
      name: "media_view",
      module: "Media",
      action: "view",
      scope: "store",
      category: "Content",
      riskLevel: "low",
      description: "view media",
    },
    {
      code: "media.delete",
      name: "media_delete",
      module: "Media",
      action: "delete",
      scope: "store",
      category: "Content",
      riskLevel: "high",
      description: "delete media",
    },
  ]);

// Manager role: has media.view but NOT media.delete
  managerRole = await Role.create({
    name: "Manager",
    slug: "manager",
    scope: "store",
    description: "Manager role",
    permissions: [mediaViewPerm._id],
  });

  // Two stores for cross-store isolation test
  managerStoreA = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe("normalizePermissionCode", () => {
  test("keeps canonical module.action format", () => {
    expect(normalizePermissionCode("media.view")).toBe("media.view");
    expect(normalizePermissionCode("saved_blocks.delete")).toBe("saved_blocks.delete");
  });

  test("converts legacy module_action to module.action", () => {
    expect(normalizePermissionCode("media_view")).toBe("media.view");
    expect(normalizePermissionCode("products_create")).toBe("products.create");
    expect(normalizePermissionCode("platform_plan_view")).toBe("platform_plan.view");
  });

  test("handles empty / non-string input", () => {
    expect(normalizePermissionCode("")).toBe("");
    expect(normalizePermissionCode(null)).toBe("");
    expect(normalizePermissionCode(undefined)).toBe("");
  });
});

describe("isSuperAdminRole", () => {
  test("returns true when a role is named Super Admin", () => {
    expect(isSuperAdminRole([{ name: "Super Admin" }])).toBe(true);
    expect(isSuperAdminRole([{ name: "super admin" }])).toBe(true);
  });

  test("returns false for any other role", () => {
    expect(isSuperAdminRole([{ name: "Admin" }])).toBe(false);
    expect(isSuperAdminRole([{ name: "adminstore" }])).toBe(false);
    expect(isSuperAdminRole([{ name: "CEO" }])).toBe(false);
    expect(isSuperAdminRole([{ name: "Manager" }])).toBe(false);
  });
});

describe("requirePermission", () => {
  test("returns 401 when user not loaded", async () => {
    const res = makeRes();
    const next = nextSpy();
    const mw = requirePermission("media.view");
    await mw(makeReq(null), res, next);
    expect(res.statusCode).toBe(401);
    expect(next.called()).toBe(false);
  });

  test("superadmin bypasses (isSuperAdmin flag)", async () => {
    const res = makeRes();
    const next = nextSpy();
    const mw = requirePermission("media.delete");
    await mw(makeReq(superAdminUser), res, next);
    expect(next.called()).toBe(true);
    expect(res.statusCode).toBeUndefined();
  });

  test("Super Admin role bypasses", async () => {
    const res = makeRes();
    const next = nextSpy();
    const mw = requirePermission("media.delete");
    await mw(makeReq(superAdminRoleUser), res, next);
    expect(next.called()).toBe(true);
  });

  test("role WITH the permission is allowed (media.view)", async () => {
    const user = buildRoleUser(managerRole._id, [managerStoreA]);
    const res = makeRes();
    const next = nextSpy();
    const mw = requirePermission("media.view");
    await mw(makeReq(user), res, next);
    expect(next.called()).toBe(true);
  });

  test("role WITHOUT the permission is denied 403 (media.delete)", async () => {
    const user = buildRoleUser(managerRole._id, [managerStoreA]);
    const res = makeRes();
    const next = nextSpy();
    const mw = requirePermission("media.delete");
    await mw(makeReq(user), res, next);
    expect(res.statusCode).toBe(403);
    expect(next.called()).toBe(false);
  });

  test("legacy module_action code resolves to the seeded module.action permission", async () => {
    // Manager has media.view (code "media.view"). Passing legacy "media_view"
    // must be normalized to "media.view" and granted.
    const user = buildRoleUser(managerRole._id, [managerStoreA]);
    const res = makeRes();
    const next = nextSpy();
    const mw = requirePermission("media_view");
    await mw(makeReq(user), res, next);
    expect(next.called()).toBe(true);
  });
});

describe("validateStoreAccess", () => {
  test("superadmin bypasses store scope", () => {
    const res = makeRes();
    const next = nextSpy();
    validateStoreAccess(
      makeReq(superAdminUser, { params: { storeId: "someOtherStore" } }),
      res,
      next
    );
    expect(next.called()).toBe(true);
  });

  test("user with the store in storeIds is allowed", () => {
    const user = buildRoleUser(managerRole._id, [managerStoreA]);
    const res = makeRes();
    const next = nextSpy();
    validateStoreAccess(
      makeReq(user, { params: { storeId: managerStoreA.toString() } }),
      res,
      next
    );
    expect(next.called()).toBe(true);
  });

  test("user WITHOUT the store in storeIds is denied 403 (cross-store isolation)", () => {
    const otherStore = new mongoose.Types.ObjectId();
    const user = buildRoleUser(managerRole._id, [managerStoreA]);
    const res = makeRes();
    const next = nextSpy();
    validateStoreAccess(
      makeReq(user, { params: { storeId: otherStore.toString() } }),
      res,
      next
    );
    expect(res.statusCode).toBe(403);
    expect(next.called()).toBe(false);
  });

  test("returns 400 when storeId is missing", () => {
    const user = buildRoleUser(managerRole._id, [managerStoreA]);
    const res = makeRes();
    const next = nextSpy();
    validateStoreAccess(makeReq(user, { params: {} }), res, next);
    expect(res.statusCode).toBe(400);
    expect(next.called()).toBe(false);
  });
});
