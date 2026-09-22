const test = require("node:test");
const assert = require("node:assert/strict");

const { pct, stateForPercentage, resolveQuotaDecision, STATE_OK, STATE_WARNING, STATE_CRITICAL, STATE_BLOCKED } = require("./SoftLimitService");

// SO-13  behavior at the limit: block, warn, or allow-with-overage,
// depending on the plan's configured blockedAction. These are the two pure
// decision cores behind SO-06 (checkQuotaAvailable, pre-create gate) and the
// existing soft-limit dashboard (evaluateStoreQuota, post-hoc state).

test("pct: unlimited/undefined/zero limit reports no percentage", () => {
  assert.equal(pct(50, null), null);
  assert.equal(pct(50, undefined), null);
  assert.equal(pct(50, 0), null);
});

test("pct: caps at 100 even when usage overshoots the limit (overage)", () => {
  assert.equal(pct(150, 100), 100);
});

test("pct: rounds to the nearest whole percent", () => {
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(2, 3), 67);
});

test("stateForPercentage: below warning threshold is ok", () => {
  const quota = { softLimitEnabled: true, warningThreshold: 80, criticalThreshold: 95, blockedThreshold: 100 };
  assert.equal(stateForPercentage(79, quota), STATE_OK);
});

test("stateForPercentage: exactly at each threshold boundary", () => {
  const quota = { softLimitEnabled: true, warningThreshold: 80, criticalThreshold: 95, blockedThreshold: 100 };
  assert.equal(stateForPercentage(80, quota), STATE_WARNING);
  assert.equal(stateForPercentage(95, quota), STATE_CRITICAL);
  assert.equal(stateForPercentage(100, quota), STATE_BLOCKED);
});

test("stateForPercentage: soft limits disabled on the plan always reports ok", () => {
  const quota = { softLimitEnabled: false, warningThreshold: 80, criticalThreshold: 95, blockedThreshold: 100 };
  assert.equal(stateForPercentage(100, quota), STATE_OK);
});

test("stateForPercentage: no percentage (unlimited) is ok regardless of thresholds", () => {
  const quota = { softLimitEnabled: true, warningThreshold: 1, criticalThreshold: 2, blockedThreshold: 3 };
  assert.equal(stateForPercentage(null, quota), STATE_OK);
});

test("resolveQuotaDecision: under the limit is always allowed", () => {
  const decision = resolveQuotaDecision({ used: 5, limit: 10, additional: 1, blockedAction: "block" });
  assert.equal(decision.allowed, true);
  assert.equal(decision.wouldExceed, false);
});

test("resolveQuotaDecision: at the limit exactly, one more is a hard block when blockedAction is 'block'", () => {
  const decision = resolveQuotaDecision({ used: 10, limit: 10, additional: 1, blockedAction: "block" });
  assert.equal(decision.allowed, false);
  assert.equal(decision.wouldExceed, true);
});

test("resolveQuotaDecision: exactly filling the last slot is allowed (limit itself is inclusive)", () => {
  const decision = resolveQuotaDecision({ used: 9, limit: 10, additional: 1, blockedAction: "block" });
  assert.equal(decision.allowed, true);
});

for (const softAction of ["notify", "read_only", "grace_period"]) {
  test(`resolveQuotaDecision: over the limit with blockedAction "${softAction}" allows (soft-warns, not a hard block)`, () => {
    const decision = resolveQuotaDecision({ used: 10, limit: 10, additional: 1, blockedAction: softAction });
    assert.equal(decision.allowed, true, `blockedAction "${softAction}" must not hard-block per SO-06's explicit per-plan decision requirement`);
    assert.equal(decision.wouldExceed, true);
  });
}

test("resolveQuotaDecision: missing blockedAction defaults to a hard block", () => {
  const decision = resolveQuotaDecision({ used: 10, limit: 10, additional: 1, blockedAction: undefined });
  assert.equal(decision.blockedAction, "block");
  assert.equal(decision.allowed, false);
});

test("resolveQuotaDecision: additional > 1 (bulk create) is checked against the resulting total, not just current usage", () => {
  const decision = resolveQuotaDecision({ used: 8, limit: 10, additional: 5, blockedAction: "block" });
  assert.equal(decision.wouldExceed, true);
  assert.equal(decision.allowed, false);
});
