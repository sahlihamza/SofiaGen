const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Store = require("../models/Store");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const UserStore = require("../models/UserStore");
const Team = require("../models/Team");
const Invitation = require("../models/Invitation");
const AuditLog = require("../models/AuditLog");
const UserManagementService = require("../service/UserManagementService");
const InvitationService = require("../service/InvitationService");
const TeamService = require("../service/TeamService");
const PlatformStoreService = require("../service/PlatformStoreService");

const crypto = require("crypto");

let db;
let superAdmin;
let storeA;
let storeB;
let ownerA;
let userA;
let roleA;
let roleB;

const unique = (suffix) => `${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const adminRole = await Role.findOne({ name: "Super Admin", scope: "platform" }) || await Role.create({ name: "Super Admin", scope: "platform" });
  const platformUserRole = await Role.findOne({ name: "Platform User", scope: "platform" }) || await Role.create({ name: "Platform User", scope: "platform" });
  const storeOwnerRole = await Role.findOne({ name: "Store Owner", scope: "store" }) || await Role.create({ name: "Store Owner", scope: "store" });
  const managerRole = await Role.findOne({ name: "Manager", scope: "store" }) || await Role.create({ name: "Manager", scope: "store" });

  superAdmin = await User.create({
    name: "Super Admin",
    email: `superadmin-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    isSuperAdmin: true,
    userType: "superadmin",
    status: "Active",
    role: [adminRole._id],
  });

  storeA = await Store.create({ name: `__plat_test__ Store A ${Date.now()}`, status: "active" });
  storeB = await Store.create({ name: `__plat_test__ Store B ${Date.now()}`, status: "active" });

  ownerA = await User.create({
    name: "Owner A",
    email: `owner-a-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [storeOwnerRole._id],
  });

  userA = await User.create({
    name: "User A",
    email: `user-a-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [managerRole._id],
  });

  roleA = await Role.create({ name: "Role A", scope: "store", storeId: storeA._id });
  roleB = await Role.create({ name: "Role B", scope: "store", storeId: storeB._id });

  await UserStore.create({ userId: ownerA._id, storeId: storeA._id, roleId: storeOwnerRole._id, status: "active" });
  await UserStore.create({ userId: userA._id, storeId: storeA._id, roleId: managerRole._id, status: "active" });
  await UserStore.create({ userId: userA._id, storeId: storeB._id, roleId: managerRole._id, status: "active" });

  await Store.findByIdAndUpdate(storeA._id, { ownerId: ownerA._id });
  await Store.findByIdAndUpdate(storeB._id, { ownerId: userA._id });
});

test.after(async () => {
  await Promise.all([
    UserStore.deleteMany({ userId: { $in: [ownerA._id, userA._id] } }),
    Team.deleteMany({ storeId: { $in: [storeA._id, storeB._id] } }),
    Invitation.deleteMany({ email: { $in: [`invitee-${Date.now()}@test.com`] } }),
    AuditLog.deleteMany({ entityType: "user", entityId: { $in: [superAdmin._id, ownerA._id, userA._id] } }),
    User.deleteMany({ _id: { $in: [superAdmin._id, ownerA._id, userA._id] } }),
    Role.deleteMany({ _id: { $in: [roleA._id, roleB._id] } }),
    Store.deleteMany({ _id: { $in: [storeA._id, storeB._id] } }),
  ]);
  await mongoose.disconnect();
});

test("Platform User: getUserById returns store memberships", async () => {
  const user = await UserManagementService.getUserById(userA._id);
  assert.ok(Array.isArray(user.storeMemberships), "storeMemberships should be an array");
  assert.ok(user.storeMemberships.length >= 2, "userA should have at least 2 store memberships");
  const storeIds = user.storeMemberships.map((m) => String(m.storeId));
  assert.ok(storeIds.includes(String(storeA._id)), "memberships should include store A");
  assert.ok(storeIds.includes(String(storeB._id)), "memberships should include store B");
});

test("Platform User: suspend and reactivate are audited", async () => {
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

  const suspendLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "suspend" });
  assert.ok(suspendLog, "suspend action should be audited");

  await UserManagementService.reactivateUser(target._id, superAdmin._id);
  const reactivated = await User.findById(target._id);
  assert.equal(reactivated.status, "Active");

  await User.deleteOne({ _id: target._id });
});

test("Platform Invitation: create rejects duplicate existing user email", async () => {
  const existingEmail = ownerA.email;
  let threw = false;
  try {
    await InvitationService.createInvitation({
      email: existingEmail,
      firstName: "Duplicate",
      lastName: "Test",
      roleIds: [],
      storeId: null,
      invitedBy: superAdmin._id,
      sendEmail: false,
      ip: "127.0.0.1",
      userAgent: "test",
    });
  } catch (err) {
    threw = true;
    assert.equal(err.name, "EmailExists", "should throw EmailExists for duplicate email");
  }
  assert.ok(threw, "createInvitation should reject duplicate email");
});

test("Platform Invitation: create platform invitation with null storeId", async () => {
  const newEmail = `invitee-${Date.now()}@test.com`;
  const invite = await InvitationService.createInvitation({
    email: newEmail,
    firstName: "Invitee",
    lastName: "Test",
    roleIds: [],
    storeId: null,
    invitedBy: superAdmin._id,
    sendEmail: false,
    ip: "127.0.0.1",
    userAgent: "test",
  });
  assert.ok(invite.invitation, "invitation should be created");
  assert.equal(invite.invitation.storeId, null, "platform invitation must have null storeId");
  assert.equal(invite.invitation.status, "pending");
});

test("Platform Team: create and list teams for a store", async () => {
  const team = await TeamService.createTeam({
    name: `Test Team ${Date.now()}`,
    storeId: storeA._id,
    memberIds: [ownerA._id],
  }, superAdmin._id);

  assert.ok(team, "team should be created");
  assert.equal(team.storeId?.toString(), String(storeA._id));

  const listed = await TeamService.getAllTeams({ storeId: storeA._id }, {});
  assert.ok(listed.teams.some((t) => t._id.toString() === team._id.toString()), "team should appear in store list");
});

test("Store Owner: transfer ownership is logged and updates both Store and UserStore", async () => {
  const newOwner = await User.create({
    name: "New Owner",
    email: `new-owner-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
  });

  await UserStore.create({ userId: newOwner._id, storeId: storeA._id, roleId: roleA._id, status: "active" });

  const updated = await Store.findByIdAndUpdate(storeA._id, { ownerId: newOwner._id }, { new: true });
  assert.equal(String(updated.ownerId), String(newOwner._id), "store ownerId should be updated");

  const membership = await UserStore.findOne({ userId: newOwner._id, storeId: storeA._id });
  assert.ok(membership, "new owner should have a UserStore membership");

  const audit = await AuditLog.findOne({ entityType: "store", entityId: storeA._id, action: "change_owner" });
  assert.ok(audit, "ownership change should be audited");

  await User.deleteOne({ _id: newOwner._id });
});

test("Multi-store isolation: user store memberships are scoped correctly", async () => {
  const user = await UserManagementService.getUserById(userA._id);
  const membershipsForA = user.storeMemberships.filter((m) => String(m.storeId) === String(storeA._id));
  const membershipsForB = user.storeMemberships.filter((m) => String(m.storeId) === String(storeB._id));
  assert.ok(membershipsForA.length >= 1, "userA should have membership in store A");
  assert.ok(membershipsForB.length >= 1, "userA should have membership in store B");
});

test("Permission codes: canonical module.action format is enforced", async () => {
  const perms = await Permission.find({});
  for (const p of perms) {
    assert.ok(p.code && p.code.includes("."), `permission ${p.code} should use module.action format`);
  }
});

test("Audit: critical actions produce audit log entries", async () => {
  const target = await User.create({
    name: "Audit Target",
    email: `audit-target-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [],
  });

  await UserManagementService.suspendUser(target._id, "audit test", superAdmin._id);
  const log = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "suspend" });
  assert.ok(log, "suspend should be audited");
  assert.equal(log.actorType, "platform_admin");
  assert.equal(log.severity, "high");

  await User.deleteOne({ _id: target._id });
});
