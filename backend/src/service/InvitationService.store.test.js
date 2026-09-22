const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

// Store-scoped invitations: createInvitation must only accept a single,
// real store-scope Role that belongs to THIS store, and acceptInvitation
// must grant access via UserStore.roleId  never User.role (SO-16 golden
// rule)  and never a platform-scope role even if the invitation somehow
// carried one.

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

test("createInvitation: rejects a store invitation with a platform-scope role", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const platformRoleId = new mongoose.Types.ObjectId();

  const originals = {
    "../models/Invitation": mockModule("../models/Invitation", {
      findOne: async () => null,
      create: async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId(), save: async function () { return this; } }),
    }),
    "../models/User": mockModule("../models/User", { findOne: async () => null }),
    "../models/UserStore": mockModule("../models/UserStore", { findOne: async () => null }),
    "../models/Role": mockModule("../models/Role", {
      find: async () => [{ _id: platformRoleId, scope: "platform", storeId: null, name: "Platform Admin" }],
    }),
    "./AuditService": mockModule("./AuditService", { logAction: async () => {} }),
    "../lib/eventBus": mockModule("../lib/eventBus", { emitEvent: () => {} }),
  };

  const InvitationService = freshRequire("./InvitationService");

  await assert.rejects(
    () => InvitationService.createInvitation({
      email: "test@example.com",
      roleIds: [platformRoleId],
      storeId,
      sendEmail: false,
    }),
    (err) => err.name === "InvalidScope"
  );

  Object.entries(originals).forEach(([p, orig]) => restoreModule(p, orig));
});

test("createInvitation: rejects a store invitation with a role belonging to a different store", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const otherStoreId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();

  const originals = {
    "../models/Invitation": mockModule("../models/Invitation", {
      findOne: async () => null,
      create: async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId(), save: async function () { return this; } }),
    }),
    "../models/User": mockModule("../models/User", { findOne: async () => null }),
    "../models/UserStore": mockModule("../models/UserStore", { findOne: async () => null }),
    "../models/Role": mockModule("../models/Role", {
      find: async () => [{ _id: roleId, scope: "store", storeId: otherStoreId, name: "Manager" }],
    }),
    "./AuditService": mockModule("./AuditService", { logAction: async () => {} }),
    "../lib/eventBus": mockModule("../lib/eventBus", { emitEvent: () => {} }),
  };

  const InvitationService = freshRequire("./InvitationService");

  await assert.rejects(
    () => InvitationService.createInvitation({
      email: "test@example.com",
      roleIds: [roleId],
      storeId,
      sendEmail: false,
    }),
    (err) => err.name === "InvalidScope"
  );

  Object.entries(originals).forEach(([p, orig]) => restoreModule(p, orig));
});

test("createInvitation: a valid store role for THIS store is accepted", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  let createdDoc = null;

  const originals = {
    "../models/Invitation": mockModule("../models/Invitation", {
      findOne: async () => null,
      create: async (doc) => {
        createdDoc = doc;
        return { ...doc, _id: new mongoose.Types.ObjectId(), save: async function () { return this; } };
      },
    }),
    "../models/User": mockModule("../models/User", { findOne: async () => null }),
    "../models/UserStore": mockModule("../models/UserStore", { findOne: async () => null }),
    "../models/Role": mockModule("../models/Role", {
      find: async () => [{ _id: roleId, scope: "store", storeId, name: "Manager" }],
    }),
    "./AuditService": mockModule("./AuditService", { logAction: async () => {} }),
    "../lib/eventBus": mockModule("../lib/eventBus", { emitEvent: () => {} }),
  };

  const InvitationService = freshRequire("./InvitationService");

  const result = await InvitationService.createInvitation({
    email: "test@example.com",
    roleIds: [roleId],
    storeId,
    sendEmail: false,
  });

  assert.ok(result.invitation);
  assert.equal(String(createdDoc.storeId), String(storeId));
  assert.deepEqual(createdDoc.roleIds, [String(roleId)]);

  Object.entries(originals).forEach(([p, orig]) => restoreModule(p, orig));
});

test("acceptInvitation: a store invitation creates a UserStore, never a platform User.role", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const invitationDoc = {
    _id: new mongoose.Types.ObjectId(),
    email: "newstaff@example.com",
    firstName: "New",
    lastName: "Staff",
    status: "pending",
    tokenExpiresAt: new Date(Date.now() + 60_000),
    roleIds: [roleId],
    storeId,
    invitedBy: new mongoose.Types.ObjectId(),
    save: async function () { return this; },
  };

  let createdUserStore = null;
  let createdUser = null;

  const originals = {
    "../models/Invitation": mockModule("../models/Invitation", {
      findOne: () => ({ select: async () => invitationDoc }),
    }),
    "../models/User": mockModule("../models/User", {
      findOne: async () => null,
      create: async (doc) => {
        createdUser = { ...doc, _id: new mongoose.Types.ObjectId() };
        createdUser.toObject = ({ transform }) => {
          const ret = { ...createdUser };
          delete ret.toObject;
          return transform ? (transform(null, ret), ret) : ret;
        };
        return createdUser;
      },
    }),
    "../models/UserStore": mockModule("../models/UserStore", {
      findOne: async () => null,
      create: async (doc) => {
        createdUserStore = doc;
        return doc;
      },
    }),
    "../models/Role": mockModule("../models/Role", {
      find: async () => [{ _id: roleId, scope: "store", storeId }],
    }),
    "./AuditService": mockModule("./AuditService", { logAction: async () => {} }),
    "../lib/eventBus": mockModule("../lib/eventBus", { emitEvent: () => {} }),
  };

  const InvitationService = freshRequire("./InvitationService");

  const result = await InvitationService.acceptInvitation("raw-token-value", "a-real-password");

  assert.equal(createdUser.userType, "staff");
  assert.equal(createdUser.role, undefined, "a store invitation must never set User.role (platform role)");
  assert.ok(createdUserStore, "a UserStore must be created");
  assert.equal(String(createdUserStore.roleId), String(roleId));
  assert.equal(createdUserStore.status, "active");
  assert.equal(result.user.email, "newstaff@example.com");

  Object.entries(originals).forEach(([p, orig]) => restoreModule(p, orig));
});
