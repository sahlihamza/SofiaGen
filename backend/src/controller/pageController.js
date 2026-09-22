const express = require('express');
const router = express.Router();

const pageController = {
  createPage: (req, res) => res.status(501).json({ success: false, message: 'Page creation not implemented' }),
  getAllPages: (req, res) => res.status(501).json({ success: false, message: 'Page listing not implemented' }),
  getPageBySlug: (req, res) => res.status(501).json({ success: false, message: 'Page retrieval by slug not implemented' }),
  getPageById: (req, res) => res.status(501).json({ success: false, message: 'Page retrieval not implemented' }),
  saveDraft: (req, res) => res.status(501).json({ success: false, message: 'Page draft save not implemented' }),
  publishPage: (req, res) => res.status(501).json({ success: false, message: 'Page publish not implemented' }),
  unpublishPage: (req, res) => res.status(501).json({ success: false, message: 'Page unpublish not implemented' }),
  schedulePage: (req, res) => res.status(501).json({ success: false, message: 'Page schedule not implemented' }),
  cancelSchedule: (req, res) => res.status(501).json({ success: false, message: 'Page schedule cancel not implemented' }),
  updatePage: (req, res) => res.status(501).json({ success: false, message: 'Page update not implemented' }),
  duplicatePage: (req, res) => res.status(501).json({ success: false, message: 'Page duplication not implemented' }),
  setHomePage: (req, res) => res.status(501).json({ success: false, message: 'Set home page not implemented' }),
  deletePage: (req, res) => res.status(501).json({ success: false, message: 'Page delete not implemented' }),
  previewPage: (req, res) => res.status(501).json({ success: false, message: 'Page preview not implemented' }),
  getPageVersions: (req, res) => res.status(501).json({ success: false, message: 'Page versions not implemented' }),
  restoreVersion: (req, res) => res.status(501).json({ success: false, message: 'Version restore not implemented' }),
  compareVersions: (req, res) => res.status(501).json({ success: false, message: 'Version compare not implemented' }),
  getStorePages: (req, res) => res.status(501).json({ success: false, message: 'Store pages not implemented' }),
  createPageForStore: (req, res) => res.status(501).json({ success: false, message: 'Store page creation not implemented' }),
  getStorefrontPage: (req, res) => res.status(501).json({ success: false, message: 'Storefront page not implemented' }),
};

module.exports = pageController;
const Page = require("../models/Page");
const Section = require("../models/Section");
const Theme = require("../models/Theme");
const { hasFeature } = require("../service/EntitlementService");
const GlobalSection = require("../models/GlobalSection");
const Menu = require("../models/Menu");
const Template = require("../models/Template.model");
const SavedBlock = require("../models/SavedBlock.model");
const SyncedBlockUsage = require("../models/SyncedBlockUsage");
const { hasStoreAccess } = require("../middleware/auth");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const { settingsToCssVars } = require("../utils/themeCssVars");
const { renderProjectDataToHtml, renderProjectDataToCss } = require("../utils/renderProjectDataToHtml");
const { buildPopupTriggerScript } = require("../utils/popupTriggerScript");
const { buildCookieBannerScript } = require("../utils/cookieBannerScript");
const { buildScrollAnimationScript } = require("../utils/scrollAnimationScript");
const { buildClickEffectScript } = require("../utils/clickEffectScript");
const { buildParallaxScript } = require("../utils/parallaxScript");
const { buildCarouselScript } = require("../utils/carouselScript");
const { buildAccordionScript } = require("../utils/accordionScript");
const { buildSalesCountdownScript } = require("../utils/salesCountdownScript");
const { buildStickyAddToCartScript } = require("../utils/stickyAddToCartScript");
const { buildRecentlyViewedTrackerScript } = require("../utils/recentlyViewedScript");
const { buildFaqScript } = require("../utils/faqScript");
const { buildTabsScript } = require("../utils/tabsScript");
const { buildCounterScript } = require("../utils/counterScript");
const { buildProgressBarScript } = require("../utils/progressBarScript");
const { buildAnimatedHeadlineScript } = require("../utils/animatedHeadlineScript");
const { buildAlertScript } = require("../utils/alertScript");
const { buildProductQuickViewScript } = require("../utils/productQuickViewScript");
const { buildWishlistButtonScript } = require("../utils/wishlistButtonScript");
const { buildWishlistPageScript } = require("../utils/wishlistPageScript");
const { buildCartPageScript } = require("../utils/cartPageScript");
const { buildMiniCartScript } = require("../utils/miniCartScript");
const { buildProductTabsScript } = require("../utils/productTabsScript");
const { buildStorefrontScriptsBundle } = require("../utils/storefrontScriptsBundle");
const { renderMenuToNavHtml } = require("../utils/renderMenuToHtml");
const { resolveDynamicBindings } = require("../utils/resolveDynamicBindings");
const { resolveStockIndicator } = require("../utils/resolveStockIndicator");

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// SO-10: most of this file's mutating/listing endpoints had no store-access
// check at all  any authenticated user could create, edit, publish,
// unpublish, delete-adjacent, or read the version history of ANY store's
// pages, not just their own. This is the one shared check; every handler
// below now calls it against the target page's actual storeId, before any
// read/write of page content  never after, since checking after a write
// already lets the write through.
const assertStoreAccess = async (req, storeId) => {
  if (req.user?.isSuperAdmin) return true;
  const granted = await hasStoreAccess(req.user, storeId);
  return granted;
};

const generateUniqueSlug = (name) => {
  const baseSlug = (name || "default-theme")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 40);
  return `${baseSlug || "default-theme"}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const getDuplicateKeyMessage = (error) => {
  if (!error || error.code !== 11000) return null;
  const duplicateKey = error.keyValue || {};

  if (duplicateKey.urlSlug && duplicateKey.storeId) {
    return `Le slug "${duplicateKey.urlSlug}" est déjà utilisé pour cette boutique. Choisissez un autre slug.`;
  }
  if (duplicateKey.urlSlug) {
    return `Le slug "${duplicateKey.urlSlug}" est déjà utilisé. Choisissez un autre slug.`;
  }
  if (duplicateKey.storeId) {
    return `Une page existe déjà pour cette boutique avec les mêmes informations.`;
  }

  return "Une ressource identique existe déjà. Veuillez modifier le slug et réssayer.";
};

// ========== Page Controller ==========

/**
 * Create a new page
 * POST /api/pages
 */
const createPage = async (req, res) => {
  try {
    const { title, slug, description, storeId, themeId, pageType } = req.body;

    if (!title || !slug || !storeId || !themeId) {
      return res.status(400).json({
        message: "title, slug, storeId, and themeId are required",
      });
    }

    if (!(await assertStoreAccess(req, storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    // Check if slug already exists
    const existingPage = await Page.findOne({ urlSlug: slug, storeId });
    if (existingPage) {
      return res.status(400).json({
        message: "This URL slug already exists",
      });
    }

    const page = new Page({
      title,
      slug,
      description,
      storeId,
      themeId,
      pageType,
      urlSlug: slug.toLowerCase().replace(/\s+/g, "-"),
      createdBy: req.user?.id,
    });

    await page.save();

    res.status(201).json({
      success: true,
      message: "Page created successfully",
      data: page,
    });
  } catch (error) {
    console.error("createPageForStore error:", error);
    const duplicateMessage = getDuplicateKeyMessage(error);
    if (duplicateMessage) {
      return res.status(409).json({
        message: duplicateMessage,
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get all pages for a store
 * GET /api/pages?storeId=xxx&published=true
 */
const getAllPages = async (req, res) => {
  try {
    const { storeId, published, themeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        message: "storeId is required",
      });
    }

    if (!(await assertStoreAccess(req, storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    let filter = { storeId };

    if (published !== undefined) {
      filter.isPublished = published === "true";
    }

    if (themeId) {
      filter.themeId = themeId;
    }

    const pages = await Page.find(filter)
      .populate("themeId", "name slug")
      .sort({ createdAt: -1 })
      .select("-versions -__v");

    res.status(200).json({
      success: true,
      data: pages,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get page by ID
 * GET /api/pages/:id
 */
const GlobalComponent = require("../models/GlobalComponent");
const { mergeGlobalComponent } = require("../utils/mergeGlobalComponent");

const getPageById = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id)
      .populate("themeId", "name slug colors fonts")
      .populate({ path: "sections" });

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
    }

    // Merge globals into section.componentData for admin/editor responses
    if (page.sections && page.sections.length > 0) {
      const globalIds = [
        ...new Set(
          page.sections
            .map((s) => s?.globalComponentId)
            .filter(Boolean)
        ),
      ];

      let globalComponents = [];
      if (globalIds.length > 0) {
        globalComponents = await GlobalComponent.find({ _id: { $in: globalIds } }).lean();
      }

      const globalById = new Map(globalComponents.map((g) => [String(g._id), g]));

      for (let i = 0; i < page.sections.length; i++) {
        const s = page.sections[i];
        if (s && s.globalComponentId) {
          const gc = globalById.get(String(s.globalComponentId));
          if (gc) {
            s.componentData = mergeGlobalComponent(s, gc);
            s.isGlobal = true;
            s.globalComponentMeta = { _id: gc._id, name: gc.name, type: gc.type };
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get page by slug (for frontend)
 * GET /api/pages/slug/:slug?storeId=xxx
 */
const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        message: "storeId is required",
      });
    }

    const page = await Page.findOne({
      urlSlug: slug,
      storeId,
      isPublished: true,
      isVisible: true,
    })
      .populate("themeId", "name slug colors fonts")
      .populate({
        path: "sections",
        options: { sort: { displayOrder: 1 } },
      });

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Save page draft
 * POST /api/pages/:id/draft
 */
const saveDraft = async (req, res) => {
  try {
    const { title, description, components, projectData, metaDescription, metaKeywords, compiledHtml, compiledCss } = req.body;

    let page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    // Save current content into the version history before updating draft state.
    await saveSnapshot(page, req.user?.id);

    // Update page with new content
    page.title = title || page.title;
    page.description = description || page.description;
    if (projectData !== undefined) page.projectData = projectData;
    if (compiledHtml !== undefined) page.compiledHtml = compiledHtml;
    if (compiledCss !== undefined) page.compiledCss = compiledCss;
    page.components = components || page.components;
    page.metaDescription = metaDescription || page.metaDescription;
    page.metaKeywords = metaKeywords || page.metaKeywords;
    page.isDraft = true;
    page.updatedBy = req.user?.id;

    await page.save();
    await updateSyncedBlockUsageForPage(page._id, page.projectData);

    res.status(200).json({
      success: true,
      message: "Page draft saved successfully",
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const saveSnapshot = async (page, userId) => {
  const lastVersion = page.versions[page.versions.length - 1];
  const nextNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  page.versions.push({
    versionNumber: nextNumber,
    projectData: page.projectData,
    components: page.components,
    createdAt: new Date(),
    createdBy: userId || page.updatedBy,
  });

  if (page.versions.length > 50) {
    page.versions = page.versions.slice(-50);
  }
};

/**
 * Fetch all active GlobalSections (header, footer, announcement_bar) for a given
 * storeId+themeId in a SINGLE query. Returns a map keyed by type.
 * Also exposes the most-recent updatedAt across all sections for cache invalidation.
 */
const fetchGlobalSections = async (storeId, themeId) => {
  if (!storeId || !themeId) return { sections: {}, globalUpdatedAt: null };
  const docs = await GlobalSection.find({ storeId, themeId }).select(
    "type compiledHtml compiledCss projectData cookieSettings updatedAt"
  ).lean();

  const sections = {};
  let globalUpdatedAt = null;
  for (const doc of docs) {
    sections[doc.type] = doc;
    if (!globalUpdatedAt || doc.updatedAt > globalUpdatedAt) {
      globalUpdatedAt = doc.updatedAt;
    }
  }
  return { sections, globalUpdatedAt };
};

const fetchMenus = async (storeId) => {
  if (!storeId) return {};
  const docs = await Menu.find({ storeId, isActive: true })
    .populate("items.pageId", "urlSlug slug")
    .populate("items.categoryId", "slug")
    .populate("items.productId", "slug")
    .lean();
  const byLocation = {};
  for (const doc of docs) byLocation[doc.location] = doc;
  return byLocation;
};

const extractSyncedBlockUsages = (projectData) => {
  const usages = [];
  let unknownIndex = 0;

  const walk = (node) => {
    if (!node || typeof node !== "object") return;

    if (node.attributes && node.attributes["data-synced-block-id"]) {
      const savedBlockId = node.attributes["data-synced-block-id"];
      let componentId = node.id || node.attributes["data-component-id"] || node.attributes.id || null;
      if (!componentId) {
        componentId = `__unknown_synced_${savedBlockId}_${unknownIndex++}`;
      }
      usages.push({ savedBlockId, componentId });
    }

    for (const key of Object.keys(node)) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === "object") {
        walk(value);
      }
    }
  };

  walk(projectData);
  return usages;
};

const updateSyncedBlockUsageForPage = async (pageId, projectData) => {
  if (!pageId) return;
  const usages = extractSyncedBlockUsages(projectData || {});
  await SyncedBlockUsage.deleteMany({ pageId });
  if (usages.length === 0) return;
  const toInsert = usages.map((usage) => ({
    pageId,
    savedBlockId: usage.savedBlockId,
    componentId: usage.componentId,
  }));
  await SyncedBlockUsage.insertMany(toInsert);
};

const renderSavedBlockHtml = (componentJson) => {
  if (!componentJson) return "";
  if (typeof componentJson === "string") return componentJson;
  return renderProjectDataToHtml({
    pages: [
      {
        frames: [
          {
            component: {
              type: "wrapper",
              components: [componentJson],
            },
          },
        ],
      },
    ],
  });
};

const applySyncedBlocksToHtml = async (pageId, html) => {
  if (!pageId || !html) return html;
  const usages = await SyncedBlockUsage.find({ pageId }).lean();
  if (!usages || usages.length === 0) return html;

  const savedBlockIds = [...new Set(usages.map((u) => u.savedBlockId.toString()))];
  const savedBlocks = await SavedBlock.find({ _id: { $in: savedBlockIds } }).lean();
  if (!savedBlocks || savedBlocks.length === 0) return html;

  const savedBlockMap = new Map(savedBlocks.map((block) => [block._id.toString(), block]));
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`);
  const document = dom.window.document;
  const nodes = Array.from(document.querySelectorAll("[data-synced-block-id]"));

  nodes.forEach((node) => {
    const savedBlockId = node.getAttribute("data-synced-block-id");
    const savedBlock = savedBlockMap.get(savedBlockId);
    if (!savedBlock) return;

    const replacementHtml = renderSavedBlockHtml(savedBlock.componentJson);
    if (!replacementHtml) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = DOMPurify.sanitize(replacementHtml, {
      ALLOWED_TAGS: [
        "div", "span", "p", "br", "hr", "pre", "code",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "dl", "dt", "dd",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "a", "img", "video", "audio", "source", "track",
        "form", "input", "button", "select", "option", "textarea", "label",
        "section", "article", "header", "footer", "nav", "aside", "main",
        "figure", "figcaption",
        "strong", "em", "b", "i", "u", "s", "small", "sub", "sup",
        "blockquote", "q", "cite", "abbr", "time",
        "style",
        "template", "slot",
        "svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "use", "symbol", "text", "tspan", "foreignObject", "image",
      ],
      ALLOWED_ATTR: [
        "href", "src", "alt", "title", "class", "id", "name", "value",
        "type", "placeholder", "disabled", "readonly", "required", "checked",
        "data-*", "aria-*", "role",
        "style", "width", "height", "srcset", "sizes", "loading",
        "target", "rel", "download",
        "colspan", "rowspan", "scope",
        "start", "reversed",
        "open", "selected",
        "formaction", "formenctype", "formmethod", "formnovalidate", "formtarget",
        "list", "max", "maxlength", "min", "minlength", "multiple", "pattern", "size", "step",
        "accept", "accept-charset", "enctype", "method", "action",
        "viewBox", "preserveAspectRatio", "d", "fill", "stroke", "stroke-width", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "points", "transform",
      ],
      ALLOW_DATA_ATTR: true,
      ALLOW_ARIA_ATTR: true,
    });
    const replacementNodes = Array.from(wrapper.childNodes);
    if (replacementNodes.length === 0) return;
    node.replaceWith(...replacementNodes);
  });

  return document.body.innerHTML;
};

const generateRenderedPage = async (page, prefetchedSections = null, prefetchedMenus = null, contextParams = {}) => {
  if (!page.projectData) {
    return { renderedHtml: null, renderedCss: null };
  }

  // 1. Resolve themeId and themeSettings
  let themeId = page.themeId?._id || page.themeId;
  let themeSettings = page.themeId?.settings;
  if (!themeSettings && themeId) {
    const theme = await Theme.findById(themeId).select("settings");
    themeSettings = theme?.settings || {};
  }
  const storeId = page.storeId;

  // 2. Use pre-fetched sections if available, otherwise fetch once from DB
  const sections = prefetchedSections || (await fetchGlobalSections(storeId, themeId)).sections;
  const menus = prefetchedMenus || (await fetchMenus(storeId));

  const header       = sections["header"];
  const footer       = sections["footer"];
  const announcementBar = sections["announcement_bar"];

  // 3. Render each section  GlobalSection stores compiledHtml/compiledCss directly
  //    If compiledHtml is missing fall back to rendering its projectData on the fly.
  const resolveHtml = (sec, menuForSection) => {
    if (!sec) return "";
    let html = sec.compiledHtml || (sec.projectData ? renderProjectDataToHtml(sec.projectData) : "");
    if (menuForSection && html) {
      const navHtml = renderMenuToNavHtml(menuForSection);
      if (navHtml) {
        html = html.replace(
          /(<nav[^>]*class="[^"]*(header-nav|footer-nav)[^"]*"[^>]*>)([\s\S]*?)(<\/nav>)/,
          `$1${navHtml}$4`
        );
      }
    }
    return html;
  };
  const resolveCss = (sec) => {
    if (!sec) return "";
    if (sec.compiledCss) return sec.compiledCss;
    if (sec.projectData) return renderProjectDataToCss(sec.projectData);
    return "";
  };

  const headerHtml       = resolveHtml(header, menus["header"]);
  const footerHtml       = resolveHtml(footer, menus["footer"]);
  const announcementHtml = resolveHtml(announcementBar);

    const cookieBanner = sections["cookie_banner"];
    const cookieHtml = resolveHtml(cookieBanner);

  const headerCss        = resolveCss(header);
  const footerCss        = resolveCss(footer);
  const announcementCss  = resolveCss(announcementBar);

  const cookieCss = resolveCss(cookieBanner);

  // 4. Render the page body
  let pageBodyHtml = renderProjectDataToHtml(page.projectData, {
    product: contextParams?.product ? contextParams.product : null,
  });
  pageBodyHtml = await applySyncedBlocksToHtml(page._id, pageBodyHtml);
  // Resolve dynamic bindings (scalars for now) in page body and global sections
  try {
    pageBodyHtml = await resolveDynamicBindings(pageBodyHtml, storeId, contextParams);
  } catch (e) {
    console.error("Failed to resolve dynamic bindings for page body:", e.message);
  }
  // Resolve stock indicators
  try {
    pageBodyHtml = await resolveStockIndicator(pageBodyHtml, storeId, contextParams);
  } catch (e) {
    console.error("Failed to resolve stock indicator:", e.message);
  }
  const pageBodyCss  = renderProjectDataToCss(page.projectData);
  // 4b. Fetch active popups
  let popupsHtml = "";
  let popupsCss = "";
  try {
    const popups = await Template.find({ storeId: page.storeId, type: "popup", isActive: true }).lean();
    if (popups.length > 0) {
      popupsHtml = popups.map(p => {
        const trigger = p.popupSettings?.trigger || "page-load";
        const triggerVal = p.popupSettings?.triggerValue || 0;
        const frequency = p.popupSettings?.frequency || "once-per-session";
        const popupInnerHtml = p.compiledHtml || renderProjectDataToHtml(p.projectData, {
          product: contextParams?.product ? contextParams.product : null,
        });
        return `<div class="popup-container" data-popup-id="${p._id}" data-trigger="${trigger}" data-trigger-value="${triggerVal}" data-frequency="${frequency}" style="display:none"><button data-popup-close type="button"></button>${popupInnerHtml}</div>`;
      }).join("\n");
      popupsCss = popups.map(p => p.compiledCss || renderProjectDataToCss(p.projectData)).join("\n");
    }
  } catch (err) {
    console.error("Failed to fetch popups", err);
  }

  // 5. Assemble: announcement + header + <main>body</main> + footer + popups + scripts
  const productIdMarker = contextParams?.productId ? `<div data-current-product-id="${contextParams.productId}" style="display:none"></div>` : "";
  const htmlContent = [
    productIdMarker,
    announcementHtml && `<div data-global-section="announcement_bar">${announcementHtml}</div>`,
    headerHtml       && `<header data-global-section="header">${headerHtml}</header>`,
    `<main data-store-id="${storeId}">${pageBodyHtml}</main>`,
    footerHtml       && `<footer data-global-section="footer">${footerHtml}</footer>`,
    cookieHtml       && `<div class="cookie-banner-container" data-global-section="cookie_banner">${cookieHtml}</div>`,
    popupsHtml,
  ].filter(Boolean).join("\n");

  const renderedHtml = [
    ...htmlContent.split("\n"),
    buildStorefrontScriptsBundle({
      includeAccordion: htmlContent.includes("accordion-component"),
      includeTabs: htmlContent.includes("tabs-component"),
      includePopup: Boolean(popupsHtml),
      includeContactForm: htmlContent.includes("contact-form"),
      includeCookieBanner: Boolean(cookieBanner && cookieBanner.cookieSettings && cookieHtml),
      includeScrollAnimation: true,
    }),
    htmlContent.includes("carousel-pro-component") ? buildCarouselScript() : "",
  ].filter(Boolean).join("\n");

  // 6. Assemble CSS: theme vars first, then global sections, then page, then popups
  const renderedCss = [
    settingsToCssVars(themeSettings || {}),
    announcementCss,
    cookieCss,
    headerCss,
    pageBodyCss,
    footerCss,
    popupsCss,
  ].filter(Boolean).join("\n").trim();

  return { renderedHtml, renderedCss };
};

const ensureRenderedPage = async (page, contextParams = {}) => {
  // Base staleness: page itself was modified after last render
  const pageStale = !page.renderedAt || page.updatedAt > page.renderedAt;

  // Resolve themeId for the global section query
  let themeId = page.themeId?._id || page.themeId;
  const storeId = page.storeId;

  // Fetch global sections once  reused both for staleness check AND rendering
  const { sections, globalUpdatedAt } = await fetchGlobalSections(storeId, themeId);
  const menus = await fetchMenus(storeId);
  const menuUpdatedAt = Object.values(menus).reduce(
    (latest, m) => (!latest || m.updatedAt > latest ? m.updatedAt : latest),
    null
  );
  const effectiveGlobalUpdatedAt = [globalUpdatedAt, menuUpdatedAt].filter(Boolean).sort().pop() || null;

  // Additional staleness: any global section (header/footer/bar) or menu was modified after last render
  const globalStale = effectiveGlobalUpdatedAt && (!page.renderedAt || effectiveGlobalUpdatedAt > page.renderedAt);

  const staleRender = pageStale || globalStale;

  if (page.isPublished && staleRender) {
    // Pass pre-fetched sections and menus into generateRenderedPage to avoid a second DB round-trip
    // by temporarily attaching them to the page object
    const { renderedHtml, renderedCss } = await generateRenderedPage(page, sections, menus, contextParams);
    
    // Use updateOne to avoid changing the page's updatedAt timestamp
    // just because its cache was regenerated due to a global header change.
    const now = new Date();
    await Page.collection.updateOne(
      { _id: page._id },
      { $set: { renderedHtml, renderedCss, renderedAt: now } }
    );
    
    // Update local object for the current request
    page.renderedHtml = renderedHtml;
    page.renderedCss  = renderedCss;
    page.renderedAt   = now;
  }
};

/**
 * Publish page
 * POST /api/pages/:id/publish
 */
const publishPage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id).populate("themeId");

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const { renderedHtml, renderedCss } = await generateRenderedPage(page);

    page.isPublished = true;
    page.isDraft = false;
    page.publishedAt = new Date();
    page.publishedBy = req.user?.id;
    page.updatedBy = req.user?.id;
    page.renderedHtml = renderedHtml;
    page.renderedCss = renderedCss;
    page.renderedAt = new Date();

    await page.save();

    res.status(200).json({
      success: true,
      message: "Page published successfully",
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getStorefrontPage = async (req, res) => {
  try {
    const { storeId, urlSlug } = req.params;

    if (!storeId || !urlSlug) {
      return res.status(400).json({
        message: "storeId and urlSlug are required",
      });
    }

    const page = await Page.findOne({
      storeId,
      urlSlug,
      isPublished: true,
      isVisible: true,
    }).populate("themeId");

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    const contextParams = {};
    if (page.pageType === "product") {
      if (page.linkedProductId) {
        contextParams.productId = page.linkedProductId;
      } else {
        const Product = require("../models/Product");
        const product = await Product.findOne({ storeId, slug: urlSlug }).select("_id").lean();
        if (product) {
          contextParams.productId = product._id;
        }
      }
    }

    await ensureRenderedPage(page, contextParams);

    if (!page.renderedHtml) {
      return res.status(500).json({
        message: "Rendered HTML is not available for this page",
      });
    }

    const sanitizedHtml = DOMPurify.sanitize(page.renderedHtml, {
      ALLOWED_TAGS: [
        "html", "head", "body", "div", "span", "p", "br", "hr", "pre", "code",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "dl", "dt", "dd",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "a", "img", "video", "audio", "source", "track",
        "form", "input", "button", "select", "option", "textarea", "label",
        "section", "article", "header", "footer", "nav", "aside", "main",
        "figure", "figcaption",
        "strong", "em", "b", "i", "u", "s", "small", "sub", "sup",
        "blockquote", "q", "cite", "abbr", "time",
        "style", "script",
        "template", "slot",
        "svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "use", "symbol", "text", "tspan", "foreignObject", "image",
      ],
      ALLOWED_ATTR: [
        "href", "src", "alt", "title", "class", "id", "name", "value",
        "type", "placeholder", "disabled", "readonly", "required", "checked",
        "data-*", "aria-*", "role",
        "style", "width", "height", "srcset", "sizes", "loading",
        "target", "rel", "download",
        "colspan", "rowspan", "scope",
        "start", "reversed",
        "open", "selected",
        "formaction", "formenctype", "formmethod", "formnovalidate", "formtarget",
        "list", "max", "maxlength", "min", "minlength", "multiple", "pattern", "size", "step",
        "accept", "accept-charset", "enctype", "method", "action",
        "viewBox", "preserveAspectRatio", "d", "fill", "stroke", "stroke-width", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "points", "transform",
      ],
      ALLOW_DATA_ATTR: true,
      ALLOW_ARIA_ATTR: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        html: sanitizedHtml,
        css: page.renderedCss,
        renderedAt: page.renderedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Unpublish page
 * POST /api/pages/:id/unpublish
 */
const unpublishPage = async (req, res) => {
  try {
    const existing = await Page.findById(req.params.id).select("storeId");
    if (!existing) {
      return res.status(404).json({ message: "Page not found" });
    }
    if (!(await assertStoreAccess(req, existing.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const page = await Page.findByIdAndUpdate(
      req.params.id,
      {
        isPublished: false,
        isDraft: true,
        updatedBy: req.user?.id,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Page unpublished successfully",
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Schedule page
 * POST /api/pages/:id/schedule
 */
const schedulePage = async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }
    
    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({ message: "La date doit être dans le futur" });
    }

    const existing = await Page.findById(req.params.id).select("storeId");
    if (!existing) {
      return res.status(404).json({ message: "Page not found" });
    }
    if (!(await assertStoreAccess(req, existing.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const page = await Page.findByIdAndUpdate(
      req.params.id,
      {
        scheduledAt: scheduleDate,
        scheduleStatus: "scheduled",
        updatedBy: req.user?.id,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Page scheduled successfully",
      data: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cancel page schedule
 * POST /api/pages/:id/schedule/cancel
 */
const cancelSchedule = async (req, res) => {
  try {
    const existing = await Page.findById(req.params.id).select("storeId");
    if (!existing) {
      return res.status(404).json({ message: "Page not found" });
    }
    if (!(await assertStoreAccess(req, existing.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const page = await Page.findByIdAndUpdate(
      req.params.id,
      {
        scheduledAt: null,
        scheduleStatus: "none",
        updatedBy: req.user?.id,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Schedule cancelled successfully",
      data: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update page metadata
 * PUT /api/pages/:id
 */
const updatePage = async (req, res) => {
  try {
    const { title, slug, description, metaDescription, metaKeywords, displayOrder, isVisible, isPublished, projectData, compiledHtml, compiledCss, seo } =
      req.body;

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
    }

    // THEME-02: this endpoint is shared by the Level 1 "Pages" screen
    // (title/SEO/visibility only) and the Level 2 GrapesJS canvas
    // (projectData/compiledHtml/compiledCss). Only the latter requires the
    // "builder" Plan feature  a Level 1 Store Owner editing SEO must not
    // be blocked, but they must never be able to smuggle canvas content
    // through this same route just because it's not saveDraft.
    if (projectData !== undefined || compiledHtml !== undefined || compiledCss !== undefined) {
      if (!req.user?.isSuperAdmin && !(await hasFeature(String(page.storeId), "builder"))) {
        return res.status(403).json({
          success: false,
          code: "FEATURE_NOT_INCLUDED",
          feature: "builder",
          message: "Cette fonctionnalité n'est pas incluse dans votre plan (builder)",
        });
      }
    }

    if (projectData !== undefined) {
      await saveSnapshot(page, req.user?.id);
      page.projectData = projectData;
    }

    if (compiledHtml !== undefined) page.compiledHtml = compiledHtml;
    if (compiledCss !== undefined) page.compiledCss = compiledCss;
    if (title !== undefined) page.title = title;
    if (slug !== undefined) page.slug = slug;
    if (description !== undefined) page.description = description;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    if (metaKeywords !== undefined) page.metaKeywords = metaKeywords;
    if (displayOrder !== undefined) page.displayOrder = displayOrder;
    if (isVisible !== undefined) page.isVisible = isVisible;
    if (isPublished !== undefined) {
      page.isPublished = isPublished;
      page.isDraft = !isPublished;
    }
    // Merge SEO object if provided  partial update without overwriting other keys
    if (seo !== undefined) {
      page.seo = Object.assign({}, page.seo || {}, seo || {});
      // Ensure mongoose notices changes on Mixed/POJO fields
      if (typeof page.markModified === "function") page.markModified("seo");
    }
    page.updatedBy = req.user?.id;

    await page.save();
    if (projectData !== undefined) {
      await updateSyncedBlockUsageForPage(page._id, page.projectData);
    }

    res.status(200).json({
      success: true,
      message: "Page updated successfully",
      data: page,
    });
  } catch (error) {
    const duplicateMessage = getDuplicateKeyMessage(error);
    if (duplicateMessage) {
      return res.status(409).json({
        message: duplicateMessage,
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Delete page
 * DELETE /api/pages/:id
 */
const deletePage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
    }

    // Delete all sections associated with this page
    await Section.deleteMany({ pageId: page._id });

    await SyncedBlockUsage.deleteMany({ pageId: page._id });
    await Page.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get page versions
 * GET /api/pages/:id/versions
 */
const getPageVersions = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id).select("versions storeId");

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const summary = page.versions.map((v) => ({
      versionNumber: v.versionNumber,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    }));

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Restore page version
 * POST /api/pages/:id/versions/:versionNumber/restore
 */
const restoreVersion = async (req, res) => {
  try {
    const versionNumber = Number(req.params.versionNumber);

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const target = page.versions.find((v) => v.versionNumber === versionNumber);

    if (!target) {
      return res.status(404).json({
        message: "Version not found",
      });
    }

    await saveSnapshot(page, req.user?.id);

    page.projectData = target.projectData;
    page.components = target.components;
    page.updatedBy = req.user?.id;

    await page.save();

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Compare two page versions
 * GET /api/pages/:id/versions/compare?from=X&to=Y
 */
const compareVersions = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromNum = Number(from);
    const toNum = Number(to);

    if (!fromNum || !toNum) {
      return res.status(400).json({ message: "Paramètres 'from' et 'to' requis" });
    }

    const page = await Page.findById(req.params.id).select("versions storeId");
    if (!page) return res.status(404).json({ message: "Page not found" });

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const fromVersion = page.versions.find((v) => v.versionNumber === fromNum);
    const toVersion = page.versions.find((v) => v.versionNumber === toNum);

    if (!fromVersion || !toVersion) {
      return res.status(404).json({ message: "Une des versions demandés est introuvable" });
    }

    const { renderProjectDataToHtml } = require("../utils/renderProjectDataToHtml");
    const fromHtml = renderProjectDataToHtml(fromVersion.projectData);
    const toHtml = renderProjectDataToHtml(toVersion.projectData);

    res.status(200).json({
      success: true,
      data: {
        from: { versionNumber: fromNum, createdAt: fromVersion.createdAt, html: fromHtml },
        to: { versionNumber: toNum, createdAt: toVersion.createdAt, html: toHtml },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStorePages = async (req, res) => {
  try {
    // Public storefront read (see the route comment in themeRoutes.js)  no
    // req.user to check against here. Scoping to isPublished is the actual
    // fix: this used to hand back every draft too, not just this store's
    // own unrelated data.
    const { storeId } = req.params;
    const pages = await Page.find({ storeId, isPublished: true }).sort({ displayOrder: 1 });
    res.status(200).json(pages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const createPageForStore = async (req, res) => {
  try {
    const { storeId } = req.params;
      const { name, slug, projectData, themeId, compiledHtml, compiledCss } = req.body;

      console.debug("createPageForStore request body:", { storeId, name, slug, themeId, compiledHtml: Boolean(compiledHtml), compiledCss: Boolean(compiledCss) });

    if (!name) {
      return res.status(400).json({
        message: "name is required to create a page",
      });
    }

    if (!(await assertStoreAccess(req, storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    // THEME-02: same Level 1/Level 2 split as updatePage  a plain "name
    // only" create (Level 1 Pages screen) is fine, but creating a page
    // pre-filled with canvas content (the "create from template" flow
    // inside the builder) requires the "builder" Plan feature.
    if ((projectData !== undefined || compiledHtml !== undefined || compiledCss !== undefined) &&
        !req.user?.isSuperAdmin && !(await hasFeature(String(storeId), "builder"))) {
      return res.status(403).json({
        success: false,
        code: "FEATURE_NOT_INCLUDED",
        feature: "builder",
        message: "Cette fonctionnalité n'est pas incluse dans votre plan (builder)",
      });
    }

    let theme;
    if (themeId) {
      theme = await Theme.findById(themeId);
    }
    
    if (!theme) {
      // Find the active theme
      theme = await Theme.findOne({ storeId, isActive: true });
    }
    if (!theme) {
      theme = await Theme.findOne({ storeId });
      if (!theme) {
        theme = new Theme({
          name: "Default Theme",
          storeId,
          isActive: true,
          isDraft: false,
        });
        await theme.save();
      }
    }

    const isHome = slug === "/" || (typeof slug === "string" && slug.trim() === "/");
    const normalizedSlug = typeof slug === "string" && slug.trim().length
      ? slug.trim()
      : name.toLowerCase().replace(/\s+/g, "-");
    const urlSlug = normalizedSlug === "/"
      ? "/"
      : (normalizedSlug.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "page");

    const existingPage = await Page.findOne({ urlSlug, storeId });
    if (existingPage) {
      return res.status(409).json({
        message: `Le slug "${urlSlug}" est déjà utilisé pour cette boutique. Choisissez un autre nom.`,
      });
    }

    const page = new Page({
      title: name,
      slug: normalizedSlug,
      urlSlug,
      storeId,
      themeId: theme._id,
      projectData,
      compiledHtml: compiledHtml !== undefined ? compiledHtml : undefined,
      compiledCss: compiledCss !== undefined ? compiledCss : undefined,
      components: projectData ? projectData.components : {},
      isHome,
      pageType: isHome ? "home" : "custom",
      createdBy: req.user?.id,
    });

    await page.save();
    await updateSyncedBlockUsageForPage(page._id, page.projectData);
    res.status(201).json(page);
  } catch (error) {
    console.error("createPageForStore error:", error);
    const duplicateMessage = getDuplicateKeyMessage(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }
    res.status(500).json({
      message: error.message,
    });
  }
};

const duplicatePage = async (req, res) => {
  try {
    const pageToDuplicate = await Page.findById(req.params.id);
    if (!pageToDuplicate) return res.status(404).json({ message: "Page not found" });

    if (!(await assertStoreAccess(req, pageToDuplicate.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    const newPage = new Page({
      title: pageToDuplicate.title + " (copy)",
      slug: pageToDuplicate.slug + "-copy-" + Date.now(),
      urlSlug: (pageToDuplicate.urlSlug || pageToDuplicate.slug || "page") + "-copy-" + Date.now(),
      storeId: pageToDuplicate.storeId,
      themeId: pageToDuplicate.themeId,
      projectData: pageToDuplicate.projectData,
      components: pageToDuplicate.components,
      isHome: false,
      isPublished: false,
      isDraft: true,
      pageType: "custom",
      createdBy: req.user?.id,
    });
    
    await newPage.save();
    await updateSyncedBlockUsageForPage(newPage._id, newPage.projectData);
    res.status(201).json(newPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setHomePage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    // Unset current home page for this store
    await Page.updateMany(
      { storeId: page.storeId, _id: { $ne: page._id } },
      { isHome: false, pageType: "custom" }
    );
    
    // Set new home page
    page.isHome = true;
    page.pageType = "home";
    page.slug = "/";
    page.urlSlug = "/";
    await page.save();
    
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Preview page  renders any page (even unpublished) through the full pipeline
 * including GlobalSection header/footer + live menu injection.
 * Protected: requires auth (editor-only  not a public storefront route).
 * GET /api/pages/:id/preview
 */
const previewPage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id).populate("themeId");
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // The comment above claims this route is auth-protected; the route
    // wiring alone doesn't guarantee that, so the check is enforced here too.
    if (!(await assertStoreAccess(req, page.storeId))) {
      return res.status(403).json({ message: "Accès refusé  ce store" });
    }

    if (!page.projectData) {
      return res.status(400).json({ message: "Page has no content yet" });
    }

    const { renderedHtml, renderedCss } = await generateRenderedPage(page);

    return res.status(200).json({
      success: true,
      data: { html: renderedHtml, css: renderedCss },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPage,
  getAllPages,
  getPageById,
  getPageBySlug,
  saveDraft,
  publishPage,
  unpublishPage,
  schedulePage,
  cancelSchedule,
  updatePage,
  deletePage,
  getPageVersions,
  restoreVersion,
  compareVersions,
  getStorePages,
  createPageForStore,
  duplicatePage,
  setHomePage,
  getStorefrontPage,
  previewPage,
};
