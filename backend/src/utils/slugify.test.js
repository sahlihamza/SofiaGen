const assert = require("node:assert/strict");

const { slugify, generateUniqueSlug } = require("./slugify");

test("slugify lowercases, strips accents and punctuation, collapses separators", () => {
  assert.equal(slugify("éléphant  Paris!"), "elephant-a-paris");
  assert.equal(slugify("  Hello,   World!!  "), "hello-world");
  assert.equal(slugify("Déjà-vu_2026"), "deja-vu-2026");
});

test("slugify falls back to an empty string for empty input", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify(undefined), "");
});

test("generateUniqueSlug returns the base slug when it's free", async () => {
  const FakeModel = { exists: async () => false };
  const slug = await generateUniqueSlug(FakeModel, "store-1", "My New Post");
  assert.equal(slug, "my-new-post");
});

test("generateUniqueSlug appends -2, -3... until it finds a free slug", async () => {
  const taken = new Set(["my-new-post", "my-new-post-2", "my-new-post-3"]);
  const FakeModel = { exists: async ({ slug }) => taken.has(slug) };
  const slug = await generateUniqueSlug(FakeModel, "store-1", "My New Post");
  assert.equal(slug, "my-new-post-4");
});

test("generateUniqueSlug excludes the current document when editing", async () => {
  let receivedFilter;
  const FakeModel = {
    exists: async (filter) => {
      receivedFilter = filter;
      return false;
    },
  };
  await generateUniqueSlug(FakeModel, "store-1", "My New Post", "post-id-1");
  assert.deepEqual(receivedFilter._id, { $ne: "post-id-1" });
});

test("generateUniqueSlug falls back to 'untitled' when the text has no usable characters", async () => {
  const FakeModel = { exists: async () => false };
  const slug = await generateUniqueSlug(FakeModel, "store-1", "!!!");
  assert.equal(slug, "untitled");
});
