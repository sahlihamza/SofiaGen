const test = require("node:test");
const assert = require("node:assert/strict");

// SO-02 regression coverage: selectStore (backing PATCH /user/stores/select,
// which drives the admin store-switcher) must verify an ACTIVE UserStore on
// an ACTIVE store before writing currentStoreId  an invited/suspended
// membership, or a membership on a suspended store, must not let the client
// switch into it. Before this fix, the UserStore lookup had no status
// filter at all.

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

function setupMocks({ isSuperAdmin = false, membership = null, store = { status: "active", deletedAt: null } }) {
  const updates = [];
  const userMock = {
    findById: () => ({
      select: () => ({
        lean: async () => (isSuperAdmin ? { isSuperAdmin: true } : { isSuperAdmin: false, userType: "staff" }),
      }),
    }),
    findByIdAndUpdate: async (userId, patch) => {
      updates.push(patch);
      return { _id: userId, currentStoreId: patch.currentStoreId };
    },
  };

  const userStoreMock = {
    findOne: async (query) => {
      // Only return the membership if the caller actually filtered by
      // status: "active" AND the fixture's own status matches it  this is
      // what makes the regression test fail against the old code, which
      // never included status in the query at all.
      if (!membership) return null;
      if (query.status && membership.status !== query.status) return null;
      return membership;
    },
  };

  const storeMock = {
    findById: () => ({
      select: () => ({
        lean: async () => store,
      }),
    }),
  };

  const mocks = {
    "../models/User": userMock,
    "../models/Store": storeMock,
    "../models/UserStore": userStoreMock,
    bcryptjs: {},
    "./RoleService": {},
    "../utils/generatePassword": { generatePassword: () => "x" },
    "../utils/mailer": { sendStaffWelcomeEmail: async () => {}, sendInvitationEmail: async () => {} },
  };

  const originals = Object.entries(mocks).map(([p, m]) => [p, mockModule(p, m)]);
  const userService = freshRequire("./userService");

  return {
    userService,
    updates,
    cleanup: () => originals.forEach(([p, orig]) => restoreModule(p, orig)),
  };
}

test("selectStore: a suspended UserStore membership is rejected", async () => {
  const { userService, updates, cleanup } = setupMocks({
    membership: { status: "suspended" },
  });

  await assert.rejects(
    () => userService.selectStore("user1", "store1"),
    (err) => err.name === "StoreNotAssigned"
  );
  assert.equal(updates.length, 0);

  cleanup();
});

test("selectStore: an active membership on a suspended store is rejected", async () => {
  const { userService, updates, cleanup } = setupMocks({
    membership: { status: "active" },
    store: { status: "suspended", deletedAt: null },
  });

  await assert.rejects(
    () => userService.selectStore("user1", "store1"),
    (err) => err.name === "StoreNotAssigned"
  );
  assert.equal(updates.length, 0);

  cleanup();
});

test("selectStore: an active membership on a brand-new (status:pending) store succeeds", async () => {
  // Regression: Store.js defaults new stores to status:"pending", and its
  // own isActive virtual already treats "pending"/"trial" as usable  a
  // strict === "active" check here would lock every store's own creator out
  // of the store they just created.
  const { userService, updates, cleanup } = setupMocks({
    membership: { status: "active" },
    store: { status: "pending", deletedAt: null },
  });

  const user = await userService.selectStore("user1", "store1");
  assert.equal(user.currentStoreId, "store1");
  assert.equal(updates.length, 1);

  cleanup();
});

test("selectStore: an active membership on an active store succeeds", async () => {
  const { userService, updates, cleanup } = setupMocks({
    membership: { status: "active" },
    store: { status: "active", deletedAt: null },
  });

  const user = await userService.selectStore("user1", "store1");
  assert.equal(user.currentStoreId, "store1");
  assert.equal(updates.length, 1);

  cleanup();
});

test("selectStore: superadmin bypasses the membership check without one existing", async () => {
  const { userService, updates, cleanup } = setupMocks({
    isSuperAdmin: true,
    membership: null,
  });

  const user = await userService.selectStore("admin1", "store1");
  assert.equal(user.currentStoreId, "store1");
  assert.equal(updates.length, 1);

  cleanup();
});
