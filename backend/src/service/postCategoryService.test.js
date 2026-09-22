const assert = require("node:assert/strict");

const { buildCategoryTree } = require("./postCategoryService");

test("buildCategoryTree nests children under their parent", () => {
  const categories = [
    { _id: "a", name: "News", parentId: null },
    { _id: "b", name: "Tech", parentId: "a" },
    { _id: "c", name: "Sports", parentId: null },
    { _id: "d", name: "Football", parentId: "c" },
  ];

  const tree = buildCategoryTree(categories);

  assert.equal(tree.length, 2);
  const news = tree.find((c) => c._id === "a");
  const sports = tree.find((c) => c._id === "c");
  assert.equal(news.children.length, 1);
  assert.equal(news.children[0]._id, "b");
  assert.equal(sports.children.length, 1);
  assert.equal(sports.children[0]._id, "d");
});

test("buildCategoryTree handles ObjectId-like parentId comparison via String()", () => {
  const parentId = { toString: () => "parent-1" };
  const categories = [
    { _id: "parent-1", name: "Parent", parentId: null },
    { _id: "child-1", name: "Child", parentId },
  ];

  const tree = buildCategoryTree(categories);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0]._id, "child-1");
});

test("buildCategoryTree returns an empty array when there are no matches", () => {
  assert.deepEqual(buildCategoryTree([]), []);
});
