const Page = require("../models/Page");
const Template = require("../models/Template.model");
const Section = require("../models/Section");
const GlobalSection = require("../models/GlobalSection");
const Menu = require("../models/Menu");
const GlobalComponent = require("../models/GlobalComponent");

class PageProvisioningService {
  async seedDefaultPagesForStore(storeId, themeId) {
    if (!storeId || !themeId) {
      throw new Error("storeId and themeId are required");
    }

    const defaults = [
      { title: "Home", slug: "home", urlSlug: "/", pageType: "home", isHome: true, isPublished: false },
      { title: "Product", slug: "product", urlSlug: "product", pageType: "product", isHome: false, isPublished: false },
      { title: "Category", slug: "category", urlSlug: "category", pageType: "category", isHome: false, isPublished: false },
      { title: "Cart", slug: "cart", urlSlug: "cart", pageType: "cart", isHome: false, isPublished: false },
      { title: "Checkout", slug: "checkout", urlSlug: "checkout", pageType: "checkout", isHome: false, isPublished: false },
    ];

    const createdPages = [];
    for (const pageDef of defaults) {
      const existing = await Page.findOne({ storeId, urlSlug: pageDef.urlSlug });
      if (existing) {
        createdPages.push(existing);
        continue;
      }

      const page = new Page({
        title: pageDef.title,
        slug: pageDef.slug,
        urlSlug: pageDef.urlSlug,
        storeId,
        themeId,
        pageType: pageDef.pageType,
        isHome: pageDef.isHome,
        isPublished: pageDef.isPublished,
        isDraft: !pageDef.isPublished,
        components: {},
      });
      await page.save();
      createdPages.push(page);
    }

    return createdPages;
  }

  async assignTemplateToPage(pageId, templateType) {
    if (!pageId) {
      throw new Error("pageId is required");
    }

    const page = await Page.findById(pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const validTypes = ["home", "product", "category", "cart", "checkout"];
    const normalizedType = typeof templateType === "string" ? templateType.toLowerCase() : null;

    if (normalizedType && !validTypes.includes(normalizedType)) {
      throw new Error(`Invalid templateType. Must be one of: ${validTypes.join(", ")}`);
    }

    if (normalizedType) {
      page.pageType = normalizedType;

      if (normalizedType === "home") {
        page.isHome = true;
        page.slug = "/";
        page.urlSlug = "/";
      } else {
        page.isHome = false;
        page.slug = normalizedType;
        page.urlSlug = normalizedType;
      }
    }

    await page.save();
    return page;
  }

  async seedDefaultMenuForStore(storeId, pages) {
    if (!storeId) {
      throw new Error("storeId is required");
    }

    const pagesArray = Array.isArray(pages) ? pages : [];
    const homePage = pagesArray.find((p) => p.pageType === "home") || pagesArray[0];

    const items = [];

    if (homePage) {
      items.push({
        label: "Accueil",
        linkType: "page",
        pageId: homePage._id,
        url: "",
        openInNewTab: false,
        displayOrder: 0,
        displayMode: "dropdown",
        megaColumns: 1,
        children: [],
      });
    }

    const shopPage = pagesArray.find((p) => p.pageType === "product") || pagesArray.find((p) => p.pageType === "category");
    if (shopPage) {
      items.push({
        label: "Boutique",
        linkType: "page",
        pageId: shopPage._id,
        url: "",
        openInNewTab: false,
        displayOrder: 1,
        displayMode: "dropdown",
        megaColumns: 1,
        children: [],
      });
    }

    const aboutPage = pagesArray.find((p) => p.pageType === "about");
    if (aboutPage) {
      items.push({
        label: "à propos",
        linkType: "page",
        pageId: aboutPage._id,
        url: "",
        openInNewTab: false,
        displayOrder: 2,
        displayMode: "dropdown",
        megaColumns: 1,
        children: [],
      });
    }

    if (items.length === 0) {
      return null;
    }

    const menu = new Menu({
      storeId,
      name: "Main Menu",
      location: "header",
      items,
      isActive: true,
    });

    await menu.save();
    return menu;
  }

  async seedDefaultGlobalComponentsForStore(storeId, themeId) {
    if (!storeId || !themeId) {
      throw new Error("storeId and themeId are required");
    }

    const existingHeader = await GlobalSection.findOne({ storeId, themeId, type: "header" });
    if (!existingHeader) {
      await GlobalSection.create({
        storeId,
        themeId,
        type: "header",
        projectData: null,
        compiledHtml: "",
        compiledCss: "",
      });
    }

    const existingFooter = await GlobalSection.findOne({ storeId, themeId, type: "footer" });
    if (!existingFooter) {
      await GlobalSection.create({
        storeId,
        themeId,
        type: "footer",
        projectData: null,
        compiledHtml: "",
        compiledCss: "",
      });
    }

    const existingAnnouncement = await GlobalSection.findOne({ storeId, themeId, type: "announcement_bar" });
    if (!existingAnnouncement) {
      await GlobalSection.create({
        storeId,
        themeId,
        type: "announcement_bar",
        projectData: null,
        compiledHtml: "",
        compiledCss: "",
      });
    }

    const existingCookie = await GlobalSection.findOne({ storeId, themeId, type: "cookie_banner" });
    if (!existingCookie) {
      await GlobalSection.create({
        storeId,
        themeId,
        type: "cookie_banner",
        projectData: null,
        compiledHtml: "",
        compiledCss: "",
        cookieSettings: {
          position: "bottom",
          showDeclineButton: true,
          linkToPolicyPageId: null,
        },
      });
    }
  }
}

module.exports = new PageProvisioningService();
