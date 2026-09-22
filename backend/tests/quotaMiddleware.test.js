const test = require("node:test");
const assert = require("node:assert/strict");

const {
  quotaMiddleware,
  checkQuota,
  incrementQuota,
  decrementQuota,
  getStoreQuotaStatus,
} = require("../src/middleware/quotaMiddleware");

test("checkQuota allows when under limit", async () => {
  const mockSubscription = {
    planId: "plan1",
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  };

  const mockPlanQuota = {
    limitValue: 5,
    warningThreshold: 80,
    criticalThreshold: 95,
    blockedAction: "block",
  };

  let captured = null;

  const originalFindOne = require("../src/models/Subscription").findOne;
  require("../src/models/Subscription").findOne = () => Promise.resolve(mockSubscription);

  const PlanQuota = require("../src/models/PlanQuota");
  const originalPlanFindOne = PlanQuota.findOne;
  PlanQuota.findOne = () => Promise.resolve(mockPlanQuota);

  const UsageCounter = require("../src/models/UsageCounter");
  const originalUsageFindOne = UsageCounter.findOne;
  UsageCounter.findOne = () => Promise.resolve({ used: 0 });

  const GracePeriod = require("../src/models/GracePeriod");
  const originalGraceFindOne = GracePeriod.findOne;
  GracePeriod.findOne = () => Promise.resolve(null);

  try {
    const result = await checkQuota({
      storeId: "store1",
      quotaTypeCode: "products",
      increment: 1,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.state, "normal");
    assert.equal(result.remaining, 5);
  } finally {
    require("../src/models/Subscription").findOne = originalFindOne;
    PlanQuota.findOne = originalPlanFindOne;
    UsageCounter.findOne = originalUsageFindOne;
    GracePeriod.findOne = originalGraceFindOne;
  }
});

test("checkQuota blocks when at limit", async () => {
  const mockSubscription = {
    planId: "plan1",
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  };

  const mockPlanQuota = {
    limitValue: 5,
    warningThreshold: 80,
    criticalThreshold: 95,
    blockedAction: "block",
  };

  const Subscription = require("../src/models/Subscription");
  const originalFindOne = Subscription.findOne;
  Subscription.findOne = () => Promise.resolve(mockSubscription);

  const PlanQuota = require("../src/models/PlanQuota");
  const originalPlanFindOne = PlanQuota.findOne;
  PlanQuota.findOne = () => Promise.resolve(mockPlanQuota);

  const UsageCounter = require("../src/models/UsageCounter");
  const originalUsageFindOne = UsageCounter.findOne;
  UsageCounter.findOne = () => Promise.resolve({ used: 5 });

  const GracePeriod = require("../src/models/GracePeriod");
  const originalGraceFindOne = GracePeriod.findOne;
  GracePeriod.findOne = () => Promise.resolve(null);

  try {
    const result = await checkQuota({
      storeId: "store1",
      quotaTypeCode: "products",
      increment: 1,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.state, "blocked");
  } finally {
    Subscription.findOne = originalFindOne;
    PlanQuota.findOne = originalPlanFindOne;
    UsageCounter.findOne = originalUsageFindOne;
    GracePeriod.findOne = originalGraceFindOne;
  }
});

test("checkQuota warns at 80%", async () => {
  const mockSubscription = {
    planId: "plan1",
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  };

  const mockPlanQuota = {
    limitValue: 5,
    warningThreshold: 80,
    criticalThreshold: 95,
    blockedAction: "block",
  };

  const Subscription = require("../src/models/Subscription");
  const originalFindOne = Subscription.findOne;
  Subscription.findOne = () => Promise.resolve(mockSubscription);

  const PlanQuota = require("../src/models/PlanQuota");
  const originalPlanFindOne = PlanQuota.findOne;
  PlanQuota.findOne = () => Promise.resolve(mockPlanQuota);

  const UsageCounter = require("../src/models/UsageCounter");
  const originalUsageFindOne = UsageCounter.findOne;
  UsageCounter.findOne = () => Promise.resolve({ used: 4 });

  const GracePeriod = require("../src/models/GracePeriod");
  const originalGraceFindOne = GracePeriod.findOne;
  GracePeriod.findOne = () => Promise.resolve(null);

  try {
    const result = await checkQuota({
      storeId: "store1",
      quotaTypeCode: "products",
      increment: 1,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.state, "warning");
  } finally {
    Subscription.findOne = originalFindOne;
    PlanQuota.findOne = originalPlanFindOne;
    UsageCounter.findOne = originalUsageFindOne;
    GracePeriod.findOne = originalGraceFindOne;
  }
});

test("checkQuota returns unlimited when no planQuota", async () => {
  const mockSubscription = {
    planId: "plan1",
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  };

  const Subscription = require("../src/models/Subscription");
  const originalFindOne = Subscription.findOne;
  Subscription.findOne = () => Promise.resolve(mockSubscription);

  const PlanQuota = require("../src/models/PlanQuota");
  const originalPlanFindOne = PlanQuota.findOne;
  PlanQuota.findOne = () => Promise.resolve(null);

  try {
    const result = await checkQuota({
      storeId: "store1",
      quotaTypeCode: "products",
      increment: 1000,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.state, "unlimited");
  } finally {
    Subscription.findOne = originalFindOne;
    PlanQuota.findOne = originalPlanFindOne;
  }
});

test("checkQuota allows grace period when blocked but active", async () => {
  const mockSubscription = {
    planId: "plan1",
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  };

  const mockPlanQuota = {
    limitValue: 5,
    warningThreshold: 80,
    criticalThreshold: 95,
    blockedAction: "grace_period",
  };

  const mockGracePeriod = {
    graceEndDate: new Date(Date.now() + 86400000),
  };

  const Subscription = require("../src/models/Subscription");
  const originalFindOne = Subscription.findOne;
  Subscription.findOne = () => Promise.resolve(mockSubscription);

  const PlanQuota = require("../src/models/PlanQuota");
  const originalPlanFindOne = PlanQuota.findOne;
  PlanQuota.findOne = () => Promise.resolve(mockPlanQuota);

  const UsageCounter = require("../src/models/UsageCounter");
  const originalUsageFindOne = UsageCounter.findOne;
  UsageCounter.findOne = () => Promise.resolve({ used: 5 });

  const GracePeriod = require("../src/models/GracePeriod");
  const originalGraceFindOne = GracePeriod.findOne;
  GracePeriod.findOne = () => Promise.resolve(mockGracePeriod);

  try {
    const result = await checkQuota({
      storeId: "store1",
      quotaTypeCode: "products",
      increment: 1,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.state, "grace_period");
  } finally {
    Subscription.findOne = originalFindOne;
    PlanQuota.findOne = originalPlanFindOne;
    UsageCounter.findOne = originalUsageFindOne;
    GracePeriod.findOne = originalGraceFindOne;
  }
});
