const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const Store = require("../models/Store");
const Invitation = require("../models/Invitation");
const AuditLog = require("../models/AuditLog");
const InvitationService = require("../service/InvitationService");

const crypto = require("crypto");

let db;
let superAdmin;
let platformRole;
let storeA;
let storeRole;

const unique = (suffix) => `${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  platformRole = await Role.findOne({ name: "Platform Admin", scope: "platform" }) ||
    await Role.create({ name: "Platform Admin", scope: "platform" });
  storeRole = await Role.findOne({ name: "Store Admin", scope: "store" }) ||
    await Role.create({ name: "Store Admin", scope: "store" });

  superAdmin = await User.create({
    name: "Super Admin",
    email: `superadmin-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    isSuperAdmin: true,
    userType: "superadmin",
    status: "Active",
    role: [platformRole._id],
  });

  storeA = await Store.create({ name: `__inv_test__ Store A ${Date.now()}`, status: "active" });
});

test.after(async () => {
  await Promise.all([
    Invitation.deleteMany({ email: { $in: [superAdmin.email] } }),
    AuditLog.deleteMany({ entityType: "invitation" }),
    User.deleteMany({ _id: { $in: [superAdmin._id] } }),
    Store.deleteMany({ _id: { $in: [storeA._id] } }),
  ]);
  await mongoose.disconnect();
});

test("Prompt 2: create invitation generates secure random token", async () => {
  const email = `invite-${Date.now()}@test.com`;
  const result = await InvitationService.createInvitation({
    email,
    firstName: "Invitee",
    lastName: "Test",
    roleIds: [platformRole._id],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  assert.ok(result.invitation, "invitation should be created");
  assert.ok(result.invitationToken, "raw token should be returned");
  assert.ok(result.invitationToken.length === 64, "raw token should be 64 hex chars");
  assert.equal(result.invitation.storeId, null, "platform invitation must have null storeId");
  assert.equal(result.invitation.status, "pending");
});

test("Prompt 2: token is HASHED in DB (raw token does NOT exist in DB)", async () => {
  const email = `invite-hash-${Date.now()}@test.com`;
  const result = await InvitationService.createInvitation({
    email,
    firstName: "Hash",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  const rawToken = result.invitationToken;
  const found = await Invitation.findOne({ tokenHash: rawToken });
  assert.ok(!found, "raw token must not exist in DB as tokenHash");

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const foundByHash = await Invitation.findOne({ tokenHash });
  assert.ok(foundByHash, "hashed token should be findable");
  assert.equal(foundByHash.email, email);
});

test("Prompt 2: expiration is set", async () => {
  const email = `invite-exp-${Date.now()}@test.com`;
  const result = await InvitationService.createInvitation({
    email,
    firstName: "Exp",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  assert.ok(result.invitation.tokenExpiresAt, "tokenExpiresAt should be set");
  const expiresInMs = new Date(result.invitation.tokenExpiresAt).getTime() - Date.now();
  assert.ok(expiresInMs > 6 * 24 * 60 * 60 * 1000, "expiration should be ~7 days");
});

test("Prompt 2: resend invalidates old token and generates new one", async () => {
  const email = `invite-resend-${Date.now()}@test.com`;
  const createResult = await InvitationService.createInvitation({
    email,
    firstName: "Resend",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  const oldToken = createResult.invitationToken;
  const oldHash = crypto.createHash("sha256").update(oldToken).digest("hex");

  const resendResult = await InvitationService.resendInvitation(createResult.invitation._id, "127.0.0.1", "test", superAdmin._id);
  const newToken = resendResult.invitationToken;

  assert.ok(newToken !== oldToken, "new token should differ from old token");

  const oldFound = await Invitation.findOne({ tokenHash: oldHash });
  assert.ok(!oldFound, "old token hash should no longer be valid");

  const newHash = crypto.createHash("sha256").update(newToken).digest("hex");
  const newFound = await Invitation.findOne({ tokenHash: newHash });
  assert.ok(newFound, "new token hash should exist");
  assert.equal(newFound.sendCount, 2, "sendCount should be incremented");
});

test("Prompt 2: revoke prevents invitation usage", async () => {
  const email = `invite-revoke-${Date.now()}@test.com`;
  const createResult = await InvitationService.createInvitation({
    email,
    firstName: "Revoke",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  await InvitationService.revokeInvitation(createResult.invitation._id, superAdmin._id);
  const revoked = await Invitation.findById(createResult.invitation._id);
  assert.equal(revoked.status, "revoked");

  let threw = false;
  try {
    await InvitationService.acceptInvitation(createResult.invitationToken, "Password123!");
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidInvitationState");
  }
  assert.ok(threw, "accepting revoked invitation should fail");
});

test("Prompt 2: cannot accept expired invitation", async () => {
  const email = `invite-expired-${Date.now()}@test.com`;
  const invitation = await Invitation.create({
    email,
    firstName: "Expired",
    lastName: "Test",
    tokenHash: crypto.createHash("sha256").update("expired-token-123").digest("hex"),
    tokenExpiresAt: new Date(Date.now() - 86400000),
    status: "pending",
    roleIds: [],
    storeId: null,
  });

  let threw = false;
  try {
    await InvitationService.acceptInvitation("expired-token-123", "Password123!");
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidInvitationState");
  }
  assert.ok(threw, "accepting expired invitation should fail");

  const updated = await Invitation.findById(invitation._id);
  assert.equal(updated.status, "expired", "expired invitation should be marked as expired");
});

test("Prompt 2: cannot accept revoked invitation", async () => {
  const email = `invite-revoked-accept-${Date.now()}@test.com`;
  const invitation = await Invitation.create({
    email,
    firstName: "Revoked",
    lastName: "Test",
    tokenHash: crypto.createHash("sha256").update("revoked-token-456").digest("hex"),
    tokenExpiresAt: new Date(Date.now() + 86400000),
    status: "revoked",
    roleIds: [],
    storeId: null,
  });

  let threw = false;
  try {
    await InvitationService.acceptInvitation("revoked-token-456", "Password123!");
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidInvitationState");
  }
  assert.ok(threw, "accepting revoked invitation should fail");
});

test("Prompt 2: platform invitation cannot target a store (storeId must be null)", async () => {
  let threw = false;
  try {
    await InvitationService.createInvitation({
      email: `invite-store-${Date.now()}@test.com`,
      firstName: "Store",
      lastName: "Invitee",
      roleIds: [],
      storeId: storeA._id,
      invitedBy: superAdmin._id,
      sendEmail: false,
      ip: "127.0.0.1",
      userAgent: "test",
      platformOnly: true,
    });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidScope");
  }
  assert.ok(threw, "platform invitation with storeId should throw InvalidScope");
});

test("Prompt 2: platform invitation cannot assign Super Admin role without explicit mechanism", async () => {
  const superAdminRole = await Role.findOne({ name: "Super Admin", scope: "platform" }) ||
    await Role.create({ name: "Super Admin", scope: "platform" });

  let threw = false;
  try {
    await InvitationService.createInvitation({
      email: `invite-super-${Date.now()}@test.com`,
      firstName: "Super",
      lastName: "Invitee",
      roleIds: [superAdminRole._id],
      storeId: null,
      invitedBy: superAdmin._id,
      sendEmail: false,
      ip: "127.0.0.1",
      userAgent: "test",
      platformOnly: true,
    });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidScope");
  }
  assert.ok(threw, "platform invitation with Super Admin role should throw InvalidScope");
});

test("Prompt 2: audit events are created for lifecycle actions", async () => {
  const email = `invite-audit-${Date.now()}@test.com`;
  const createResult = await InvitationService.createInvitation({
    email,
    firstName: "Audit",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  const createdLog = await AuditLog.findOne({ entityType: "invitation", entityId: createResult.invitation._id, action: "platform.invitation.created" });
  assert.ok(createdLog, "created audit event should exist");
  assert.equal(createdLog.module, "platform.invitation");
  assert.equal(createdLog.actorId.toString(), superAdmin._id.toString());

  await InvitationService.revokeInvitation(createResult.invitation._id, superAdmin._id);
  const revokedLog = await AuditLog.findOne({ entityType: "invitation", entityId: createResult.invitation._id, action: "platform.invitation.revoked" });
  assert.ok(revokedLog, "revoked audit event should exist");
});

test("Prompt 2: no duplicate User on acceptance (reuse existing user if email exists)", async () => {
  const existingUser = await User.create({
    name: "Existing Invitee",
    email: `existing-invitee-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "platform_admin",
    status: "Active",
    role: [platformRole._id],
  });

  const invitation = await Invitation.create({
    email: existingUser.email,
    firstName: "Existing",
    lastName: "Invitee",
    tokenHash: crypto.createHash("sha256").update("reuse-token-789").digest("hex"),
    tokenExpiresAt: new Date(Date.now() + 86400000),
    status: "pending",
    roleIds: [],
    storeId: null,
  });

  const result = await InvitationService.acceptInvitation("reuse-token-789", "NewPass123!");
  assert.ok(result.user, "user should be returned");
  assert.equal(result.user._id.toString(), existingUser._id.toString(), "should reuse existing user");

  const usersCount = await User.countDocuments({ email: existingUser.email });
  assert.equal(usersCount, 1, "should not create duplicate user");

  const acceptedLog = await AuditLog.findOne({ entityType: "invitation", entityId: invitation._id, action: "platform.invitation.accepted" });
  assert.ok(acceptedLog, "accepted audit event should exist");

  await User.deleteOne({ _id: existingUser._id });
});

test("Prompt 2: expire invitations marks pending invitations as expired", async () => {
  const invitation = await Invitation.create({
    email: `expire-batch-${Date.now()}@test.com`,
    firstName: "Batch",
    lastName: "Expire",
    tokenHash: crypto.createHash("sha256").update("batch-expire-token").digest("hex"),
    tokenExpiresAt: new Date(Date.now() - 86400000),
    status: "pending",
    roleIds: [],
    storeId: null,
  });

  await InvitationService.expireInvitations();
  const updated = await Invitation.findById(invitation._id);
  assert.equal(updated.status, "expired", "expired invitation should be marked as expired");

  const expiredLog = await AuditLog.findOne({ entityType: "invitation", action: "platform.invitation.expired" });
  assert.ok(expiredLog, "expired audit event should exist");
});

test("Prompt 2: sensitive fields are not exposed in invitation responses", async () => {
  const result = await InvitationService.createInvitation({
    email: `invite-sensitive-${Date.now()}@test.com`,
    firstName: "Sensitive",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  const responseStr = JSON.stringify(result.invitation);
  assert.ok(!responseStr.includes("tokenHash"), "tokenHash should not be in API response");
});

test("Prompt 2: email is sent when sendEmail is true (mocked)", async () => {
  const originalMailer = require.cache[require.resolve("../utils/mailer")];
  let sentTo = null;
  const mockMailer = {
    sendInvitationEmail: async (to, name, url) => {
      sentTo = { to, name, url };
    },
  };
  require.cache[require.resolve("../utils/mailer")] = {
    id: require.resolve("../utils/mailer"),
    filename: require.resolve("../utils/mailer"),
    loaded: true,
    exports: mockMailer,
  };

  try {
    const email = `invite-email-${Date.now()}@test.com`;
    const result = await InvitationService.createInvitation({
      email,
      firstName: "Email",
      lastName: "Test",
      roleIds: [],
      storeId: null,
      invitedBy: superAdmin._id,
      sendEmail: true,
      ip: "127.0.0.1",
      userAgent: "test",
      platformOnly: true,
    });

    assert.ok(sentTo, "sendInvitationEmail should have been called");
    assert.equal(sentTo.to, email);
    assert.ok(sentTo.url.includes(result.invitationToken), "invitation URL should contain the token");
  } finally {
    if (originalMailer) {
      require.cache[require.resolve("../utils/mailer")] = originalMailer;
    } else {
      delete require.cache[require.resolve("../utils/mailer")];
    }
  }
});

test("Prompt 2: cannot accept invitation with wrong password", async () => {
  const email = `invite-wrongpass-${Date.now()}@test.com`;
  const result = await InvitationService.createInvitation({
    email,
    firstName: "Wrong",
    lastName: "Pass",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  let threw = false;
  try {
    await InvitationService.acceptInvitation(result.invitationToken, "short");
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidPassword");
  }
  assert.ok(threw, "accepting with short password should fail");
});

test("Prompt 2: existing pending invitation for same email is rejected", async () => {
  const email = `invite-duplicate-${Date.now()}@test.com`;
  await InvitationService.createInvitation({
    email,
    firstName: "First",
    lastName: "Invite",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
    platformOnly: true,
  });

  let threw = false;
  try {
    await InvitationService.createInvitation({
      email,
      firstName: "Second",
      lastName: "Invite",
      roleIds: [],
      storeId: null,
      invitedBy: superAdmin._id,
      sendEmail: false,
      ip: "127.0.0.1",
      userAgent: "test",
      platformOnly: true,
    });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvitationExists");
  }
  assert.ok(threw, "duplicate pending invitation should be rejected");
});
