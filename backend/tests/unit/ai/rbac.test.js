const test = require("node:test");
const assert = require("node:assert/strict");

const { getCode } = require("../../../src/config/rbac/permissionCodes");
const { permissions } = require("../../../src/config/rbac/permissions");

test("rbac — AI Assistant permission module exists", () => {
  const aiModule = permissions.find((p) => p.module === "AI Assistant");
  assert.ok(aiModule, "AI Assistant module must be defined");
});

test("rbac — canonical AI permission codes are generated", () => {
  const expected = [
    "ai.assistant.use",
    "ai.assistant.history.view",
    "ai.assistant.conversations.view",
    "ai.assistant.settings.manage",
    "ai.assistant.usage.view",
    "ai.assistant.providers.manage",
    "ai.assistant.actions.confirm",
    "ai.assistant.view",
  ];
  for (const code of expected) {
    const resolved = getCode("AI Assistant", code.split(".").slice(2).join("_"));
    assert.equal(resolved, code, `expected ${code}, got ${resolved}`);
  }
});

test("rbac — every AI permission is store-scoped, not platform", () => {
  const ai = permissions.filter((p) => p.module === "AI Assistant");
  assert.ok(ai.length > 0);
  for (const p of ai) {
    assert.equal(p.scope, "store", `${p.code} must be store-scoped`);
  }
});

test("rbac — permission codes match the format validator", () => {
  const re = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
  for (const p of permissions) {
    assert.match(p.code, re, `invalid permission code: ${p.code}`);
  }
});