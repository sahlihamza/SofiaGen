require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Store = require("../src/models/Store");
const UserStore = require("../src/models/UserStore");
const Team = require("../src/models/Team");
const Invitation = require("../src/models/Invitation");
const AuditLog = require("../src/models/AuditLog");
const SecurityLog = require("../src/models/SecurityLog");
const PlatformStoreService = require("../src/service/PlatformStoreService");
const InvitationService = require("../src/service/InvitationService");
const TeamService = require("../src/service/TeamService");
const UserManagementService = require("../src/service/UserManagementService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_platform_test";

let testRoleId;
let testStoreId;
let testUserId;
let adminActorId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  await User.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await UserStore.deleteMany({});
  await Team.deleteMany({});
  await Invitation.deleteMany({});
  await AuditLog.deleteMany({});
  await SecurityLog.deleteMany({});

  const role = await Role.create({
    name: "TestStoreRole",
    slug: "test-store-role",
    scope: "store",
    isSystem: false,
  });
  testRoleId = role._id;

  const store = await Store.create({
    name: "Test Store",
    slug: "test-store",
    status: "active",
  });
  testStoreId = store._id;

  const user = await User.create({
    name: "Test User",
    email: "testuser@example.com",
    password: "$2a$10$somefakehashplaceholder",
    userType: "store_admin",
    status: "Active",
    isSuperAdmin: false,
    emailVerified: true,
    provider: "local",
  });
  testUserId = user._id;

  await UserStore.create({
    userId: testUserId,
    storeId: testStoreId,
    roleId: testRoleId,
    status: "active",
  });

  adminActorId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await User.deleteMany({});
  await Role.deleteMany({});
  await Store.deleteMany({});
  await UserStore.deleteMany({});
  await Team.deleteMany({});
  await Invitation.deleteMany({});
  await AuditLog.deleteMany({});
  await SecurityLog.deleteMany({});
  await mongoose.disconnect();
});

describe("Platform Store Service", () => {
  test("listStores returns paginated stores", async () => {
    const result = await PlatformStoreService.listStores({}, { page: 1, limit: 10 });
    expect(result.stores).toBeDefined();
    expect(Array.isArray(result.stores)).toBe(true);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test("getStoreDetails returns store with owner and staff", async () => {
    const details = await PlatformStoreService.getStoreDetails(testStoreId);
    expect(details).toBeDefined();
    expect(details.owner).toBeDefined();
    expect(details.staff).toBeDefined();
    expect(details.teams).toBeDefined();
  });

  test("updateStore updates allowed fields and audits", async () => {
    const updated = await PlatformStoreService.updateStore(testStoreId, { name: "Updated Store Name" }, adminActorId);
    expect(updated.name).toBe("Updated Store Name");

    const audit = await AuditLog.findOne({
      module: "Platform Store",
      action: "update",
      entityId: testStoreId,
    });
    expect(audit).toBeDefined();
    expect(audit.changes.name).toBe("Updated Store Name");
  });

  test("transferStoreOwnership validates new owner and updates store", async () => {
    const newOwner = await User.create({
      name: "New Owner",
      email: "newowner@example.com",
      password: "$2a$10$somefakehashplaceholder",
      userType: "store_admin",
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "local",
    });

    const result = await PlatformStoreService.transferStoreOwnership(testStoreId, newOwner._id, adminActorId);
    expect(result.oldOwnerId).toBeDefined();
    expect(result.newOwnerId.toString()).toBe(newOwner._id.toString());

    const store = await Store.findById(testStoreId);
    expect(store.ownerId.toString()).toBe(newOwner._id.toString());

    const membership = await UserStore.findOne({ userId: newOwner._id, storeId: testStoreId });
    expect(membership).toBeDefined();
    expect(membership.status).toBe("active");

    const audit = await AuditLog.findOne({
      module: "Platform Store",
      action: "owner_changed",
      entityId: testStoreId,
    });
    expect(audit).toBeDefined();
    expect(audit.severity).toBe("high");
  });

  test("transferStoreOwnership rejects invalid owner status", async () => {
    const suspendedUser = await User.create({
      name: "Suspended User",
      email: "suspended@example.com",
      password: "$2a$10$somefakehashplaceholder",
      userType: "store_admin",
      status: "Suspended",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "local",
    });

    await expect(
      PlatformStoreService.transferStoreOwnership(testStoreId, suspendedUser._id, adminActorId)
    ).rejects.toThrow("New owner has an invalid account status");
  });
});

describe("Invitation Service", () => {
  test("createInvitation prevents duplicates", async () => {
    const result = await InvitationService.createInvitation({
      email: "invite1@example.com",
      roleIds: [testRoleId],
      invitedBy: adminActorId,
      sendEmail: false,
    });
    expect(result.invitation).toBeDefined();
    expect(result.invitationToken).toBeDefined();

    await expect(
      InvitationService.createInvitation({
        email: "invite1@example.com",
        roleIds: [testRoleId],
        invitedBy: adminActorId,
        sendEmail: false,
      })
    ).rejects.toThrow("Une invitation en attente existe déjà pour cet email");
  });

  test("revokeInvitation sets status to revoked", async () => {
    const invitation = await Invitation.create({
      email: "revokeme@example.com",
      invitationToken: "token123",
      invitationTokenHash: "hash123",
      tokenExpiresAt: new Date(Date.now() + 86400000),
      status: "pending",
      roleIds: [testRoleId],
      invitedBy: adminActorId,
    });

    const revoked = await InvitationService.revokeInvitation(invitation._id);
    expect(revoked.status).toBe("revoked");

    const audit = await AuditLog.findOne({
      module: "Platform User",
      action: "invitation_revoked",
      entityId: invitation._id,
    });
    expect(audit).toBeDefined();
  });

  test("cancelInvitation sets status to cancelled", async () => {
    const invitation = await Invitation.create({
      email: "cancelme@example.com",
      invitationToken: "token456",
      invitationTokenHash: "hash456",
      tokenExpiresAt: new Date(Date.now() + 86400000),
      status: "pending",
      roleIds: [testRoleId],
      invitedBy: adminActorId,
    });

    const cancelled = await InvitationService.cancelInvitation(invitation._id);
    expect(cancelled.status).toBe("cancelled");
  });
});

describe("Team Service", () => {
  test("createTeam with storeId creates team", async () => {
    const team = await TeamService.createTeam({
      name: "Test Team",
      storeId: testStoreId,
      memberIds: [testUserId],
    }, adminActorId);

    expect(team).toBeDefined();
    expect(team.storeId.toString()).toBe(testStoreId.toString());
    expect(team.memberCount).toBe(1);
  });

  test("getAllTeams returns teams with store context", async () => {
    const result = await TeamService.getAllTeams({ includeStoreContext: true }, { page: 1, limit: 10 });
    expect(result.teams).toBeDefined();
    expect(result.teams.length).toBeGreaterThanOrEqual(1);
    expect(result.teams[0].storeId).toBeDefined();
  });
});

describe("User Management Service", () => {
  test("getUserById includes storeMemberships", async () => {
    const user = await UserManagementService.getUserById(testUserId);
    expect(user.storeMemberships).toBeDefined();
    expect(Array.isArray(user.storeMemberships)).toBe(true);
    expect(user.storeMemberships.length).toBeGreaterThanOrEqual(1);
    expect(user.storeMemberships[0].storeId).toBeDefined();
    expect(user.storeMemberships[0].roleId).toBeDefined();
    expect(user.storeMemberships[0].status).toBe("active");
  });

  test("getAllUsers supports date-range filters", async () => {
    const result = await UserManagementService.getAllUsers(
      { dateFrom: "2000-01-01", dateTo: "2099-12-31" },
      { page: 1, limit: 10 }
    );
    expect(result.users).toBeDefined();
    expect(result.pagination).toBeDefined();
  });
});

describe("Security and Audit", () => {
  test("SecurityLog is append-only", async () => {
    const log = await SecurityLog.create({
      event: "session_revoked",
      userId: testUserId,
      email: "testuser@example.com",
      ip: "127.0.0.1",
      userAgent: "test",
      requestId: "req123",
      severity: "medium",
      metadata: {},
    });

    let threw = false;
    try {
      await SecurityLog.findByIdAndUpdate(log._id, { event: "login" });
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
