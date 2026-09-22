const assert = require("node:assert/strict");

const { buildGalleryDocs } = require("./GalleryProductService");

test("buildGalleryDocs puts productImage first and keeps gallery images after it", () => {
  const docs = buildGalleryDocs("product-1", "main.png", [
    "secondary-1.png",
    { image: "secondary-2.png", order: 5 },
  ]);

  assert.deepEqual(docs, [
    { product: "product-1", image: "main.png", order: 0, isPrimary: true },
    { product: "product-1", image: "secondary-1.png", order: 1, isPrimary: false },
    { product: "product-1", image: "secondary-2.png", order: 5, isPrimary: false },
  ]);
});
