const test = require("node:test");
const assert = require("node:assert/strict");

test("PageProvisioningService.seedDefaultPagesForStore creates 5 default pages", async () => {
  const createdPages = [];
  const Page = {
    findOne: async () => null,
    create: async (data) => {
      const page = { _id: `page-${createdPages.length}`, ...data, save: async () => page };
      createdPages.push(page);
      return page;
    },
  };

  const original = require.cache[require.resolve("./models/Page")]?.exports;
  require.cache[require.resolve("./models/Page")].exports = Page;

  const service = require("./PageProvisioningService");
  const result = await service.seedDefaultPagesForStore("storeId", "themeId");

  assert.equal(result.length, 5);
  assert.equal(result[0].pageType, "home");
  assert.equal(result[0].isPublished, false);
  assert.equal(result[0].isDraft, true);
  assert.equal(result[1].pageType, "product");
  assert.equal(result[2].pageType, "category");
  assert.equal(result[3].pageType, "cart");
  assert.equal(result[4].pageType, "checkout");

  require.cache[require.resolve("./models/Page")].exports = original || Page;
});

test("PageProvisioningService.seedDefaultPagesForStore skips existing pages", async () => {
  const existingPage = { _id: "existing", storeId: "storeId", urlSlug: "/", pageType: "home" };
  const Page = {
    findOne: async () => existingPage,
  };

  const original = require.cache[require.resolve("./models/Page")]?.exports;
  require.cache[require.resolve("./models/Page")].exports = Page;

  const service = require("./PageProvisioningService");
  const result = await service.seedDefaultPagesForStore("storeId", "themeId");

  assert.equal(result.length, 1);
  assert.equal(result[0]._id, "existing");

  require.cache[require.resolve("./models/Page")].exports = original || Page;
});

test("PageProvisioningService.assignTemplateToPage updates pageType", async () => {
  const page = { _id: "pageId", pageType: "custom", isHome: false, save: async function () { return this; } };
  const Page = {
    findById: async () => page,
  };

  const original = require.cache[require.resolve("./models/Page")]?.exports;
  require.cache[require.resolve("./models/Page")].exports = Page;

  const service = require("./PageProvisioningService");
  const result = await service.assignTemplateToPage("pageId", "home");

  assert.equal(result.pageType, "home");
  assert.equal(result.isHome, true);

  require.cache[require.resolve("./models/Page")].exports = original || Page;
});

test("PageProvisioningService.assignTemplateToPage throws for invalid type", async () => {
  const original = require.cache[require.resolve("./models/Page")]?.exports;
  require.cache[require.resolve("./models/Page")].exports = { findById: async () => ({}) };

  const service = require("./PageProvisioningService");
  await assert.rejects(() => service.assignTemplateToPage("pageId", "invalid"), /Invalid templateType/);

  require.cache[require.resolve("./models/Page")].exports = original || {};
});

test("PageProvisioningService.seedDefaultMenuForStore creates a header menu", async () => {
  const pages = [
    { _id: "homePage", pageType: "home" },
    { _id: "productPage", pageType: "product" },
  ];

  const savedMenus = [];
  const Menu = {
    create: async (data) => {
      const menu = { _id: `menu-${savedMenus.length}`, ...data, save: async () => menu };
      savedMenus.push(menu);
      return menu;
    },
  };

  const original = require.cache[require.resolve("./models/Menu")]?.exports;
  require.cache[require.resolve("./models/Menu")].exports = Menu;

  const service = require("./PageProvisioningService");
  const result = await service.seedDefaultMenuForStore("storeId", pages);

  assert.ok(result);
  assert.equal(result.name, "Main Menu");
  assert.equal(result.location, "header");
  assert.equal(result.items.length, 2);

  require.cache[require.resolve("./models/Menu")].exports = original || Menu;
});
