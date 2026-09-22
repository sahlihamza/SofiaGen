const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const { hasStoreAccess, resolveTargetStoreId } = require("../middleware/auth");
const Store = require("../models/Store");
const UserStore = require("../models/UserStore");

test("resolveTargetStoreId prefers req.params.storeId", () => {
  const req = { params: { storeId: "storeA" }, body: {}, query: {}, currentStoreId: null };
  assert.equal(resolveTargetStoreId(req), "storeA");
});

test("resolveTargetStoreId falls back to req.body.storeId", () => {
  const req = { params: {}, body: { storeId: "storeB" }, query: {}, currentStoreId: null };
  assert.equal(resolveTargetStoreId(req), "storeB");
});

test("resolveTargetStoreId falls back to req.query.storeId", () => {
  const req = { params: {}, body: {}, query: { storeId: "storeC" }, currentStoreId: null };
  assert.equal(resolveTargetStoreId(req), "storeC");
});

test("resolveTargetStoreId falls back to req.currentStoreId", () => {
  const req = { params: {}, body: {}, query: {}, currentStoreId: "storeD" };
  assert.equal(resolveTargetStoreId(req), "storeD");
});

test("resolveTargetStoreId returns null when no storeId found", () => {
  const req = { params: {}, body: {}, query: {}, currentStoreId: null };
  assert.equal(resolveTargetStoreId(req), null);
});

// SO-02 golden rule: UserStore.status="active" is not sufficient on its own
//  Store.status must also be "active". These need a real database: the
// whole point is that hasStoreAccess actually queries Store, not just
// UserStore.
let so02ActiveStore;
let so02SuspendedStore;
let so02DeletedStore;
let so02PendingStore;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  so02ActiveStore = await Store.create({ name: "__so02_test__ active", status: "active" });
  so02SuspendedStore = await Store.create({ name: "__so02_test__ suspended", status: "suspended" });
  so02DeletedStore = await Store.create({
    name: "__so02_test__ deleted",
    status: "active",
    deletedAt: new Date(),
  });
  // Store.js defaults new stores to status:"pending"  this is what a
  // brand-new self-service store actually looks like right after creation.
  so02PendingStore = await Store.create({ name: "__so02_test__ pending" });
});

test.after(async () => {
  const ids = [so02ActiveStore?._id, so02SuspendedStore?._id, so02DeletedStore?._id, so02PendingStore?._id];
  await UserStore.deleteMany({ storeId: { $in: ids } });
  await Store.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
});

test("hasStoreAccess: an active UserStore on an active Store grants access", async () => {
  const userId = new mongoose.Types.ObjectId();
  await UserStore.create({ userId, storeId: so02ActiveStore._id, status: "active" });

  const membership = await hasStoreAccess({ _id: userId, isSuperAdmin: false }, so02ActiveStore._id);
  assert.ok(membership, "expected access to be granted");
});

test("hasStoreAccess: an active UserStore on a suspended Store is denied  membership alone is not enough", async () => {
  const userId = new mongoose.Types.ObjectId();
  await UserStore.create({ userId, storeId: so02SuspendedStore._id, status: "active" });

  const membership = await hasStoreAccess({ _id: userId, isSuperAdmin: false }, so02SuspendedStore._id);
  assert.equal(membership, null);
});

test("hasStoreAccess: an active UserStore on a soft-deleted Store is denied", async () => {
  const userId = new mongoose.Types.ObjectId();
  await UserStore.create({ userId, storeId: so02DeletedStore._id, status: "active" });

  const membership = await hasStoreAccess({ _id: userId, isSuperAdmin: false }, so02DeletedStore._id);
  assert.equal(membership, null);
});

test("hasStoreAccess: an active UserStore on a brand-new (status:pending) Store grants access", async () => {
  // Regression: a strict === "active" check here would lock every store's
  // own creator out of the store they just created, since new stores
  // default to status:"pending" (see Store.js's isActive virtual).
  const userId = new mongoose.Types.ObjectId();
  await UserStore.create({ userId, storeId: so02PendingStore._id, status: "active" });

  const membership = await hasStoreAccess({ _id: userId, isSuperAdmin: false }, so02PendingStore._id);
  assert.ok(membership, "expected access to be granted");
});

test("hasStoreAccess: a suspended UserStore on an active Store is still denied (unchanged behavior)", async () => {
  const userId = new mongoose.Types.ObjectId();
  await UserStore.create({ userId, storeId: so02ActiveStore._id, status: "suspended" });

  const membership = await hasStoreAccess({ _id: userId, isSuperAdmin: false }, so02ActiveStore._id);
  assert.equal(membership, null);
});

test("hasStoreAccess: superadmin bypasses both checks even with no UserStore at all", async () => {
  const userId = new mongoose.Types.ObjectId();
  const access = await hasStoreAccess({ _id: userId, isSuperAdmin: true }, so02SuspendedStore._id);
  assert.equal(access, true);
});

// SO-01: a regular user with zero UserStore documents (never joined/created
// any store) must be denied any store route  this is the "store DENY" half
// of SO-01's three-part contract (login 200, profile 200, store route 403).
// The other two thirds (login/profile succeeding) aren't blocked by
// anything storeIds-related anywhere in the codebase  confirmed via a
// project-wide grep for `storeIds.length`/`!storeIds`  so there's no
// middleware/controller code left to unit-test there; verified live instead
// (POST /login and GET /me/context both 200 for a freshly registered,
// store-less account).
test("hasStoreAccess: a user with no UserStore documents at all is denied any store", async () => {
  const userId = new mongoose.Types.ObjectId();
  const membership = await hasStoreAccess({ _id: userId, isSuperAdmin: false }, so02ActiveStore._id);
  assert.equal(membership, null);
});
