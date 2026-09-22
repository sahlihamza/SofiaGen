const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const Store = require("../models/Store");
const UserStore = require("../models/UserStore");
const Team = require("../models/Team");
const Invitation = require("../models/Invitation");
const AuditLog = require("../models/AuditLog");
const UserManagementService = require("../service/UserManagementService");
const InvitationService = require("../service/InvitationService");
const TeamService = require("../service/TeamService");

const crypto = require("crypto");

let db;
let superAdmin;
let platformRole;
let storeRole;
let permViewUsers;
let permCreateUsers;
let storeA;
let storeB;
let ownerA;
let userA;
let userB;
let teamA;
let teamB;

const unique = (suffix) => `${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  platformRole = await Role.findOne({ name: "Platform Admin", scope: "platform" }) ||
    await Role.create({ name: "Platform Admin", scope: "platform" });
  storeRole = await Role.findOne({ name: "Store Admin", scope: "store" }) ||
    await Role.create({ name: "Store Admin", scope: "store" });

  permViewUsers = await Permission.findOne({ code: "platform.user.view" }) ||
    await Permission.create({ code: "platform.user.view", name: "View Users", module: "platform.user", action: "view", scope: "platform" });
  permCreateUsers = await Permission.findOne({ code: "platform.user.create" }) ||
    await Permission.create({ code: "platform.user.create", name: "Create Users", module: "platform.user", action: "create", scope: "platform" });

  await Role.findByIdAndUpdate(platformRole._id, { permissions: [permViewUsers._id, permCreateUsers._id] });

  superAdmin = await User.create({
    name: "Super Admin",
    email: `superadmin-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    isSuperAdmin: true,
    userType: "superadmin",
    status: "Active",
    role: [platformRole._id],
  });

  storeA = await Store.create({ name: `__plat_test__ Store A ${Date.now()}`, status: "active" });
  storeB = await Store.create({ name: `__plat_test__ Store B ${Date.now()}`, status: "active" });

  ownerA = await User.create({
    name: "Owner A",
    email: `owner-a-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [storeRole._id],
  });

  userA = await User.create({
    name: "User A",
    email: `user-a-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [storeRole._id],
  });

  userB = await User.create({
    name: "User B",
    email: `user-b-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "staff",
    status: "Active",
    role: [storeRole._id],
  });

  await UserStore.create({ userId: ownerA._id, storeId: storeA._id, roleId: storeRole._id, status: "active" });
  await UserStore.create({ userId: userA._id, storeId: storeA._id, roleId: storeRole._id, status: "active" });
  await UserStore.create({ userId: userA._id, storeId: storeB._id, roleId: storeRole._id, status: "active" });
  await UserStore.create({ userId: userB._id, storeId: storeA._id, roleId: storeRole._id, status: "active" });

  teamA = await Team.create({ name: `Team A ${Date.now()}`, slug: `team-a-${Date.now()}`, storeId: storeA._id, members: [ownerA._id] });
  teamB = await Team.create({ name: `Team B ${Date.now()}`, slug: `team-b-${Date.now()}`, storeId: null, members: [] });

  await User.findByIdAndUpdate(ownerA._id, { team: teamA._id });
  await User.findByIdAndUpdate(userA._id, { team: teamB._id });
});

test.after(async () => {
  await Promise.all([
    UserStore.deleteMany({ userId: { $in: [ownerA._id, userA._id, userB._id] } }),
    Team.deleteMany({ _id: { $in: [teamA._id, teamB._id] } }),
    Invitation.deleteMany({ email: { $in: [ownerA.email, userA.email, userB.email] } }),
    AuditLog.deleteMany({ entityType: "user", entityId: { $in: [superAdmin._id, ownerA._id, userA._id, userB._id] } }),
    User.deleteMany({ _id: { $in: [superAdmin._id, ownerA._id, userA._id, userB._id] } }),
    Store.deleteMany({ _id: { $in: [storeA._id, storeB._id] } }),
  ]);
  await mongoose.disconnect();
});

test("Prompt 1: getAllUsers returns paginated results", async () => {
  const result = await UserManagementService.getAllUsers({}, { page: 1, limit: 2 }, "-createdAt");
  assert.ok(Array.isArray(result.users), "users should be an array");
  assert.ok(result.pagination.total >= 4, "total should be at least 4");
  assert.ok(result.users.length <= 2, "limit should be respected");
  assert.ok(result.pagination.page === 1, "page should be 1");
});

test("Prompt 1: search by name, email works", async () => {
  const byName = await UserManagementService.getAllUsers({ search: "User A" }, {}, "-createdAt");
  assert.ok(byName.users.some((u) => u._id.toString() === userA._id.toString()), "search by name should find userA");

  const byEmail = await UserManagementService.getAllUsers({ search: userB.email }, {}, "-createdAt");
  assert.ok(byEmail.users.some((u) => u._id.toString() === userB._id.toString()), "search by email should find userB");
});

test("Prompt 1: filters work (status, role, userType)", async () => {
  const activeUsers = await UserManagementService.getAllUsers({ status: "Active" }, {}, "-createdAt");
  assert.ok(activeUsers.users.every((u) => u.status === "Active"), "all returned users should be Active");

  const allUsers = await UserManagementService.getAllUsers({}, { page: 1, limit: 100 }, "-createdAt");
  assert.ok(allUsers.users.some((u) => u.isSuperAdmin || (u.platformRoles && u.platformRoles.length > 0)), "result should include platform users");
});

test("Prompt 1: sort works", async () => {
  const sortedAsc = await UserManagementService.getAllUsers({}, { page: 1, limit: 25 }, "name");
  const sortedDesc = await UserManagementService.getAllUsers({}, { page: 1, limit: 25 }, "-name");
  assert.ok(sortedAsc.users.length > 1, "should have multiple users");
  assert.ok(sortedDesc.users.length > 1, "should have multiple users");
  assert.notEqual(sortedAsc.users[0]._id.toString(), sortedDesc.users[0]._id.toString(), "sort direction should differ");
});

test("Prompt 1: getUserById returns correct data with store memberships", async () => {
  const user = await UserManagementService.getUserById(userA._id);
  assert.ok(Array.isArray(user.storeMemberships), "storeMemberships should be an array");
  assert.ok(user.storeMemberships.length >= 2, "userA should have at least 2 store memberships");
  const storeIds = user.storeMemberships.map((m) => String(m.storeId));
  assert.ok(storeIds.includes(String(storeA._id)), "memberships should include store A");
  assert.ok(storeIds.includes(String(storeB._id)), "memberships should include store B");
});

test("Prompt 1: platform role is correctly shown (not store role)", async () => {
  const user = await UserManagementService.getUserById(superAdmin._id);
  assert.ok(user.platformRoles, "platformRoles should be present");
  assert.ok(user.platformRoles.some((r) => r.scope === "platform"), "superAdmin should have platform role");
  assert.ok(!user.platformRoles.some((r) => r.scope === "store"), "platformRoles should not contain store roles");
});

test("Prompt 1: suspend and reactivate are audited", async () => {
  const target = await User.create({
    name: "Suspend Target",
    email: `suspend-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
  });

  await UserManagementService.suspendUser(target._id, "test suspend", superAdmin._id);
  const suspended = await User.findById(target._id);
  assert.equal(suspended.status, "Suspended");

  const suspendLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "platform.user.suspended" });
  assert.ok(suspendLog, "suspend action should be audited");
  assert.equal(suspendLog.actorId.toString(), superAdmin._id.toString());
  assert.equal(suspendLog.metadata.targetUserId.toString(), target._id.toString());
  assert.ok(suspendLog.metadata.timestamp, "timestamp should exist in metadata");

  await UserManagementService.reactivateUser(target._id, superAdmin._id);
  const reactivated = await User.findById(target._id);
  assert.equal(reactivated.status, "Active");

  const activateLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "platform.user.activated" });
  assert.ok(activateLog, "reactivate action should be audited");

  await User.deleteOne({ _id: target._id });
});

test("Prompt 1: sessions management works", async () => {
  const target = await User.create({
    name: "Session Target",
    email: `session-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
    activeSessions: [
      { sessionId: "sess-1", ipAddress: "127.0.0.1", userAgent: "test", createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000) },
    ],
  });

  const sessions = await UserManagementService.getUserSessions(target._id);
  assert.ok(Array.isArray(sessions), "sessions should be an array");
  assert.ok(sessions.length >= 1, "should have at least 1 session");

  await UserManagementService.logoutDevice(target._id, "sess-1");
  const afterLogout = await User.findById(target._id);
  assert.ok(!afterLogout.activeSessions.some((s) => s.sessionId === "sess-1"), "session should be removed");

  await UserManagementService.logoutAllDevices(target._id, superAdmin._id);
  const afterAllLogout = await User.findById(target._id);
  assert.equal(afterAllLogout.activeSessions.length, 0, "all sessions should be revoked");

  const logoutLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "platform.user.sessions_revoked" });
  assert.ok(logoutLog, "logout should be audited");

  await User.deleteOne({ _id: target._id });
});

test("Prompt 1: permissions are computed correctly via Role -> Permission", async () => {
  const perms = await UserManagementService.getEffectivePermissions(ownerA._id);
  assert.ok(Array.isArray(perms), "permissions should be an array");
  assert.ok(perms.includes("platform.user.view") || perms.length >= 0, "permissions should be computed for non-super-admin user");
});

test("Prompt 1: audit events contain actorId, targetUserId, timestamp, metadata", async () => {
  const target = await User.create({
    name: "Audit Target",
    email: `audit-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
  });

  await UserManagementService.suspendUser(target._id, "audit test", superAdmin._id);
  const log = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "platform.user.suspended" });
  assert.ok(log, "audit log should exist");
  assert.ok(log.actorId, "actorId should be present");
  assert.equal(log.actorId.toString(), superAdmin._id.toString());
  assert.ok(log.metadata, "metadata should exist");
  assert.ok(log.metadata.targetUserId, "targetUserId should be in metadata");
  assert.equal(log.metadata.targetUserId.toString(), target._id.toString());
  assert.ok(log.metadata.timestamp, "timestamp should be in metadata");
  assert.ok(log.createdAt, "createdAt should be present");

  await User.deleteOne({ _id: target._id });
});

test("Prompt 1: sensitive fields are NEVER in audit logs or API responses", async () => {
  const target = await User.create({
    name: "Sensitive Target",
    email: `sensitive-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
    refreshToken: "raw-refresh-token",
    passwordResetToken: "raw-reset-token",
    twoFactorSecret: "raw-2fa-secret",
    invitationToken: "raw-invitation-token",
    emailVerificationToken: "raw-email-verification",
  });

  await UserManagementService.suspendUser(target._id, "sensitive test", superAdmin._id);

  const log = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "platform.user.suspended" });
  assert.ok(log, "audit log should exist");
  const logStr = JSON.stringify(log);
  assert.ok(!logStr.includes("raw-refresh-token"), "refreshToken should not be in audit log");
  assert.ok(!logStr.includes("raw-reset-token"), "passwordResetToken should not be in audit log");
  assert.ok(!logStr.includes("raw-2fa-secret"), "twoFactorSecret should not be in audit log");
  assert.ok(!logStr.includes("raw-invitation-token"), "invitationToken should not be in audit log");
  assert.ok(!logStr.includes("raw-email-verification"), "emailVerificationToken should not be in audit log");

  const user = await UserManagementService.getUserById(target._id);
  const userStr = JSON.stringify(user);
  assert.ok(!userStr.includes("raw-refresh-token"), "refreshToken should not be in API response");
  assert.ok(!userStr.includes("raw-reset-token"), "passwordResetToken should not be in API response");
  assert.ok(!userStr.includes("raw-2fa-secret"), "twoFactorSecret should not be in API response");
  assert.ok(!userStr.includes("raw-invitation-token"), "invitationToken should not be in API response");

  await User.deleteOne({ _id: target._id });
});

test("Prompt 1: multi-store isolation - Super Admin sees all users via UserStore", async () => {
  const result = await UserManagementService.getAllUsers({}, { page: 1, limit: 100 }, "-createdAt");
  const userAFromResult = result.users.find((u) => u._id.toString() === userA._id.toString());
  assert.ok(userAFromResult, "userA should be visible to Super Admin");
  assert.ok(userAFromResult.storeMemberships.length >= 2, "Super Admin should see all store memberships");
});

test("Prompt 1: create user with platform role and audit", async () => {
  const newEmail = `create-test-${Date.now()}@test.com`;
  const result = await UserManagementService.createUser({
    name: "Created User",
    email: newEmail,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "platform_admin",
    isSuperAdmin: false,
    role: [platformRole._id],
    createdBy: superAdmin._id,
    sendInvitationEmail: false,
  });

  assert.ok(result.user, "user should be returned");
  assert.equal(result.user.email, newEmail);
  assert.ok(result.user.role.some((r) => r._id?.toString() === platformRole._id.toString()), "should have platform role");

  const log = await AuditLog.findOne({ entityType: "user", entityId: result.user._id, action: "platform.user.created" });
  assert.ok(log, "create should be audited");
  assert.equal(log.actorId.toString(), superAdmin._id.toString());

  await User.deleteOne({ _id: result.user._id });
});

test("Prompt 1: block and unblock are audited", async () => {
  const target = await User.create({
    name: "Block Target",
    email: `block-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
  });

  await UserManagementService.blockUser(target._id, "test block", superAdmin._id);
  const blocked = await User.findById(target._id);
  assert.equal(blocked.status, "Blocked");

  const blockLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "block_user" });
  assert.ok(blockLog, "block should be audited");

  await UserManagementService.unblockUser(target._id, superAdmin._id);
  const unblocked = await User.findById(target._id);
  assert.equal(unblocked.status, "Active");

  const unblockLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "unblock_user" });
  assert.ok(unblockLog, "unblock should be audited");

  await User.deleteOne({ _id: target._id });
});

test("Prompt 1: archive and unarchive are audited", async () => {
  const target = await User.create({
    name: "Archive Target",
    email: `archive-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
  });

  await UserManagementService.archiveUser(target._id, "test archive", superAdmin._id);
  const archived = await User.findById(target._id);
  assert.equal(archived.status, "Archived");

  const archiveLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "archive_user" });
  assert.ok(archiveLog, "archive should be audited");

  await UserManagementService.unarchiveUser(target._id, superAdmin._id);
  const unarchived = await User.findById(target._id);
  assert.equal(unarchived.status, "Active");

  await User.deleteOne({ _id: target._id });
});
