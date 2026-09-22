require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Store = require("../src/models/Store");
const AuditLog = require("../src/models/AuditLog");
const UserStore = require("../src/models/UserStore");
const UserManagementService = require("../src/service/UserManagementService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

let testRoleId;
let adminActorId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  await User.deleteMany({});
  await Role.deleteMany({});
  await AuditLog.deleteMany({});

  const role = await Role.create({
    name: "TestAdmin",
    label: "Test Admin",
    slug: "test-admin",
    scope: "store",
    isPredefined: true,
  });
  testRoleId = role._id;
  adminActorId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await User.deleteMany({});
  await Role.deleteMany({});
  await AuditLog.deleteMany({});
  await mongoose.disconnect();
});

describe("UserManagementService - createUser", () => {
  beforeEach(async () => {
    await User.deleteMany({ email: /test\.example\.com$/ });
  });

  test("should create a user with invitation token and URL", async () => {
    const result = await UserManagementService.createUser({
      email: "create_test@example.com",
      firstName: "John",
      lastName: "Doe",
      password: null,
      userType: "store_admin",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("create_test@example.com");
    expect(result.user.firstName).toBe("John");
    expect(result.user.lastName).toBe("Doe");
    expect(result.user.displayName).toBe("John Doe");
    expect(result.invitationToken).toBeDefined();
    expect(result.invitationUrl).toContain("invite?token=");
  });

  test("should throw EmailExists when email is already used", async () => {
    await User.create({
      name: "Dup User",
      email: "duplicate@example.com",
      password: "$2a$10$somefakehashplaceholder",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
    });

    await expect(
      UserManagementService.createUser({
        email: "duplicate@example.com",
        firstName: "Jane",
        lastName: "Dup",
        password: null,
        userType: "store_admin",
      })
    ).rejects.toThrow("Cet email est déjà utilisé");
  });

  test("should set emailVerified when password is provided", async () => {
    const result = await UserManagementService.createUser({
      email: "password_test@example.com",
      firstName: "PW",
      lastName: "Test",
      password: "Password123!",
      userType: "store_admin",
    });

    expect(result.user).toBeDefined();
    expect(result.invitationToken).toBeNull();
    expect(result.invitationUrl).toBeNull();

    const dbUser = await User.findById(result.user._id);
    expect(dbUser.emailVerified).toBe(true);
  });
});

describe("UserManagementService - suspendUser", () => {
  let testUserId;

  beforeEach(async () => {
    const user = await User.create({
      name: "Suspend Test",
      email: "suspend_test@example.com",
      password: "$2a$10$fakehashtestplaceholder",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
    });
    testUserId = user._id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: "suspend_test@example.com" });
  });

  test("should suspend a user and set status to Suspended", async () => {
    const user = await UserManagementService.suspendUser(
      testUserId,
      "Policy violation",
      adminActorId
    );

    expect(user.status).toBe("Suspended");
    expect(user.suspendedAt).toBeInstanceOf(Date);
    expect(user.suspendedReason).toBe("Policy violation");
  });

  test("should throw NotFound for non-existent user", async () => {
    await expect(
      UserManagementService.suspendUser(
        new mongoose.Types.ObjectId(),
        "reason",
        null
      )
    ).rejects.toThrow("Utilisateur introuvable");
  });
});

describe("UserManagementService - reset2FA", () => {
  let testUserId;

  beforeEach(async () => {
    const user = await User.create({
      name: "2FA Test",
      email: "2fa_test@example.com",
      password: "$2a$10$fakehash2fatest",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
      twoFactorEnabled: true,
      twoFactorSecret: "secret123",
      twoFactorBackupCodes: ["CODE1", "CODE2"],
    });
    testUserId = user._id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: "2fa_test@example.com" });
  });

  test("should reset 2FA and generate backup codes", async () => {
    const result = await UserManagementService.reset2FA(testUserId);

    expect(result.backupCodes).toBeDefined();
    expect(result.backupCodes).toHaveLength(8);

    const user = await User.findById(testUserId);
    expect(user.twoFactorEnabled).toBe(false);
  });

  test("should log audit entry for 2FA reset", async () => {
    await UserManagementService.reset2FA(testUserId);

    const log = await AuditLog.findOne({
      entityType: "user",
      entityId: testUserId,
      action: "reset_2fa",
    });
    expect(log).toBeDefined();
    expect(log.status).toBe("success");
    expect(log.severity).toBe("high");
  });
});

describe("UserManagementService - getUserActivity", () => {
  let testUserId;

  beforeEach(async () => {
    await AuditLog.deleteMany({});
    const user = await User.create({
      name: "Activity Test",
      email: "activity_test@example.com",
      password: "$2a$10$fakehashactivity",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
    });
    testUserId = user._id;

    await AuditLog.create({
      actorType: "platform_admin",
      actorId: adminActorId,
      module: "Platform User",
      action: "create",
      entityType: "user",
      entityId: testUserId,
      status: "success",
      severity: "medium",
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: "activity_test@example.com" });
    await AuditLog.deleteMany({});
  });

  test("should return audit logs for the user", async () => {
    const logs = await UserManagementService.getUserActivity(testUserId, 50);

    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].entityType).toBe("user");
    expect(logs[0].action).toBe("create");
  });
});

describe("UserManagementService - getUserSessions", () => {
  let testUserId;

  beforeEach(async () => {
    const user = await User.create({
      name: "Session Test",
      email: "session_test@example.com",
      password: "$2a$10$fakehashsessions",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
      activeSessions: [
        {
          sessionId: "session_abc",
          ipAddress: "192.168.1.1",
          deviceName: "Chrome on Mac",
          createdAt: new Date(),
          lastActivity: new Date(),
        },
      ],
    });
    testUserId = user._id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: "session_test@example.com" });
  });

  test("should return active sessions for the user", async () => {
    const sessions = await UserManagementService.getUserSessions(testUserId);

    expect(sessions).toBeDefined();
    expect(sessions.length).toBe(1);
    expect(sessions[0].sessionId).toBe("session_abc");
    expect(sessions[0].ipAddress).toBe("192.168.1.1");
    expect(sessions[0].deviceName).toBe("Chrome on Mac");
  });

  test("should return empty array for user with no sessions", async () => {
    const user = await User.create({
      name: "NoSession",
      email: "nosession_test@example.com",
      password: "$2a$10$fakehashnosession",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
    });

    const sessions = await UserManagementService.getUserSessions(user._id);
    expect(sessions.length).toBe(0);

    await User.deleteOne({ _id: user._id });
  });
});

describe("UserManagementService - logoutDevice", () => {
  let testUserId;

  beforeEach(async () => {
    await AuditLog.deleteMany({});
    const user = await User.create({
      name: "Logout Device Test",
      email: "logout_test@example.com",
      password: "$2a$10$fakehashlogout",
      userType: "store_admin",
      role: testRoleId,
      status: "Active",
      isSuperAdmin: false,
      emailVerified: true,
      provider: "invitation",
      activeSessions: [
        {
          sessionId: "session_to_remove",
          ipAddress: "10.0.0.1",
          deviceName: "Firefox on Windows",
          createdAt: new Date(),
          lastActivity: new Date(),
        },
        {
          sessionId: "session_to_keep",
          ipAddress: "10.0.0.2",
          deviceName: "Safari on iOS",
          createdAt: new Date(),
          lastActivity: new Date(),
        },
      ],
    });
    testUserId = user._id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: "logout_test@example.com" });
    await AuditLog.deleteMany({});
  });

  test("should remove specific session and keep others", async () => {
    const result = await UserManagementService.logoutDevice(
      testUserId,
      "session_to_remove"
    );

    expect(result.success).toBe(true);
    expect(result.removed).toBe(true);

    const user = await User.findById(testUserId);
    expect(user.activeSessions).toHaveLength(1);
    expect(user.activeSessions[0].sessionId).toBe("session_to_keep");
  });

  test("should return removed=false when session not found", async () => {
    const result = await UserManagementService.logoutDevice(
      testUserId,
      "nonexistent_session"
    );

    expect(result.success).toBe(true);
    expect(result.removed).toBe(false);
  });
});

describe("UserManagementService - bulkExport", () => {
  let testUserId1;
  let testUserId2;
  let testUserId3;
  let exportRole;

  beforeEach(async () => {
    await User.deleteMany({ email: /export_user\d@example\.com$/ });
    await Role.deleteMany({});
    exportRole = await Role.create({
      name: "ExportRole",
      slug: "export-role",
      scope: "store",
    });

    const users = await User.create([
      {
        name: "Export User 1",
        email: "export_user1@example.com",
        firstName: "Export",
        lastName: "User1",
        displayName: "Export User1",
        password: "$2a$10$fakehashexport1",
        userType: "store_admin",
        role: exportRole._id,
        status: "Active",
        isSuperAdmin: false,
        emailVerified: true,
        provider: "invitation",
        twoFactorEnabled: false,
        createdAt: new Date(),
      },
      {
        name: "Export User 2",
        email: "export_user2@example.com",
        firstName: "Export",
        lastName: "User2",
        displayName: "Export User2",
        password: "$2a$10$fakehashexport2",
        userType: "staff",
        role: exportRole._id,
        status: "Suspended",
        isSuperAdmin: false,
        emailVerified: true,
        provider: "invitation",
        twoFactorEnabled: true,
        createdAt: new Date(),
      },
      {
        name: "Export User 3",
        email: "export_user3@example.com",
        firstName: "Export",
        lastName: "User3",
        displayName: "Export User3",
        password: "$2a$10$fakehashexport3",
        userType: "customer",
        role: exportRole._id,
        status: "Active",
        isSuperAdmin: false,
        emailVerified: true,
        provider: "invitation",
        twoFactorEnabled: false,
        createdAt: new Date(),
      },
    ]);
    testUserId1 = users[0]._id;
    testUserId2 = users[1]._id;
    testUserId3 = users[2]._id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: /export_user\d@example\.com$/ });
    await Role.deleteMany({});
    await User.deleteMany({});
  });

  test("should export users as CSV", async () => {
    const result = await UserManagementService.bulkExport(
      [testUserId1, testUserId2, testUserId3],
      "csv"
    );

    expect(result.format).toBe("csv");
    expect(result.count).toBe(3);
    expect(result.data).toContain("email");
    expect(result.data).toContain("export_user1@example.com");
    expect(result.data).toContain("export_user2@example.com");
    expect(result.data).toContain("export_user3@example.com");
    expect(result.data).toContain("Suspended");
  });

  test("should export users as JSON", async () => {
    const result = await UserManagementService.bulkExport(
      [testUserId1],
      "json"
    );

    expect(result.format).toBe("json");
    expect(result.count).toBe(1);

    const parsed = JSON.parse(result.data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].email).toBe("export_user1@example.com");
    expect(parsed[0].firstName).toBe("Export");
    expect(parsed[0]).not.toHaveProperty("password");
    expect(parsed[0]).not.toHaveProperty("twoFactorSecret");
  });

  test("should return empty export with headers for no user IDs", async () => {
    const result = await UserManagementService.bulkExport([], "csv");

    expect(result.count).toBe(0);
    expect(result.data).toContain("email");
    expect(result.data).toContain("firstName");
  });

  test("should include store memberships from UserStore in CSV export, not legacy storeIds", async () => {
    const store = await Store.create({ name: "Test Store CSV" });
    await UserStore.create({
      userId: testUserId1,
      storeId: store._id,
      roleId: exportRole._id,
      status: "active",
    });

    const result = await UserManagementService.bulkExport([testUserId1], "csv");

    expect(result.format).toBe("csv");
    expect(result.count).toBe(1);
    expect(result.data).toContain("Test Store CSV");
    expect(result.data).toContain("stores");
    expect(result.data).toContain("storeCount");
  });

  test("should include store memberships from UserStore in JSON export, not legacy storeIds", async () => {
    const store = await Store.create({ name: "Test Store JSON" });
    await UserStore.create({
      userId: testUserId1,
      storeId: store._id,
      roleId: exportRole._id,
      status: "active",
    });

    const result = await UserManagementService.bulkExport([testUserId1], "json");

    expect(result.format).toBe("json");
    expect(result.count).toBe(1);

    const parsed = JSON.parse(result.data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].storeMemberships).toBeDefined();
    expect(parsed[0].storeMemberships.length).toBe(1);
    expect(parsed[0].storeMemberships[0].storeName).toBe("Test Store JSON");
    expect(parsed[0].storeCount).toBe(1);
    expect(parsed[0]).not.toHaveProperty("storeIds");
  });
});

describe("UserManagementService - bulkAssignRole", () => {
  let user1Id;
  let user2Id;
  let roleA;
  let roleB;
  let storeRole;

  beforeEach(async () => {
    await User.deleteMany({ email: /bulk_role\d*@example\.com$/ });
    await Role.deleteMany({});
    await AuditLog.deleteMany({});
    await UserStore.deleteMany({});

    roleA = await Role.create({
      name: "RoleA",
      slug: "role-a",
      scope: "platform",
    });
    roleB = await Role.create({
      name: "RoleB",
      slug: "role-b",
      scope: "platform",
    });
    storeRole = await Role.create({
      name: "StoreRole",
      slug: "store-role",
      scope: "store",
    });

    const users = await User.create([
      {
        name: "Bulk Role User1",
        email: "bulk_role1@example.com",
        password: "$2a$10$fakehashbulk1",
        userType: "store_admin",
        role: roleA._id,
        status: "Active",
        isSuperAdmin: false,
        emailVerified: true,
        provider: "invitation",
      },
      {
        name: "Bulk Role User2",
        email: "bulk_role2@example.com",
        password: "$2a$10$fakehashbulk2",
        userType: "staff",
        role: roleA._id,
        status: "Active",
        isSuperAdmin: false,
        emailVerified: true,
        provider: "invitation",
      },
    ]);
    user1Id = users[0]._id;
    user2Id = users[1]._id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: /bulk_role\d*@example\.com$/ });
    await Role.deleteMany({});
    await AuditLog.deleteMany({});
    await UserStore.deleteMany({});
  });

  test("should assign role to multiple users", async () => {
    const result = await UserManagementService.bulkAssignRole(
      [user1Id, user2Id],
      roleB._id,
      null,
      adminActorId
    );

    expect(result.affected).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);

    const user1 = await User.findById(user1Id);
    const user2 = await User.findById(user2Id);
    const roleIds1 = user1.role.map((r) => r.toString());
    const roleIds2 = user2.role.map((r) => r.toString());

    expect(roleIds1).toContain(roleA._id.toString());
    expect(roleIds1).toContain(roleB._id.toString());
    expect(roleIds2).toContain(roleA._id.toString());
    expect(roleIds2).toContain(roleB._id.toString());
  });

  test("should not duplicate role if user already has it", async () => {
    await UserManagementService.bulkAssignRole(
      [user1Id],
      roleA._id,
      null,
      null
    );

    const user = await User.findById(user1Id);
    const roleCount = user.role.filter(
      (r) => r.toString() === roleA._id.toString()
    ).length;
    expect(roleCount).toBe(1);
  });

  test("should throw NotFound for invalid role", async () => {
    await expect(
      UserManagementService.bulkAssignRole(
        [user1Id],
        new mongoose.Types.ObjectId(),
        null,
        null
      )
    ).rejects.toThrow("Rôle introuvable");
  });

  test("should report failure for non-existent user", async () => {
    const result = await UserManagementService.bulkAssignRole(
      [user1Id, new mongoose.Types.ObjectId()],
      roleB._id,
      null,
      null
    );

    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toBe("Utilisateur introuvable");
  });

  test("should reject store-scoped role assignment with InvalidRoleScope", async () => {
    await expect(
      UserManagementService.bulkAssignRole(
        [user1Id, user2Id],
        storeRole._id,
        null,
        adminActorId
      )
    ).rejects.toThrow("Un rôle Store ne peut pas être assigné depuis la gestion plateforme");
  });

  test("should not modify user roles when store-scoped role is rejected", async () => {
    try {
      await UserManagementService.bulkAssignRole(
        [user1Id],
        storeRole._id,
        null,
        null
      );
    } catch (e) {
      // expected rejection
    }

    const user = await User.findById(user1Id);
    const roleIds = user.role.map((r) => r.toString());
    // user should still only have the original platform role (roleA), not the store role
    expect(roleIds).toContain(roleA._id.toString());
    expect(roleIds).not.toContain(storeRole._id.toString());
  });
});
