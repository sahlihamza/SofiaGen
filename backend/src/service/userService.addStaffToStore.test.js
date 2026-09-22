const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

// SO-06  addStaffToStore: CAS A (new email) and CAS B (existing email, an
// exhaustive ordered set of checks). Same module-cache mocking pattern as
// the sibling userService.addStaff.test.js.

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

// `existingUser`  pass null for CAS A (no matching account), or a plain
// object to exercise one of CAS B's branches.
function setupMocks({ existingUser = null, existingMembership = null } = {}) {
  const userStoreCreateCalls = [];
  const savedMemberships = [];
  const sentEmails = { welcome: [], invitation: [] };

  const membershipDoc = existingMembership
    ? {
        ...existingMembership,
        save: async function () {
          savedMemberships.push({ status: this.status, roleId: this.roleId });
          return this;
        },
      }
    : null;

  const userStoreMock = {
    create: async (data) => {
      userStoreCreateCalls.push(data);
      return data;
    },
    findOne: async () => membershipDoc,
  };

  let createdUserData = null;
  const userMock = {
    findOne: async () => existingUser,
    create: async (data) => {
      createdUserData = data;
      return { ...data, _id: new mongoose.Types.ObjectId() };
    },
  };

  const bcryptMock = {
    hash: async (pw) => `hashed_${pw}`,
  };

  const mocks = {
    bcryptjs: bcryptMock,
    "../models/User": userMock,
    "../models/UserStore": userStoreMock,
    "../models/Role": {},
    "../models/Store": {},
    "../models/LoginHistory": {},
    "../models/AuditLog": {},
    "../lib/eventBus": { emitEvent: () => {} },
    "./RoleService": {},
    "../utils/generatePassword": { generatePassword: () => "Gen3rat3d-Pass!" },
    "../utils/mailer": {
      sendStaffWelcomeEmail: async (to, data) => { sentEmails.welcome.push({ to, ...data }); },
      sendInvitationEmail: async (to, name, url) => { sentEmails.invitation.push({ to, name, url }); },
    },
  };

  const originals = {};
  for (const [path, mock] of Object.entries(mocks)) {
    originals[path] = mockModule(path, mock);
  }

  return {
    originals,
    userStoreCreateCalls,
    savedMemberships,
    sentEmails,
    getCreatedUserData: () => createdUserData,
  };
}

const restoreAll = (originals) => {
  for (const [path, orig] of Object.entries(originals)) {
    restoreModule(path, orig);
  }
  delete require.cache[require.resolve("./userService")];
};

test("addStaffToStore CAS A: new email creates an active UserStore and emails the generated password", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals, userStoreCreateCalls, sentEmails, getCreatedUserData } = setupMocks({ existingUser: null });

  try {
    const userService = freshRequire("./userService");
    const result = await userService.addStaffToStore({ email: "new@test.com", name: "New Staff", roleId, storeId });

    assert.equal(result.outcome, "created");
    assert.equal(result.emailSent, true);
    assert.equal(getCreatedUserData().status, "Active");
    assert.equal(userStoreCreateCalls.length, 1);
    assert.equal(userStoreCreateCalls[0].status, "active");
    assert.equal(String(userStoreCreateCalls[0].roleId), String(roleId));
    assert.equal(sentEmails.welcome.length, 1);
    assert.equal(sentEmails.welcome[0].password, "Gen3rat3d-Pass!");
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: soft-deleted account is rejected", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals } = setupMocks({ existingUser: { _id: "u1", deletedAt: new Date(), status: "Active" } });

  try {
    const userService = freshRequire("./userService");
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", roleId, storeId }),
      (err) => err.name === "AccountDeleted"
    );
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: suspended platform account is rejected", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals } = setupMocks({ existingUser: { _id: "u1", deletedAt: null, status: "Suspended" } });

  try {
    const userService = freshRequire("./userService");
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", roleId, storeId }),
      (err) => err.name === "AccountSuspended"
    );
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: platform superadmin is rejected", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals } = setupMocks({
    existingUser: { _id: "u1", deletedAt: null, status: "Active", isSuperAdmin: true },
  });

  try {
    const userService = freshRequire("./userService");
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", roleId, storeId }),
      (err) => err.name === "InvalidTarget"
    );
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: already an active member of this store is rejected (409)", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals } = setupMocks({
    existingUser: { _id: "u1", deletedAt: null, status: "Active" },
    existingMembership: { status: "active", roleId: new mongoose.Types.ObjectId() },
  });

  try {
    const userService = freshRequire("./userService");
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", roleId, storeId }),
      (err) => err.name === "AlreadyMember"
    );
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: a pending invitation on this store is rejected (409), not silently re-sent", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals } = setupMocks({
    existingUser: { _id: "u1", deletedAt: null, status: "Active" },
    existingMembership: { status: "invited", roleId: new mongoose.Types.ObjectId() },
  });

  try {
    const userService = freshRequire("./userService");
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", roleId, storeId }),
      (err) => err.name === "InvitationPending"
    );
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: a suspended (revoked) membership is reactivated with the NEW role, not the stale one", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const oldRoleId = new mongoose.Types.ObjectId();
  const newRoleId = new mongoose.Types.ObjectId();
  const { originals, savedMemberships, sentEmails } = setupMocks({
    existingUser: { _id: "u1", deletedAt: null, status: "Active", email: "x@test.com", name: "X" },
    existingMembership: { status: "suspended", roleId: oldRoleId },
  });

  try {
    const userService = freshRequire("./userService");
    const result = await userService.addStaffToStore({ email: "x@test.com", roleId: newRoleId, storeId });

    assert.equal(result.outcome, "reactivated");
    assert.equal(savedMemberships.length, 1);
    assert.equal(savedMemberships[0].status, "active");
    assert.equal(String(savedMemberships[0].roleId), String(newRoleId));
    assert.equal(sentEmails.invitation.length, 1);
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore CAS B: existing user with no membership at all on this store is attached", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const { originals, userStoreCreateCalls, sentEmails } = setupMocks({
    existingUser: { _id: "u1", deletedAt: null, status: "Active", email: "x@test.com", name: "X" },
    existingMembership: null,
  });

  try {
    const userService = freshRequire("./userService");
    const result = await userService.addStaffToStore({ email: "x@test.com", roleId, storeId });

    assert.equal(result.outcome, "attached");
    assert.equal(userStoreCreateCalls.length, 1);
    assert.equal(userStoreCreateCalls[0].status, "active");
    assert.equal(String(userStoreCreateCalls[0].roleId), String(roleId));
    assert.equal(sentEmails.invitation.length, 1);
  } finally {
    restoreAll(originals);
  }
});

test("addStaffToStore: rejects when roleId or storeId is missing", async () => {
  const { originals } = setupMocks({ existingUser: null });
  try {
    const userService = freshRequire("./userService");
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", storeId: new mongoose.Types.ObjectId() }),
      (err) => err.name === "ValidationError"
    );
    await assert.rejects(
      () => userService.addStaffToStore({ email: "x@test.com", roleId: new mongoose.Types.ObjectId() }),
      (err) => err.name === "ValidationError"
    );
  } finally {
    restoreAll(originals);
  }
});
