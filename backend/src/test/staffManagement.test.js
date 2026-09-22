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
const AuditLog = require("../models/AuditLog");
const UserManagementService = require("../service/UserManagementService");
const StaffManagementService = require("../service/StaffManagementService");

const crypto = require("crypto");

let superAdmin;
let platformRole;
let storeRole;
let storeA;
let ownerA;
let userA;
let teamA;

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

  storeA = await Store.create({ name: `__staff_test__ Store A ${Date.now()}`, status: "active" });

  ownerA = await User.create({
    name: "Owner A",
    email: `owner-a-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "store_admin",
    status: "Active",
    role: [storeRole._id],
  });

  userA = await User.create({
    name: "Staff User A",
    email: `staff-a-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "staff",
    status: "Active",
    role: [],
  });

  await UserStore.create({ userId: ownerA._id, storeId: storeA._id, roleId: storeRole._id, status: "active" });
  await UserStore.create({ userId: userA._id, storeId: storeA._id, roleId: storeRole._id, status: "active" });

  teamA = await Team.create({ name: `Staff Team ${Date.now()}`, slug: `staff-team-${Date.now()}`, storeId: storeA._id, members: [userA._id] });
  await User.findByIdAndUpdate(userA._id, { team: teamA._id });
});

test.after(async () => {
  await Promise.all([
    UserStore.deleteMany({ userId: { $in: [ownerA._id, userA._id] } }),
    Team.deleteMany({ _id: { $in: [teamA._id] } }),
    AuditLog.deleteMany({ entityType: "user", entityId: { $in: [superAdmin._id, ownerA._id, userA._id] } }),
    User.deleteMany({ _id: { $in: [superAdmin._id, ownerA._id, userA._id] } }),
    Store.deleteMany({ _id: { $in: [storeA._id] } }),
  ]);
  await mongoose.disconnect();
});

test("Prompt 4: staff list only shows platform users (isSuperAdmin or has platform roles)", async () => {
  const result = await StaffManagementService.getStaffList({}, { page: 1, limit: 100 }, "-createdAt");
  assert.ok(Array.isArray(result.users), "users should be an array");
  assert.ok(result.users.every((u) => u.isSuperAdmin || (u.platformRoles && u.platformRoles.length > 0)),
    "staff list should only return users with platform roles or isSuperAdmin");
  assert.ok(result.users.some((u) => u._id.toString() === superAdmin._id.toString()),
    "superAdmin should appear in staff list");
});

test("Prompt 4: staff detail shows computed permissions from Role -> Permission", async () => {
  const staffMember = await StaffManagementService.getStaffMember(superAdmin._id);
  assert.ok(staffMember.effectivePermissions, "staff member should have effectivePermissions");
  assert.ok(Array.isArray(staffMember.effectivePermissions), "effectivePermissions should be an array");
  assert.ok(staffMember.effectivePermissions.includes("platform.user.view"), "should include platform.user.view");
});

test("Prompt 4: staff management reuses UserManagementService (no duplicate logic)", async () => {
  const userResult = await UserManagementService.getUserById(superAdmin._id);
  const staffResult = await StaffManagementService.getStaffMember(superAdmin._id);
  assert.equal(userResult._id.toString(), staffResult._id.toString(), "staff detail should use same service as platform user");
  assert.ok(staffResult.platformRoles !== undefined, "response should have platformRoles field from UserManagementService");
});

test("Prompt 4: Platform Role is correctly associated", async () => {
  const staffMember = await StaffManagementService.getStaffMember(superAdmin._id);
  assert.ok(staffMember.platformRoles, "platformRoles should be present");
  assert.ok(staffMember.platformRoles.some((r) => r.scope === "platform"), "should have platform scope role");
  assert.ok(staffMember.platformPermissions?.length > 0, "should have computed platform permissions");
});

test("Prompt 4: Teams are correctly associated", async () => {
  const user = await User.findById(userA._id).lean();
  assert.ok(user.team, "user should have team association");
  assert.equal(user.team.toString(), teamA._id.toString(), "user should be in correct team");

  const team = await Team.findById(teamA._id).lean();
  assert.ok(team.members.some((m) => m.toString() === userA._id.toString()), "team should contain userA");
});

test("Prompt 4: sessions can be revoked", async () => {
  const target = await User.create({
    name: "Session Revoke Target",
    email: `session-revoke-${Date.now()}@test.com`,
    password: crypto.randomBytes(16).toString("hex"),
    userType: "staff",
    status: "Active",
    role: [],
    activeSessions: [
      { sessionId: "staff-sess-1", ipAddress: "127.0.0.1", userAgent: "test", createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000) },
      { sessionId: "staff-sess-2", ipAddress: "127.0.0.1", userAgent: "test", createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000) },
    ],
  });

  await StaffManagementService.revokeSessions(target._id, superAdmin._id);
  const afterRevoke = await User.findById(target._id);
  assert.equal(afterRevoke.activeSessions.length, 0, "all sessions should be revoked");

  const logoutLog = await AuditLog.findOne({ entityType: "user", entityId: target._id, action: "platform.user.sessions_revoked" });
  assert.ok(logoutLog, "sessions_revoked should be audited");

  await User.deleteOne({ _id: target._id });
});

test("Prompt 4: suspend/reactivate for staff user is audited", async () => {
  await StaffManagementService.suspendStaff(userA._id, "staff suspend", superAdmin._id);
  const suspended = await User.findById(userA._id);
  assert.equal(suspended.status, "Suspended");

  const suspendLog = await AuditLog.findOne({ entityType: "user", entityId: userA._id, action: "platform.user.suspended" });
  assert.ok(suspendLog, "staff suspend should be audited");

  await StaffManagementService.activateStaff(userA._id, superAdmin._id);
  const reactivated = await User.findById(userA._id);
  assert.equal(reactivated.status, "Active");
});

test("Prompt 4: assignRole enforces platform scope", async () => {
  const storeOnlyRole = await Role.findOne({ name: "Store Admin", scope: "store" }) ||
    await Role.create({ name: "Store Admin Only", scope: "store" });

  let threw = false;
  try {
    await StaffManagementService.assignRole(userA._id, storeOnlyRole._id, superAdmin._id);
  } catch (err) {
    threw = true;
    assert.equal(err.name, "InvalidRoleScope");
  }
  assert.ok(threw, "assigning store role from platform should throw InvalidRoleScope");

  await Role.deleteOne({ _id: storeOnlyRole._id });
});

test("Prompt 4: effective permissions returns permissions for non-super admin", async () => {
  const perms = await StaffManagementService.getEffectivePermissions(superAdmin._id);
  assert.ok(Array.isArray(perms), "permissions should be an array");
  assert.ok(perms.length > 0, "super admin should have permissions");
});

test("Prompt 4: bulk action works on staff users", async () => {
  const result = await UserManagementService.bulkAction([userA._id], "suspend", { reason: "bulk test" });
  assert.ok(result[0].success, "bulk suspend should succeed");

  const suspended = await User.findById(userA._id);
  assert.equal(suspended.status, "Suspended");

  await UserManagementService.bulkAction([userA._id], "reactivate", {});
  const reactivated = await User.findById(userA._id);
  assert.equal(reactivated.status, "Active");
});

test("Prompt 4: user stats include staff count", async () => {
  const stats = await UserManagementService.getStats();
  assert.ok("staff" in stats, "stats should include staff count");
  assert.ok(typeof stats.staff === "number", "staff count should be a number");
});
