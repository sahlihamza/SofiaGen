const test = require("node:test");
const assert = require("node:assert/strict");

const { buildStorefrontScriptsBundle } = require("./storefrontScriptsBundle");

test("buildStorefrontScriptsBundle returns a single script tag for the active storefront behaviors", () => {
  const bundle = buildStorefrontScriptsBundle({
    includeAccordion: true,
    includeTabs: true,
    includePopup: true,
    includeContactForm: true,
    includeCookieBanner: true,
    includeScrollAnimation: true,
  });

  assert.ok(bundle.includes("<script>"), "expected a script tag wrapper");
  assert.equal((bundle.match(/<script>/g) || []).length, 1, "expected exactly one script wrapper");
  assert.ok(bundle.includes("aria-expanded"), "expected bundled script to cover accordion accessibility");
  assert.ok(bundle.includes("aria-modal") || bundle.includes("role='dialog'"), "expected popup dialog handling in the bundle");
});
