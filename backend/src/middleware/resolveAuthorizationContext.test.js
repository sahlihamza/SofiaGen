const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const UserStore = require("../models/UserStore");
const resolveAuthorizationContext = require("./resolveAuthorizationContext");

// SO-16  the fixed-shape authContext contract, exercised for its three
// documented cases (platform / store / superadmin) plus the "route matches
// neither pattern" fallback the contract table doesn't spell out but the
// acceptance criteria implies ("produit toujours ce contrat, sans champ
// manquant"  scope can never be left null).

let store;
let role;
let permission;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  store = await Store.create({ name: "__so16_test__ Store", status: "active" });
  permission = await Permission.create({
    code: "so16test.view",
    name: "__so16_test__ view",
    module: "__so16_test__",
    action: "view",
    scope: "store",
    category: "General",
    riskLevel: "low",
    description: "test",
  });
  role = await Role.create({
    name: "__so16_test__ Role",
    slug: "__so16_test__-role",
    scope: "store",
    storeId: store._id,
    permissions: [permission._id],
  });
});

test.after(async () => {
  await UserStore.deleteMany({ storeId: store?._id });
  await Role.deleteMany({ _id: role?._id });
  await Permission.deleteMany({ _id: permission?._id });
  await Store.deleteMany({ _id: store?._id });
  await mongoose.disconnect();
});

const fakeUserId = () => new mongoose.Types.ObjectId();

function makeReq({ path: reqPath, baseUrl = "", user, currentStoreId = null }) {
  return {
    path: reqPath,
    baseUrl,
    params: {},
    body: {},
    query: {},
    get: () => undefined,
    currentStoreId,
    user,
  };
}

function runMiddleware(req) {
  return new Promise((resolve, reject) => {
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        reject(new Error(`middleware responded ${this.statusCode}: ${JSON.stringify(payload)}`));
      },
    };
    resolveAuthorizationContext(req, res, () => resolve()).catch(reject);
  });
}

test("platform route: scope=platform, storeId=null, permissions from User.role", async () => {
  const userId = fakeUserId();
  // Mirrors what loadUser's own .populate({path:"role", populate:{path:"permissions"}})
  // produces in the real request pipeline  resolvePlatformPermissions reads
  // role.permissions[].code, which only exists once populated.
  const populatedRole = await Role.findById(role._id).populate("permissions").lean();
  const req = makeReq({
    path: "/",
    baseUrl: "/api/v1/platform/settings",
    user: { _id: userId, isSuperAdmin: false, role: [populatedRole] },
  });

  await runMiddleware(req);

  assert.equal(req.authContext.scope, "platform");
  assert.equal(req.authContext.storeId, null);
  assert.equal(req.authContext.isSuperAdmin, false);
  assert.equal(req.authContext.membership, null);
  assert.ok(req.authContext.permissions.has("so16test.view"));
});

test("store route: membership loaded, permissions from UserStore.roleId, not from User.role", async () => {
  const userId = fakeUserId();
  await UserStore.create({ userId, storeId: store._id, roleId: role._id, status: "active" });

  const req = makeReq({
    path: "/",
    baseUrl: `/api/store/${store._id}/products`,
    user: { _id: userId, isSuperAdmin: false, role: [] }, // no platform role at all
    currentStoreId: String(store._id),
  });

  await runMiddleware(req);

  assert.equal(req.authContext.scope, "store");
  assert.equal(String(req.authContext.storeId), String(store._id));
  assert.ok(req.authContext.membership, "expected a loaded membership doc");
  assert.ok(req.authContext.role, "expected the role to be populated");
  assert.ok(req.authContext.permissions.has("so16test.view"));
});

test("superadmin: isSuperAdmin true, never a fabricated membership", async () => {
  const userId = fakeUserId();
  // Deliberately no UserStore document for this user at all.
  const req = makeReq({
    path: "/",
    baseUrl: `/api/store/${store._id}/products`,
    user: { _id: userId, isSuperAdmin: true, role: [] },
    currentStoreId: String(store._id),
  });

  await runMiddleware(req);

  assert.equal(req.authContext.isSuperAdmin, true);
  // No real UserStore exists for this user/store  the contract requires
  // this to stay an explicit null, never an object standing in for one.
  assert.equal(req.authContext.membership, null);
});

test("route matching neither platform nor store pattern: scope still resolves, never null", async () => {
  const userId = fakeUserId();
  const req = makeReq({
    path: "/",
    baseUrl: "/api/notifications",
    user: { _id: userId, isSuperAdmin: false, role: [] },
    currentStoreId: null,
  });

  await runMiddleware(req);

  assert.equal(req.authContext.scope, "platform");
  assert.equal(req.authContext.storeId, null);
  assert.deepEqual([...req.authContext.permissions], []);
});

test("contract shape: every field always present regardless of route", async () => {
  const userId = fakeUserId();
  const req = makeReq({
    path: "/",
    baseUrl: "/api/notifications",
    user: { _id: userId, isSuperAdmin: false, role: [] },
  });

  await runMiddleware(req);

  for (const field of ["userId", "isSuperAdmin", "scope", "storeId", "membership", "role", "permissions", "permissionByCode"]) {
    assert.ok(field in req.authContext, `missing field: ${field}`);
  }
});
