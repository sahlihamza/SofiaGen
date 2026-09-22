const mongoose = require("mongoose");
const Theme = require("../models/Theme");
const GlobalComponent = require("../models/GlobalComponent");
const GlobalSection = require("../models/GlobalSection");
const Page = require("../models/Page");
const Section = require("../models/Section");

class ThemeService {
  async cloneThemeForStore(storeId, sourceThemeId, userId = null) {
    if (!storeId || !sourceThemeId) {
      throw new Error("storeId and sourceThemeId are required");
    }

    const sourceTheme = await Theme.findById(sourceThemeId);
    if (!sourceTheme) {
      throw new Error("Source theme not found");
    }

    const sourceThemeObjectId = new mongoose.Types.ObjectId(sourceThemeId);

    const newTheme = new Theme({
      name: `${sourceTheme.name} (Copy)`,
      slug: `${sourceTheme.slug || "theme"}-copy-${Date.now()}`,
      description: sourceTheme.description,
      storeId,
      colors: sourceTheme.colors,
      fonts: sourceTheme.fonts,
      spacing: sourceTheme.spacing,
      radius: sourceTheme.radius,
      shadows: sourceTheme.shadows,
      breakpoints: sourceTheme.breakpoints,
      typography: sourceTheme.typography,
      settings: sourceTheme.settings,
      thumbnail: sourceTheme.thumbnail,
      version: sourceTheme.version,
      isActive: false,
      isDraft: true,
      createdBy: userId,
    });
    await newTheme.save();

    const newThemeId = newTheme._id;

    const globalComponentIdMap = new Map();
    const originalGlobalComponents = await GlobalComponent.find({ themeId: sourceThemeObjectId });
    for (const gc of originalGlobalComponents) {
      const newGc = new GlobalComponent({
        name: gc.name,
        storeId,
        themeId: newThemeId,
        type: gc.type,
        componentData: gc.componentData,
        html: gc.html,
        css: gc.css,
        createdBy: userId,
        updatedBy: userId,
      });
      await newGc.save();
      globalComponentIdMap.set(gc._id.toString(), newGc._id);
    }

    const globalSectionIdMap = new Map();
    const originalGlobalSections = await GlobalSection.find({ themeId: sourceThemeObjectId });
    for (const gs of originalGlobalSections) {
      const newGs = new GlobalSection({
        storeId,
        themeId: newThemeId,
        type: gs.type,
        projectData: gs.projectData,
        compiledHtml: gs.compiledHtml,
        compiledCss: gs.compiledCss,
        cookieSettings: gs.cookieSettings,
        updatedBy: userId,
      });
      await newGs.save();
      globalSectionIdMap.set(gs._id.toString(), newGs._id);
    }

    const originalPages = await Page.find({ themeId: sourceThemeObjectId });
    for (const p of originalPages) {
      const newPage = new Page({
        title: p.title,
        slug: p.slug + "-copy-" + Date.now(),
        urlSlug: (p.urlSlug || p.slug) + "-copy-" + Date.now(),
        storeId,
        themeId: newThemeId,
        projectData: p.projectData,
        components: p.components,
        compiledHtml: p.compiledHtml,
        compiledCss: p.compiledCss,
        renderedHtml: p.renderedHtml,
        renderedCss: p.renderedCss,
        seo: p.seo,
        isHome: false,
        isPublished: false,
        isDraft: true,
        pageType: p.pageType,
        linkedProductId: p.linkedProductId,
        displayOrder: p.displayOrder,
        isVisible: p.isVisible,
        createdBy: userId,
      });
      await newPage.save();

      const originalSections = await Section.find({ pageId: p._id });
      const newSectionIds = [];
      for (const s of originalSections) {
        const newSection = new Section({
          name: s.name,
          type: s.type,
          pageId: newPage._id,
          storeId,
          componentData: s.componentData,
          html: s.html,
          css: s.css,
          settings: s.settings,
          displayOrder: s.displayOrder,
          isVisible: s.isVisible,
          globalComponentId: s.globalComponentId
            ? globalComponentIdMap.get(s.globalComponentId.toString()) || null
            : null,
          overrides: s.overrides || {},
          createdBy: userId,
          updatedBy: userId,
        });
        await newSection.save();
        newSectionIds.push(newSection._id);
      }

      if (newSectionIds.length > 0) {
        newPage.sections = newSectionIds;
        await newPage.save();
      }
    }

    return {
      theme: newTheme,
      globalComponents: globalComponentIdMap.size,
      globalSections: globalSectionIdMap.size,
    };
  }

  async assignThemeToStore(storeId, themeId) {
    if (!storeId || !themeId) {
      throw new Error("storeId and themeId are required");
    }

    const theme = await Theme.findById(themeId);
    if (!theme) {
      throw new Error("Theme not found");
    }

    if (theme.storeId.toString() !== storeId.toString()) {
      throw new Error("Theme does not belong to this store");
    }

    const store = await Store.findById(storeId);
    if (!store) {
      throw new Error("Store not found");
    }

    store.themeId = themeId;
    await store.save();

    return store;
  }

  async listAvailableThemesForStore(storeId) {
    if (!storeId) {
      throw new Error("storeId is required");
    }

    const themes = await Theme.find({ storeId }).sort({ createdAt: -1 }).lean();
    return themes;
  }
}

const Store = require("../models/Store");

module.exports = new ThemeService();
