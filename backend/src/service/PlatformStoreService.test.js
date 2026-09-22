const test = require("node:test");
const assert = require("node:assert/strict");

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

const buildId = (id) => {
  const { SchemaTypes } = require("mongoose");
  if (SchemaTypes && SchemaTypes.ObjectId) {
    return new SchemaTypes.ObjectId(id);
  }
  return id;
};

test("getStoreDetails throws BAD_REQUEST for invalid storeId", async () => {
  const service = freshRequire("./service/PlatformStoreService");
  await assert.rejects(() => service.getStoreDetails("not-a-valid-id"), (err) => {
    assert.equal(err.code, "BAD_REQUEST");
    assert.ok(err.message.includes("Invalid storeId"));
    return true;
  });
});

test("getStoreDetails throws NOT_FOUND for missing store", async () => {
  const origStore = mockModule("../models/Store", {
    findById: async () => null,
  });

  const service = freshRequire("./service/PlatformStoreService");
  await assert.rejects(() => service.getStoreDetails("507f1f77bcf86cd799439011"), (err) => {
    assert.equal(err.code, "NOT_FOUND");
    return true;
  });

  restoreModule("../models/Store", origStore);
});

test("getStoreDetails throws NOT_FOUND for soft-deleted store", async () => {
  const origStore = mockModule("../models/Store", {
    findById: async () => ({ deletedAt: new Date(), _id: "507f1f77bcf86cd799439011" }),
  });

  const service = freshRequire("./service/PlatformStoreService");
  await assert.rejects(() => service.getStoreDetails("507f1f77bcf86cd799439011"), (err) => {
    assert.equal(err.code, "NOT_FOUND");
    return true;
  });

  restoreModule("../models/Store", origStore);
});

test("getStoreDetails returns metrics from Order not Invoice", async () => {
  const storeId = "507f1f77bcf86cd799439011";
  const mockStore = {
    _id: storeId,
    name: "Test Store",
    status: "active",
    subscriptionStatus: "trial",
    planId: { _id: "plan1", name: "Pro", slug: "pro", status: "active" },
    trialEndsAt: null,
    currentPeriodEnd: null,
    ownerId: { _id: "owner1", name: "Owner", email: "owner@test.com", phone: "", country: "", createdAt: null, lastLogin: null, status: "Active", twoFactorEnabled: false },
    deletedAt: null,
  };

  const origStore = mockModule("../models/Store", {
    findById: async () => mockStore,
  });
  const origDomain = mockModule("../models/StoreDomain", {
    find: async () => [],
  });
  const origUserStore = mockModule("../models/UserStore", {
    find: async () => [],
  });
  const origInvoice = mockModule("../models/Invoice", {
    find: async () => [],
    countDocuments: async () => 5,
    aggregate: async () => [{ total: 1000 }],
  });
  const origAudit = mockModule("../models/AuditLog", {
    find: async () => [],
    countDocuments: async () => 0,
  });
  const origOrder = mockModule("../models/Order", {
    countDocuments: async () => 42,
    aggregate: async () => [{ total: 5000 }],
  });
  const origCustomer = mockModule("../models/Customer", {
    countDocuments: async () => 10,
  });
  const origProduct = mockModule("../models/Product", {
    countDocuments: async () => 25,
  });
  const origSubscription = mockModule("../models/Subscription", {
    findOne: async () => null,
  });
  const origStoreUsage = mockModule("../models/StoreUsage", {
    find: async () => [],
  });
  const origQuotaType = mockModule("../models/QuotaType", {
    find: async () => [],
  });
  const origPlanQuota = mockModule("../models/PlanQuota", {
    find: async () => [],
  });

  const service = freshRequire("./service/PlatformStoreService");
  const result = await service.getStoreDetails(storeId);

  assert.equal(result.metrics.orderCount, 42, "orderCount should come from Order");
  assert.equal(result.metrics.orderRevenue, 5000, "orderRevenue should come from paid Orders");
  assert.equal(result.metrics.invoiceCount, 5, "invoiceCount should come from Invoice");
  assert.equal(result.metrics.saasRevenuePaid, 1000, "saasRevenuePaid should come from paid Invoices");
  assert.equal(result.totalOrders, 42, "backward alias totalOrders should equal orderCount");
  assert.equal(result.compliance, null, "compliance should be null instead of hardcoded Compliant");

  restoreModule("../models/Store", origStore);
  restoreModule("../models/StoreDomain", origDomain);
  restoreModule("../models/UserStore", origUserStore);
  restoreModule("../models/Invoice", origInvoice);
  restoreModule("../models/AuditLog", origAudit);
  restoreModule("../models/Order", origOrder);
  restoreModule("../models/Customer", origCustomer);
  restoreModule("../models/Product", origProduct);
  restoreModule("../models/Subscription", origSubscription);
  restoreModule("../models/StoreUsage", origStoreUsage);
  restoreModule("../models/QuotaType", origQuotaType);
  restoreModule("../models/PlanQuota", origPlanQuota);
});

test("getStoreDetails returns staff from UserStore not legacy User.storeIds", async () => {
  const storeId = "507f1f77bcf86cd799439011";
  const mockStore = {
    _id: storeId,
    name: "Test Store",
    status: "active",
    subscriptionStatus: "active",
    planId: { _id: "plan1", name: "Pro", slug: "pro", status: "active" },
    trialEndsAt: null,
    currentPeriodEnd: null,
    ownerId: { _id: "owner1", name: "Owner", email: "owner@test.com", phone: "", country: "", createdAt: null, lastLogin: null, status: "Active", twoFactorEnabled: false },
    deletedAt: null,
  };

  const mockStaffUser = { _id: "user1", name: "Staff User", email: "staff@test.com", status: "Active", lastLogin: null, twoFactorEnabled: false };
  const mockRole = { _id: "role1", name: "Admin", slug: "admin", permissions: [] };

  const origStore = mockModule("../models/Store", {
    findById: async () => mockStore,
  });
  const origDomain = mockModule("../models/StoreDomain", {
    find: async () => [],
  });
  const origUserStore = mockModule("../models/UserStore", {
    find: async () => [
      { userId: mockStaffUser, roleId: mockRole, status: "active" },
    ],
  });
  const origInvoice = mockModule("../models/Invoice", {
    find: async () => [],
    countDocuments: async () => 0,
    aggregate: async () => [],
  });
  const origAudit = mockModule("../models/AuditLog", {
    find: async () => [],
    countDocuments: async () => 0,
  });
  const origOrder = mockModule("../models/Order", {
    countDocuments: async () => 0,
    aggregate: async () => [],
  });
  const origCustomer = mockModule("../models/Customer", {
    countDocuments: async () => 0,
  });
  const origProduct = mockModule("../models/Product", {
    countDocuments: async () => 0,
  });
  const origSubscription = mockModule("../models/Subscription", {
    findOne: async () => null,
  });
  const origStoreUsage = mockModule("../models/StoreUsage", {
    find: async () => [],
  });
  const origQuotaType = mockModule("../models/QuotaType", {
    find: async () => [],
  });
  const origPlanQuota = mockModule("../models/PlanQuota", {
    find: async () => [],
  });

  const service = freshRequire("./service/PlatformStoreService");
  const result = await service.getStoreDetails(storeId);

  assert.equal(result.staff.length, 1, "staff should come from UserStore");
  assert.equal(result.staff[0].userId, "user1");
  assert.equal(result.staff[0].membershipStatus, "active");
  assert.deepEqual(result.staff[0].role, { id: "role1", name: "Admin", slug: "admin" });
  assert.equal(result.activeAdmins, 1, "activeAdmins should count active memberships");
  assert.deepEqual(result.adminList, result.staff, "adminList should equal staff for backward compat");

  restoreModule("../models/Store", origStore);
  restoreModule("../models/StoreDomain", origDomain);
  restoreModule("../models/UserStore", origUserStore);
  restoreModule("../models/Invoice", origInvoice);
  restoreModule("../models/AuditLog", origAudit);
  restoreModule("../models/Order", origOrder);
  restoreModule("../models/Customer", origCustomer);
  restoreModule("../models/Product", origProduct);
  restoreModule("../models/Subscription", origSubscription);
  restoreModule("../models/StoreUsage", origStoreUsage);
  restoreModule("../models/QuotaType", origQuotaType);
  restoreModule("../models/PlanQuota", origPlanQuota);
});

test("getStoreDetails derives health signals from store, subscription, and quotas", async () => {
  const storeId = "507f1f77bcf86cd799439011";
  const mockStore = {
    _id: storeId,
    name: "Test Store",
    status: "suspended",
    subscriptionStatus: "past_due",
    planId: { _id: "plan1", name: "Pro", slug: "pro", status: "active" },
    trialEndsAt: null,
    currentPeriodEnd: null,
    ownerId: { _id: "owner1", name: "Owner", email: "owner@test.com", phone: "", country: "", createdAt: null, lastLogin: null, status: "Active", twoFactorEnabled: false },
    deletedAt: null,
  };

  const origStore = mockModule("../models/Store", {
    findById: async () => mockStore,
  });
  const origDomain = mockModule("../models/StoreDomain", {
    find: async () => [],
  });
  const origUserStore = mockModule("../models/UserStore", {
    find: async () => [],
  });
  const origInvoice = mockModule("../models/Invoice", {
    find: async () => [],
    countDocuments: async () => 0,
    aggregate: async () => [],
  });
  const origAudit = mockModule("../models/AuditLog", {
    find: async () => [],
    countDocuments: async () => 0,
  });
  const origOrder = mockModule("../models/Order", {
    countDocuments: async () => 0,
    aggregate: async () => [],
  });
  const origCustomer = mockModule("../models/Customer", {
    countDocuments: async () => 0,
  });
  const origProduct = mockModule("../models/Product", {
    countDocuments: async () => 0,
  });
  const origSubscription = mockModule("../models/Subscription", {
    findOne: async () => ({ status: "past_due" }),
  });
  const origStoreUsage = mockModule("../models/StoreUsage", {
    find: async () => [],
  });
  const origQuotaType = mockModule("../models/QuotaType", {
    find: async () => [{ code: "products", name: "Products" }],
  });
  const origPlanQuota = mockModule("../models/PlanQuota", {
    find: async () => [],
  });

  const service = freshRequire("./service/PlatformStoreService");
  const result = await service.getStoreDetails(storeId);

  assert.equal(result.health.level, "critical", "health level should be critical when store is suspended or past_due");
  assert.ok(result.health.signals.includes("suspended"), "signals should include suspended");
  assert.ok(result.health.signals.includes("past_due"), "signals should include past_due");
  assert.equal(result.health.signals.includes("soft_limit_blocked"), false, "should not include soft_limit_blocked when no quotas blocked");

  restoreModule("../models/Store", origStore);
  restoreModule("../models/StoreDomain", origDomain);
  restoreModule("../models/UserStore", origUserStore);
  restoreModule("../models/Invoice", origInvoice);
  restoreModule("../models/AuditLog", origAudit);
  restoreModule("../models/Order", origOrder);
  restoreModule("../models/Customer", origCustomer);
  restoreModule("../models/Product", origProduct);
  restoreModule("../models/Subscription", origSubscription);
  restoreModule("../models/StoreUsage", origStoreUsage);
  restoreModule("../models/QuotaType", origQuotaType);
  restoreModule("../models/PlanQuota", origPlanQuota);
});
