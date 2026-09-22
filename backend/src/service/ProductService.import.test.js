const assert = require("node:assert/strict");

const { buildImportPayload } = require("./ProductService");

// An import row only carries the columns the file filled in. Updating a product
// from such a row must not clear the fields the file said nothing about  the
// category pair is the dangerous one, because normalizeCategories turns a row
// with no category into { productCategories: [], productCategory: null }.
test("a row without a category column leaves the categories alone", () => {
  const payload = buildImportPayload({
    productName: "Brake pad",
    regularPrice: 20,
  });

  assert.equal("productCategories" in payload, false);
  assert.equal("productCategory" in payload, false);
  assert.deepEqual(payload, { productName: "Brake pad", regularPrice: 20 });
});

test("a row with categories sets both the list and the legacy field", () => {
  const payload = buildImportPayload({
    productName: "Brake pad",
    productCategories: ["cat-a", "cat-b"],
  });

  assert.deepEqual(payload.productCategories, ["cat-a", "cat-b"]);
  assert.equal(payload.productCategory, "cat-a");
});

test("a legacy single category still fills the list", () => {
  const payload = buildImportPayload({
    productName: "Brake pad",
    productCategory: "cat-a",
  });

  assert.deepEqual(payload.productCategories, ["cat-a"]);
  assert.equal(payload.productCategory, "cat-a");
});

test("duplicate category ids are collapsed", () => {
  const payload = buildImportPayload({
    productName: "Brake pad",
    productCategories: ["cat-a", "cat-a", "cat-b"],
  });

  assert.deepEqual(payload.productCategories, ["cat-a", "cat-b"]);
});

// Images are written through GalleryProductService, not stored on the product,
// so they must not leak into the $set payload.
test("image columns are kept out of the product payload", () => {
  const payload = buildImportPayload({
    productName: "Brake pad",
    productImage: "main.png",
    productGallery: ["a.png"],
  });

  assert.equal("productImage" in payload, false);
  assert.equal("productGallery" in payload, false);
});
