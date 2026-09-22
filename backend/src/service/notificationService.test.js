const assert = require("node:assert/strict");

const { renderTemplate, escapeHtml, computeChannels } = require("./notificationService");
const { EVENT_CONFIG } = require("./NotificationEventHandler");
const { TEMPLATE_CONTENT } = require("../script/seedNotificationTemplates");
const { CRITICAL_CATEGORIES } = require("../models/NotificationPreference");

test("renderTemplate substitutes known variables", () => {
  const out = renderTemplate("Order {{orderNumber}} total {{total}}", {
    orderNumber: "ORD-1024",
    total: "125 TND",
  });
  assert.equal(out, "Order ORD-1024 total 125 TND");
});

test("renderTemplate leaves unknown variables blank instead of throwing", () => {
  const out = renderTemplate("Hello {{userName}}, welcome to {{missing}}", { userName: "Sami" });
  assert.equal(out, "Hello Sami, welcome to ");
});

test("renderTemplate escapes HTML in variable values (no unsafe concatenation)", () => {
  const out = renderTemplate("Bonjour {{userName}}", {
    userName: "<script>alert(1)</script>",
  });
  assert.equal(out, "Bonjour &lt;script&gt;alert(1)&lt;/script&gt;");
  assert.ok(!out.includes("<script>"));
});

test("escapeHtml handles null/undefined without throwing", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml('a & b "c"'), "a &amp; b &quot;c&quot;");
});

test("every declared business event has a matching seed template", () => {
  const missing = Object.keys(EVENT_CONFIG).filter((code) => !TEMPLATE_CONTENT[code]);
  assert.deepEqual(missing, [], `events missing seed template content: ${missing.join(", ")}`);
});

test("every seed template declares fr/en/ar for title and message", () => {
  for (const [code, content] of Object.entries(TEMPLATE_CONTENT)) {
    for (const locale of ["fr", "en", "ar"]) {
      assert.ok(content.title[locale], `${code}: missing title.${locale}`);
      assert.ok(content.message[locale], `${code}: missing message.${locale}`);
    }
  }
});

test("role-based targeting (roles field) is only ever set on store-scoped events", () => {
  for (const [code, config] of Object.entries(EVENT_CONFIG)) {
    if (config.roles) {
      assert.equal(config.scope, "store", `${code}: 'roles' only makes sense for scope "store"`);
      assert.ok(config.roles.length > 0, `${code}: 'roles' should not be an empty array`);
    }
  }
});

test("computeChannels defaults to every template-enabled channel when no preference row exists", () => {
  const channels = computeChannels({
    categoryPref: undefined,
    category: "orders",
    templateChannels: { in_app: true, email: true, push: false },
  });
  assert.deepEqual(channels.sort(), ["email", "in_app"]);
});

test("computeChannels respects a user's explicit opt-out", () => {
  const channels = computeChannels({
    categoryPref: { in_app: true, email: false, push: false },
    category: "orders",
    templateChannels: { in_app: true, email: true, push: false },
  });
  assert.deepEqual(channels, ["in_app"]);
});

test("computeChannels never drops a channel the template itself doesn't offer", () => {
  const channels = computeChannels({
    categoryPref: { in_app: true, email: true, push: true },
    category: "orders",
    templateChannels: { in_app: true, email: false, push: false },
  });
  assert.deepEqual(channels, ["in_app"]);
});

test("computeChannels falls back to in_app when every channel is disabled", () => {
  const channels = computeChannels({
    categoryPref: { in_app: false, email: false, push: false },
    category: "orders",
    templateChannels: { in_app: true, email: true, push: true },
  });
  assert.deepEqual(channels, ["in_app"]);
});

test("computeChannels forces in_app+email on for critical categories regardless of preference", () => {
  for (const category of CRITICAL_CATEGORIES) {
    const channels = computeChannels({
      categoryPref: { in_app: false, email: false, push: false },
      category,
      templateChannels: { in_app: true, email: true, push: false },
    });
    assert.ok(channels.includes("in_app"), `${category}: in_app must stay on`);
    assert.ok(channels.includes("email"), `${category}: email must stay on`);
  }
});

test("security events are never store-scoped except the platform-wide alert", () => {
  for (const [code, config] of Object.entries(EVENT_CONFIG)) {
    if (code === "security.alert") continue;
    if (code.startsWith("security.")) {
      assert.equal(config.scope, "user", `${code} should target the affected user directly`);
    }
  }
});
