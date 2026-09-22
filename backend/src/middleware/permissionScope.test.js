const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { requirePermission } = require("./auth");

// SO-17  a platform permission must never grant access to a store action,
// and vice versa. Structurally this already holds because
// resolveAuthorizationContext only ever loads ONE side's permissions into
// authContext.permissions for a real guarded action route (platform routes
// load resolvePlatformPermissions only, store routes load
// resolveStorePermissions only  they're merged together only for the
// read-only /api/me/context introspection endpoint, never for an actual
// permission-gated action). These tests lock that behavior in explicitly
// rather than leaving it as an implicit consequence of routing.

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

function runGuard(guard, req) {
  return new Promise((resolve) => {
    const res = makeRes();
    let nextCalled = false;
    guard(req, res, () => {
      nextCalled = true;
      resolve({ nextCalled, res });
    });
    if (!nextCalled) {
      // Synchronous guards resolve immediately without calling next().
      setImmediate(() => resolve({ nextCalled, res }));
    }
  });
}

test("Platform Admin (platform permissions only, no UserStore) is denied a store permission", async () => {
  const req = {
    user: { _id: "u1", isSuperAdmin: false },
    authContext: {
      scope: "platform",
      permissions: new Set(["platform.user.view", "platform.settings.update"]),
      permissionByCode: new Map(),
    },
  };

  const { nextCalled, res } = await runGuard(requirePermission("products.delete"), req);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("Store Owner (store permissions only, empty User.role) is denied a platform permission", async () => {
  const req = {
    user: { _id: "u2", isSuperAdmin: false },
    authContext: {
      scope: "store",
      permissions: new Set(["products.view", "products.delete", "orders.update"]),
      permissionByCode: new Map(),
    },
  };

  const { nextCalled, res } = await runGuard(requirePermission("platform.user.create"), req);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("A permission the caller actually holds, matching the route's own scope, is granted", async () => {
  const req = {
    user: { _id: "u3", isSuperAdmin: false },
    authContext: {
      scope: "store",
      permissions: new Set(["products.delete"]),
      permissionByCode: new Map(),
    },
  };

  const { nextCalled } = await runGuard(requirePermission("products.delete"), req);
  assert.equal(nextCalled, true);
});

test("SuperAdmin bypasses the scope check entirely, on either side", async () => {
  const platformReq = {
    user: { _id: "root", isSuperAdmin: true },
    authContext: { scope: "store", permissions: new Set(), permissionByCode: new Map() },
  };
  const storeReq = {
    user: { _id: "root", isSuperAdmin: true },
    authContext: { scope: "platform", permissions: new Set(), permissionByCode: new Map() },
  };

  assert.equal((await runGuard(requirePermission("platform.user.create"), platformReq)).nextCalled, true);
  assert.equal((await runGuard(requirePermission("products.delete"), storeReq)).nextCalled, true);
});

// Explicit scope-tag check: even if a code happened to be present in the
// caller's permission set, a permission document whose OWN declared scope
// disagrees with the route's current authContext.scope is still rejected 
// this is the actual scope-mismatch branch in buildPermissionGuard, distinct
// from the "doesn't have the permission at all" case above.
test("A permission code present but tagged with a mismatched scope is still rejected", async () => {
  const req = {
    user: { _id: "u4", isSuperAdmin: false },
    authContext: {
      scope: "store",
      permissions: new Set(["platform.user.view"]),
      permissionByCode: new Map([["platform.user.view", { scope: "platform" }]]),
    },
  };

  const { nextCalled, res } = await runGuard(requirePermission("platform.user.view"), req);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});
