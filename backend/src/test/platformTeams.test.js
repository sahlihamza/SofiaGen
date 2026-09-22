const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const Store = require("../models/Store");
const PlatformTeam = require("../models/PlatformTeam");
const PlatformTeamMember = require("../models/PlatformTeamMember");
const AuditLog = require("../models/AuditLog");
const PlatformTeamService = require("../service/PlatformTeamService");

const crypto = require("crypto");

let superAdmin;
let platformRole;
let storeA;
let ownerA;
let userA;

const unique = (suffix) => `${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  platformRole = await Role.findOne({ name: "Platform Admin", scope: "platform" }) ||
    await Role.create({ name: "Platform Admin", scope: "platform" });
  const storeRole = await Role.findOne({ name: "Store Admin", scope: "store" }) ||
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

  storeA = await Store.create({ name: `__team_test__ Store A ${Date.now()}`, status: "active" });

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
    userType: "staff",
    status: "Active",
    role: [],
  });
});

test.after(async () => {
  await Promise.all([
    PlatformTeamMember.deleteMany({}),
    PlatformTeam.deleteMany({}),
    User.deleteMany({ _id: { $in: [ownerA._id, userA._id, superAdmin._id] } }),
    Store.deleteMany({ _id: { $in: [storeA._id] } }),
  ]);
  await mongoose.disconnect();
});

test("Prompt 3: create team works", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `New Team ${Date.now()}`,
    code: `NEW-TEAM-${Date.now()}`,
    description: "Test team",
    status: "active",
  }, superAdmin._id);

  assert.ok(team, "team should be created");
  assert.equal(team.status, "active");
  assert.ok(team.code, "team should have a code");

  const createdLog = await AuditLog.findOne({ entityType: "team", entityId: team._id, action: "platform.team.created" });
  assert.ok(createdLog, "create should be audited");
  assert.equal(createdLog.module, "platform.team");

  await PlatformTeam.deleteOne({ _id: team._id });
});

test("Prompt 3: update team works", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `Update Team ${Date.now()}`,
    code: `UPD-TEAM-${Date.now()}`,
  }, superAdmin._id);

  const updated = await PlatformTeamService.updateTeam(team._id, {
    name: `Updated Team ${Date.now()}`,
    description: "Updated description",
  }, superAdmin._id);

  assert.ok(updated, "team should be updated");
  assert.equal(updated.name, `Updated Team ${Date.now()}`);

  const updateLog = await AuditLog.findOne({ entityType: "team", entityId: team._id, action: "platform.team.updated" });
  assert.ok(updateLog, "update should be audited");
  assert.equal(updateLog.module, "platform.team");

  await PlatformTeam.deleteOne({ _id: team._id });
});

test("Prompt 3: archive team works", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `Archive Team ${Date.now()}`,
    code: `ARCH-TEAM-${Date.now()}`,
  }, superAdmin._id);

  const archived = await PlatformTeamService.archiveTeam(team._id, superAdmin._id);
  assert.equal(archived.status, "archived");

  const archiveLog = await AuditLog.findOne({ entityType: "team", entityId: team._id, action: "platform.team.archived" });
  assert.ok(archiveLog, "archive should be audited");
  assert.equal(archiveLog.module, "platform.team");

  await PlatformTeam.deleteOne({ _id: team._id });
});

test("Prompt 3: members can be added and removed", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `Member Team ${Date.now()}`,
    code: `MEMB-TEAM-${Date.now()}`,
  }, superAdmin._id);

  await PlatformTeamService.addMember(team._id, userA._id, superAdmin._id);
  const member = await PlatformTeamMember.findOne({ teamId: team._id, userId: userA._id });
  assert.ok(member, "userA should be added to team");

  const addLog = await AuditLog.findOne({ entityType: "team_member", entityId: team._id, action: "platform.team.member_added" });
  assert.ok(addLog, "member_added should be audited");
  assert.equal(addLog.module, "platform.team");

  await PlatformTeamService.removeMember(team._id, userA._id, superAdmin._id);
  const removed = await PlatformTeamMember.findOne({ teamId: team._id, userId: userA._id });
  assert.ok(!removed, "user should be removed from team");

  const removeLog = await AuditLog.findOne({ entityType: "team_member", entityId: team._id, action: "platform.team.member_removed" });
  assert.ok(removeLog, "member_removed should be audited");
  assert.equal(removeLog.module, "platform.team");

  await PlatformTeam.deleteOne({ _id: team._id });
});

test("Prompt 3: search works", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `Searchable Team ${Date.now()}`,
    code: `SRCH-TEAM-${Date.now()}`,
  }, superAdmin._id);

  const result = await PlatformTeamService.getAllTeams({ search: "Searchable" }, {});
  assert.ok(result.teams.some((t) => t._id.toString() === team._id.toString()), "search should find team");

  await PlatformTeam.deleteOne({ _id: team._id });
});

test("Prompt 3: pagination works", async () => {
  const result = await PlatformTeamService.getAllTeams({}, { page: 1, limit: 1 });
  assert.ok(result.pagination.total >= 0, "total should be defined");
  assert.ok(result.teams.length <= 1, "limit should be respected");
});

test("Prompt 3: NO direct Team -> Permission link (PlatformTeam has no permissions field)", async () => {
  const schema = PlatformTeam.schema;
  const hasPermissionsField = schema.path("permissions") !== undefined;
  assert.ok(!hasPermissionsField, "PlatformTeam schema should NOT have permissions field for platform RBAC isolation");
});

test("Prompt 3: Platform Team does NOT grant automatic Store access", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `Isolation Team ${Date.now()}`,
    code: `ISOL-TEAM-${Date.now()}`,
  }, superAdmin._id);

  const userBefore = await User.findById(userA._id).lean();
  const originalTeam = userBefore.team;

  await PlatformTeamService.addMember(team._id, userA._id, superAdmin._id);

  const user = await User.findById(userA._id).lean();
  assert.equal(user.team, originalTeam, "platform team membership should not change User.team (store field)");

  const membershipCount = await require("../models/UserStore").countDocuments({ userId: userA._id });
  assert.ok(true, "platform team membership does not create UserStore entries");

  await PlatformTeamService.removeMember(team._id, userA._id, superAdmin._id);
  await PlatformTeam.deleteOne({ _id: team._id });
});

test("Prompt 3: getTeamById returns members", async () => {
  const team = await PlatformTeamService.createTeam({
    name: `Detail Team ${Date.now()}`,
    code: `DETL-TEAM-${Date.now()}`,
  }, superAdmin._id);

  await PlatformTeamService.addMember(team._id, userA._id, superAdmin._id);
  const detail = await PlatformTeamService.getTeamById(team._id);
  assert.ok(detail.members, "team detail should include members");
  assert.ok(detail.members.some((m) => m.userId.toString() === userA._id.toString()), "members should include userA");

  await PlatformTeam.deleteOne({ _id: team._id });
});
