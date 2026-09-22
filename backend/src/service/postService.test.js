const assert = require("node:assert/strict");

const postService = require("./postService");

test("calculateReadingTime strips HTML tags before counting words", () => {
  const html = "<p>Hello <strong>world</strong>, this is a test.</p>";
  // 7 words -> below 200wpm threshold -> rounds up to the 1-minute floor.
  assert.equal(postService.calculateReadingTime(html), 1);
});

test("calculateReadingTime rounds up to the nearest minute", () => {
  const words = new Array(450).fill("word").join(" "); // 450 words / 200wpm = 2.25 -> 3
  assert.equal(postService.calculateReadingTime(words), 3);
});

test("calculateReadingTime never returns less than 1 minute", () => {
  assert.equal(postService.calculateReadingTime(""), 1);
  assert.equal(postService.calculateReadingTime(null), 1);
  assert.equal(postService.calculateReadingTime("<p></p>"), 1);
});
