const test = require("node:test");
const assert = require("node:assert/strict");

const { findOrphanBlocks } = require("../../../scripts/checkOrphanBlocks");

test("findOrphanBlocks detects a deliberately orphaned block", () => {
  const orphans = findOrphanBlocks({
    blocksDir: __dirname,
    registerFile: __filename,
  });
  // This test file lives under backend/src/utils, not under the real blocks dir,
  // so it should be treated as an orphan of a register file that never imports it.
  assert.ok(Array.isArray(orphans));
  assert.ok(orphans.length >= 1, "expected at least one orphan when pointed at an unrelated dir");
});

test("no orphan widgets exist in the real theme-editor blocks dir", () => {
  const orphans = findOrphanBlocks();
  if (orphans.length) {
    // Surface the offending widgets directly in the assertion message so CI
    // failures are immediately actionable.
    assert.fail(
      `Orphan widgets never imported in registerBlocks.js:\n${orphans.map((n) => `  - ${n}`).join("\n")}`
    );
  }
  assert.deepEqual(orphans, []);
});
