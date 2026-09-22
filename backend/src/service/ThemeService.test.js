const test = require("node:test");
const assert = require("node:assert/strict");

const mockFindById = () => {
  const store = {
    _id: "storeId",
    name: "Test Store",
    themeId: null,
    provisioningStatus: "pending",
    save: async function () {
      Object.assign(this, { themeId: "newThemeId", provisioningStatus: "complete" });
      return this;
    },
  };
  return store;
};

const mockTheme = {
  _id: "sourceThemeId",
  name: "Source Theme",
  slug: "source-theme",
  description: "desc",
  storeId: "storeId",
  colors: {},
  fonts: {},
  spacing: {},
  radius: {},
  shadows: {},
  breakpoints: {},
  typography: {},
  settings: {},
  thumbnail: null,
  version: "1.0.0",
};

test("ThemeService.cloneThemeForStore creates a new theme for the target store", async () => {
  const Theme = {
    findById: async () => ({ ...mockTheme }),
    find: async () => [],
    findOne: async () => null,
  };
  const GlobalComponent = { find: async () => [] };
  const GlobalSection = { find: async () => [] };
  const Page = { find: async () => [] };
  const Section = { find: async () => [] };
  const Template = { find: async () => [] };
  const SavedBlock = { find: async () => [] };

  const ThemeService = require("./ThemeService");

  const originalModels = {
    Theme: require("./models/Theme"),
    GlobalComponent: require("./models/GlobalComponent"),
    GlobalSection: require("./models/GlobalSection"),
    Page: require("./models/Page"),
    Section: require("./models/Section"),
    Template: require("./models/Template.model"),
    SavedBlock: require("./models/SavedBlock.model"),
  };

  require.cache[require.resolve("./models/Theme")].exports = Theme;
  require.cache[require.resolve("./models/GlobalComponent")].exports = GlobalComponent;
  require.cache[require.resolve("./models/GlobalSection")].exports = GlobalSection;
  require.cache[require.resolve("./models/Page")].exports = Page;
  require.cache[require.resolve("./models/Section")].exports = Section;
  require.cache[require.resolve("./models/Template.model")].exports = Template;
  require.cache[require.resolve("./models/SavedBlock.model")].exports = SavedBlock;

  const freshService = require("./ThemeService");
  const result = await freshService.cloneThemeForStore("storeId", "sourceThemeId", "userId");

  assert.ok(result.theme);
  assert.equal(result.theme.storeId, "storeId");
  assert.equal(result.theme.name, "Source Theme (Copy)");
  assert.equal(result.theme.isActive, false);
  assert.equal(result.theme.isDraft, true);

  require.cache[require.resolve("./models/Theme")].exports = originalModels.Theme;
  require.cache[require.resolve("./models/GlobalComponent")].exports = originalModels.GlobalComponent;
  require.cache[require.resolve("./models/GlobalSection")].exports = originalModels.GlobalSection;
  require.cache[require.resolve("./models/Page")].exports = originalModels.Page;
  require.cache[require.resolve("./models/Section")].exports = originalModels.Section;
  require.cache[require.resolve("./models/Template.model")].exports = originalModels.Template;
  require.cache[require.resolve("./models/SavedBlock.model")].exports = originalModels.SavedBlock;
});

test("ThemeService.cloneThemeForStore throws when source theme not found", async () => {
  const Theme = { findById: async () => null };
  require.cache[require.resolve("./models/Theme")].exports = Theme;
  const freshService = require("./ThemeService");

  await assert.rejects(() => freshService.cloneThemeForStore("storeId", "badId"), /Source theme not found/);

  require.cache[require.resolve("./models/Theme")].exports = require("./models/Theme");
});

test("ThemeService.assignThemeToStore updates store.themeId", async () => {
  let savedStore = { _id: "storeId", themeId: null, save: async function () { savedStore.themeId = "themeId"; return this; } };
  const Store = {
    findById: async () => savedStore,
  };
  const Theme = {
    findById: async () => ({ _id: "themeId", storeId: "storeId" }),
  };

  const originalStore = require.cache[require.resolve("./models/Store")].exports;
  const originalTheme = require.cache[require.resolve("./models/Theme")].exports;
  require.cache[require.resolve("./models/Store")].exports = Store;
  require.cache[require.resolve("./models/Theme")].exports = Theme;

  const freshService = require("./ThemeService");
  const result = await freshService.assignThemeToStore("storeId", "themeId");
  assert.equal(result.themeId, "themeId");

  require.cache[require.resolve("./models/Store")].exports = originalStore;
  require.cache[require.resolve("./models/Theme")].exports = originalTheme;
});

test("ThemeService.assignThemeToStore throws when theme does not belong to store", async () => {
  const Store = { findById: async () => ({ _id: "storeId" }) };
  const Theme = { findById: async () => ({ _id: "themeId", storeId: "otherStore" }) };

  const originalStore = require.cache[require.resolve("./models/Store")].exports;
  const originalTheme = require.cache[require.resolve("./models/Theme")].exports;
  require.cache[require.resolve("./models/Store")].exports = Store;
  require.cache[require.resolve("./models/Theme")].exports = Theme;

  const freshService = require("./ThemeService");
  await assert.rejects(() => freshService.assignThemeToStore("storeId", "themeId"), /Theme does not belong to this store/);

  require.cache[require.resolve("./models/Store")].exports = originalStore;
  require.cache[require.resolve("./models/Theme")].exports = originalTheme;
});
