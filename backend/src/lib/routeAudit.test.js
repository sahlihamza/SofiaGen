const test = require("node:test");
const assert = require("node:assert/strict");
const { findUnauthenticatedWriteMounts } = require("./routeAudit");

// SO-14  formalizes the manual route-by-route audit done during this work
// session into a reusable, always-current check instead of a one-off
// spreadsheet. Each entry below is a *known, pre-existing* gap as of this
// commit (mount has no isAuth, and the router file has no auth reference of
// any kind, yet defines a POST/PUT/PATCH/DELETE route)  this test does NOT
// claim they're all intentional; it exists so that:
//   1. this list is visible and reviewable in one place instead of buried
//      across 19 separate route files, and
//   2. anyone adding a NEW route mount fails CI immediately if they forget
//      auth, rather than shipping a silent security hole (which is exactly
//      how /api/products/add ended up wide open  see the SO-06/Bug-16 work
//      earlier in this ticket).
// To fix one of these for real: add `isAuth` (and usually `loadUser` +
// `hasPermission(...)`) to its mount in routes.js, then remove it from this
// list  the test will then fail if it's ever silently reopened.
const KNOWN_GAPS = [
  "/api/products/",
  "/api/stock-movements/",
  "/api/category/",
  "/api/product-category/",
  "/api/customer/",
  "/api/customer-addresses/",
  "/api/customer-groups/",
  "/api/customer-notes/",
  "/api/customer-sessions/",
  "/api/attributes/",
  "/api/attribute-values/",
  "/api/product-attributes/",
  "/api/product-variations/",
  "/api/product-tags/",
  "/api/product-tag-relations/",
  "/api/setting/",
  "/api",
  "/api/public/reviews/",
];

test("no NEW unauthenticated mutation route beyond the known, tracked baseline", () => {
  const findings = findUnauthenticatedWriteMounts().map((f) => f.mountPath);
  const newlyIntroduced = findings.filter((mountPath) => !KNOWN_GAPS.includes(mountPath));

  assert.deepEqual(
    newlyIntroduced,
    [],
    `New route(s) mounted with write endpoints and no auth middleware at all: ${newlyIntroduced.join(", ")}. ` +
      `Add isAuth (+ loadUser/hasPermission as appropriate) to the app.use(...) mount in routes.js.`
  );
});

test("a known gap that gets fixed should be removed from the tracked baseline", () => {
  const findings = findUnauthenticatedWriteMounts().map((f) => f.mountPath);
  const staleEntries = KNOWN_GAPS.filter((mountPath) => !findings.includes(mountPath));

  assert.deepEqual(
    staleEntries,
    [],
    `These are listed as known gaps but are no longer unauthenticated  remove from KNOWN_GAPS in this file: ${staleEntries.join(", ")}`
  );
});
