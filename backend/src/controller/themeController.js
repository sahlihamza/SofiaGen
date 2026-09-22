const express = require('express');
const router = express.Router();

const themeController = {
  createTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme creation not implemented' }),
  getAllThemes: (req, res) => res.status(501).json({ success: false, message: 'Theme listing not implemented' }),
  getThemeById: (req, res) => res.status(501).json({ success: false, message: 'Theme retrieval not implemented' }),
  updateTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme update not implemented' }),
  publishTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme publish not implemented' }),
  deleteTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme delete not implemented' }),
  duplicateTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme duplication not implemented' }),
  exportTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme export not implemented' }),
  importTheme: (req, res) => res.status(501).json({ success: false, message: 'Theme import not implemented' }),
  getActiveTheme: (req, res) => res.status(501).json({ success: false, message: 'Active theme retrieval not implemented' }),
  updateThemeSettings: (req, res) => res.status(501).json({ success: false, message: 'Theme settings update not implemented' }),
};

module.exports = themeController;
const Theme = require("../models/Theme");
const Page = require("../models/Page");
const Section = require("../models/Section");
const AdmZip = require("adm-zip");
const ThemeService = require("../service/ThemeService");
const Store = require("../models/Store");
const { hasStoreAccess } = require("../middleware/auth");
const { hasFeature } = require("../service/EntitlementService");
const logger = require("../config/logger");

const assertStoreAccess = async (req, storeId) => {
  if (!req.user?.isSuperAdmin) {
    const roles = req.user?.role || [];
    if (!Array.isArray(roles) || !roles.some((r) => r?.name === "Super Admin")) {
      const granted = await hasStoreAccess(req.user, storeId);
      if (!granted) {
        throw { status: 403, success: false, message: "Accès refusé  ce store" };
      }
    }
  }
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

// ========== Theme Controller ==========

/**
 * Create a new theme
 * POST /api/themes
 */
const createTheme = async (req, res) => {
  try {
    const { name, description, storeId } = req.body;

    if (!name || !storeId) {
      return res.status(400).json({
        message: "Name and storeId are required",
      });
    }

    // SO-10: canCreateTheme only checks the user holds "theme.create"
    // somewhere  it has no idea which store req.body.storeId is, since this
    // router never runs resolveAuthorizationContext. Without this, any
    // authenticated staff member with that permission on their own store
    // could create a theme under a store they have no membership in at all.
    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const theme = new Theme({
      name,
      description,
      storeId,
      createdBy: req.user?.id,
    });

    await theme.save();

    // A theme with zero pages cannot be opened in the builder: the editor's
    // bootstrap auto-creates a Home page at urlSlug "/", but urlSlug is unique
    // per STORE (Page.js: { urlSlug, storeId }), not per theme. So "/" is only
    // ever available to a store's FIRST theme, and "Add Theme" -> open editor
    // failed with 409 for every theme after that. Give each new theme its own
    // Home page here, falling back to a store-unique slug the same way
    // ThemeService.cloneThemeForStore does for duplicated pages.
    // Non-fatal: the theme itself is already saved, and the editor bootstrap
    // has its own fallback for a page-less theme.
    try {
      const homeTaken = await Page.findOne({ storeId, urlSlug: "/" });
      const homeSlug = homeTaken ? `home-${theme._id}` : "/";
      await new Page({
        title: "Home",
        slug: homeSlug,
        urlSlug: homeSlug,
        storeId,
        themeId: theme._id,
        // Only the store's canonical "/" page is the real home; secondary
        // themes get isHome:false, matching cloneThemeForStore.
        isHome: homeSlug === "/",
        pageType: "home",
        createdBy: req.user?.id,
      }).save();
    } catch (pageErr) {
      logger.warn(`themeController.createTheme: home page provisioning failed for theme ${theme._id}: ${pageErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: "Theme created successfully",
      data: theme,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get all themes for a store
 * GET /api/themes?storeId=xxx
 */
const getAllThemes = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        message: "storeId is required",
      });
    }

    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    let themes = await Theme.find({ storeId })
      .sort({ createdAt: -1 })
      .select("-__v");

    if (themes.length === 0) {
      const defaultTheme = new Theme({
        name: "Default Theme",
        storeId,
        isActive: true,
        isDraft: false,
        colors: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#10b981",
          text: "#333333",
          background: "#ffffff",
        },
        fonts: {
          heading: "Arial",
          body: "Arial",
        },
        settings: {},
      });
      await defaultTheme.save();
      themes = [defaultTheme];
    } else {
      const hasActiveTheme = themes.some((theme) => theme.isActive);
      if (!hasActiveTheme) {
        const [themeToActivate] = themes;
        await Theme.findByIdAndUpdate(themeToActivate._id, {
          isActive: true,
          isDraft: false,
        });
        themes = await Theme.find({ storeId })
          .sort({ createdAt: -1 })
          .select("-__v");
      }
    }

    res.status(200).json({
      success: true,
      data: themes,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get theme by ID
 * GET /api/themes/:id
 */
const getThemeById = async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        message: "Theme not found",
      });
    }

    if (!req.user?.isSuperAdmin) {
      const roles = req.user?.role || [];
      if (!Array.isArray(roles) || !roles.some((r) => r?.name === "Super Admin")) {
        const granted = await hasStoreAccess(req.user, theme.storeId);
        if (!granted) {
          return res.status(403).json({
            success: false,
            message: "Accès refusé  ce store",
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: theme,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Update theme
 * PUT /api/themes/:id
 */
const updateTheme = async (req, res) => {
  try {
    const { name, description, colors, fonts, settings, thumbnail } = req.body;

    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        message: "Theme not found",
      });
    }

    try {
      await assertStoreAccess(req, theme.storeId);
    } catch (err) {
      return res.status(err.status).json(err);
    }

    if (name !== undefined) theme.name = name;
    if (description !== undefined) theme.description = description;
    if (colors !== undefined) theme.colors = colors;
    if (fonts !== undefined) theme.fonts = fonts;
    // THEME-02: same whitelist as updateThemeSettings  this route accepted
    // the exact same free-form Mixed `settings` write with no validation.
    if (settings !== undefined) theme.settings = sanitizeThemeSettings(settings);
    if (thumbnail !== undefined) theme.thumbnail = thumbnail;
    theme.updatedBy = req.user?.id;

    await theme.save();

    res.status(200).json({
      success: true,
      message: "Theme updated successfully",
      data: theme,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error);
    }
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Publish theme
 * POST /api/themes/:id/publish
 */
const publishTheme = async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        message: "Theme not found",
      });
    }

    try {
      await assertStoreAccess(req, theme.storeId);
    } catch (err) {
      return res.status(err.status).json(err);
    }

    // Désactive tous les autres thèmes du même store
    await Theme.updateMany(
      { storeId: theme.storeId, _id: { $ne: theme._id } },
      { isActive: false }
    );

    theme.isActive = true;
    theme.isDraft = false;
    theme.updatedBy = req.user?.id;
    await theme.save();

    res.status(200).json({
      success: true,
      message: "Theme published successfully",
      data: theme,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error);
    }
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Delete theme
 * DELETE /api/themes/:id
 */
const deleteTheme = async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        message: "Theme not found",
      });
    }

    try {
      await assertStoreAccess(req, theme.storeId);
    } catch (err) {
      return res.status(err.status).json(err);
    }

    if (theme.isActive) {
      return res.status(400).json({
        message: "Cannot delete the active theme. Please activate another theme first.",
      });
    }

    // Récupère toutes les pages du thème
    const pages = await Page.find({ themeId: theme._id });

    // Collecte tous les section IDs référencés par ces pages
    const sectionIds = pages.reduce(
      (acc, p) => acc.concat(p.sections || []),
      []
    );

    // Supprime les sections, puis les pages, puis le thème
    if (sectionIds.length > 0) {
      await Section.deleteMany({ _id: { $in: sectionIds } });
    }
    await Page.deleteMany({ themeId: theme._id });
    await Theme.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Theme deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getActiveTheme = async (req, res) => {
  try {
    const { storeId } = req.params;
    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    let theme = await Theme.findOne({ storeId, isActive: true });

    if (!theme) {
      theme = await Theme.findOne({ storeId }).sort({ updatedAt: -1 });
      if (!theme) {
        theme = new Theme({
          name: "Default Theme",
          storeId,
          isActive: true,
          isDraft: false,
          colors: {
            primary: "#667eea",
            secondary: "#764ba2",
            accent: "#10b981",
            text: "#333333",
            background: "#ffffff",
          },
          settings: {},
        });
        await theme.save();
      }
    }

    res.status(200).json(theme);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// THEME-02: the 15 ThemeSettings sections (14 shown in the nav + customCss)
// plus the sections written by other flows but hidden from that nav (see
// admin/src/components/theme-editor/core/defaultThemeSettings.js). Anything
// else  an arbitrary top-level key, or the DEFAULT_THEME_SETTINGS.customCss
// section reused to smuggle a <script> tag into every page via the injected
// <style> block  used to be accepted verbatim (Mixed type, no validation).
const ALLOWED_SETTINGS_SECTIONS = [
  "branding",
  "colors",
  "typography",
  "spacing",
  "radius",
  "shadows",
  "breakpoints",
  "typescale",
  "layout",
  "buttons",
  "cards",
  "forms",
  "animations",
  "customCss",
  // darkMode was omitted here even though themeCssVars.js already reads
  // settings.darkMode to emit the [data-theme="dark"] block, and the admin
  // ThemeSettings panel ships a DarkModeSection for it. The result was that
  // saving that panel ALWAYS failed with 400 "Champs non autorisés dans
  // settings: darkMode"  the whole feature was unreachable end to end.
  "darkMode",
  "general",
  "commerce",
  "productCards",
  "navigation",
  "integrations",
];

const sanitizeThemeSettings = (settings) => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw { status: 400, success: false, message: "settings doit être un objet" };
  }

  const unknownKeys = Object.keys(settings).filter((key) => !ALLOWED_SETTINGS_SECTIONS.includes(key));
  if (unknownKeys.length > 0) {
    throw {
      status: 400,
      success: false,
      message: `Champs non autorisés dans settings: ${unknownKeys.join(", ")}`,
    };
  }

  const clean = {};
  for (const section of ALLOWED_SETTINGS_SECTIONS) {
    if (settings[section] === undefined) continue;
    if (typeof settings[section] !== "object" || Array.isArray(settings[section]) || settings[section] === null) {
      throw { status: 400, success: false, message: `settings.${section} doit être un objet` };
    }
    clean[section] = settings[section];
  }

  // customCss.css is injected into a <style> tag on the live storefront 
  // a closing tag here breaks out of it and runs arbitrary script for
  // every visitor of every page using this theme.
  if (typeof clean.customCss?.css === "string" && /<\/style|<script/i.test(clean.customCss.css)) {
    throw { status: 400, success: false, message: "customCss.css ne peut pas contenir de balises <style>/<script>" };
  }

  return clean;
};

const updateThemeSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { settings } = req.body;

    // SO-10: canUpdateTheme only checks the "theme.update" permission in the
    // abstract  it has no idea whether :storeId is actually this user's
    // store.
    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    let cleanSettings;
    try {
      cleanSettings = sanitizeThemeSettings(settings);
    } catch (err) {
      return res.status(err.status || 400).json(err);
    }

    let theme = await Theme.findOne({ storeId, isActive: true });
    if (!theme) {
      theme = await Theme.findOne({ storeId });
      if (!theme) {
        theme = new Theme({
          name: "Default Theme",
          storeId,
          isActive: true,
          isDraft: false,
        });
      }
    }

    theme.settings = cleanSettings;
    theme.updatedBy = req.user?.id;
    await theme.save();

    res.status(200).json(theme);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const duplicateTheme = async (req, res) => {
  try {
    const themeToDuplicate = await Theme.findById(req.params.id);
    if (!themeToDuplicate) {
      return res.status(404).json({ message: "Theme not found" });
    }

    try {
      await assertStoreAccess(req, themeToDuplicate.storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const result = await ThemeService.cloneThemeForStore(
      themeToDuplicate.storeId,
      themeToDuplicate._id,
      req.user?.id
    );

    res.status(201).json({ success: true, data: result.theme });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exportTheme = async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id);
    if (!theme) return res.status(404).json({ message: "Theme not found" });

    // SO-10: exporting hands back every page's full projectData/HTML/CSS for
    // this theme  without this, any authenticated user with theme.export
    // on their own store could download a competing store's entire site.
    try {
      await assertStoreAccess(req, theme.storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const pages = await Page.find({ themeId: theme._id });
    const allSectionIds = pages.reduce((acc, p) => acc.concat(p.sections || []), []);
    const sections = await Section.find({ _id: { $in: allSectionIds } });

    const zip = new AdmZip();

    // Add theme.json
    zip.addFile("theme.json", Buffer.from(JSON.stringify({
      name: theme.name,
      colors: theme.colors,
      fonts: theme.fonts,
      settings: theme.settings,
      version: theme.version || "1.0",
    }, null, 2)));

    // Add pages
    pages.forEach(p => {
      zip.addFile(`pages/${p.slug}.json`, Buffer.from(JSON.stringify({
        title: p.title,
        slug: p.slug,
        projectData: p.projectData,
        components: p.components,
        isHome: p.isHome,
        pageType: p.pageType,
        sectionIds: p.sections // We'll map these back on import
      }, null, 2)));
    });

    // Add sections
    sections.forEach(s => {
      zip.addFile(`sections/${s._id}.json`, Buffer.from(JSON.stringify({
        originalId: s._id,
        name: s.name,
        components: s.components,
        styles: s.styles,
        html: s.html,
        css: s.css
      }, null, 2)));
    });

    const zipBuffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${theme.slug || 'theme'}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const importTheme = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No ZIP file provided" });
    const { storeId } = req.body;
    if (!storeId) return res.status(400).json({ message: "storeId is required" });

    // SO-10: importing writes a new Theme + Pages + Sections straight into
    // storeId with no other check on it  without this, any authenticated
    // user with theme.import on their own store could inject content into
    // any other store just by naming it in the body.
    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    let themeData = null;
    const pagesData = [];
    const sectionsData = [];

    zipEntries.forEach(entry => {
      if (entry.entryName === "theme.json") {
        themeData = JSON.parse(entry.getData().toString("utf8"));
      } else if (entry.entryName.startsWith("pages/") && entry.entryName.endsWith(".json")) {
        pagesData.push(JSON.parse(entry.getData().toString("utf8")));
      } else if (entry.entryName.startsWith("sections/") && entry.entryName.endsWith(".json")) {
        sectionsData.push(JSON.parse(entry.getData().toString("utf8")));
      }
    });

    if (!themeData) {
      return res.status(400).json({ message: "Invalid theme ZIP: missing theme.json" });
    }

    const newTheme = new Theme({
      name: themeData.name + " (Imported)",
      slug: (themeData.name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
      storeId,
      colors: themeData.colors,
      fonts: themeData.fonts,
      settings: themeData.settings,
      isActive: false,
      isDraft: true,
      createdBy: req.user?.id,
    });
    await newTheme.save();

    // Map old section IDs to new section IDs
    const sectionIdMap = {};
    for (const sData of sectionsData) {
      const newSection = new Section({
        name: sData.name,
        components: sData.components,
        styles: sData.styles,
        html: sData.html,
        css: sData.css,
        storeId,
        createdBy: req.user?.id,
      });
      await newSection.save();
      sectionIdMap[sData.originalId] = newSection._id;
    }

    for (const pData of pagesData) {
      const mappedSectionIds = (pData.sectionIds || []).map(oldId => sectionIdMap[oldId]).filter(Boolean);
      
      const newPage = new Page({
        title: pData.title,
        slug: pData.slug + "-" + Date.now(),
        urlSlug: (pData.slug + "-" + Date.now()).replace(/\//g, "-"),
        storeId,
        themeId: newTheme._id,
        projectData: pData.projectData,
        components: pData.components,
        isHome: false,
        isPublished: false,
        isDraft: true,
        pageType: pData.pageType || "custom",
        sections: mappedSectionIds,
        createdBy: req.user?.id,
      });
      await newPage.save();
    }

    res.status(201).json({ success: true, data: newTheme });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * THEME-02: Super Admin theme catalog, filtered/annotated by the requesting
 * store's Plan features  not a hardcoded, disconnected preset list like
 * the one previously shown in the store-creation wizard.
 * GET /api/theme-catalog?storeId=xxx
 */
const getThemeCatalog = async (req, res) => {
  try {
    const { storeId } = req.query;
    if (!storeId) {
      return res.status(400).json({ success: false, message: "storeId is required" });
    }

    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const catalogThemes = await Theme.find({ isTemplate: true })
      .select("name description colors fonts catalogFeature")
      .sort({ catalogFeature: 1, createdAt: 1 });

    const featureCache = new Map();
    const isUnlocked = async (featureCode) => {
      if (!featureCode) return true;
      if (req.user?.isSuperAdmin) return true;
      if (!featureCache.has(featureCode)) {
        featureCache.set(featureCode, await hasFeature(storeId, featureCode));
      }
      return featureCache.get(featureCode);
    };

    const data = [];
    for (const theme of catalogThemes) {
      data.push({
        id: theme._id,
        name: theme.name,
        description: theme.description,
        colors: theme.colors,
        fonts: theme.fonts,
        requiredFeature: theme.catalogFeature,
        locked: !(await isUnlocked(theme.catalogFeature)),
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * THEME-02: clone a catalog theme into the caller's store  the actual
 * enforcement point. Re-checking the Plan feature here (not trusting the
 * `locked` flag the client saw on the list above) is what makes this a
 * real gate instead of a cosmetic one: a forged request straight to this
 * route for a theme the store's plan doesn't include still gets rejected.
 * POST /api/stores/:storeId/theme-catalog/:catalogThemeId/apply
 */
const applyThemeFromCatalog = async (req, res) => {
  try {
    const { storeId, catalogThemeId } = req.params;

    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const catalogTheme = await Theme.findOne({ _id: catalogThemeId, isTemplate: true });
    if (!catalogTheme) {
      return res.status(404).json({ success: false, message: "Modèle de thème introuvable" });
    }

    if (catalogTheme.catalogFeature && !req.user?.isSuperAdmin) {
      const unlocked = await hasFeature(storeId, catalogTheme.catalogFeature);
      if (!unlocked) {
        return res.status(403).json({
          success: false,
          code: "FEATURE_NOT_INCLUDED",
          feature: catalogTheme.catalogFeature,
          message: `Ce thème n'est pas disponible avec votre plan actuel (${catalogTheme.catalogFeature})`,
        });
      }
    }

    const result = await ThemeService.cloneThemeForStore(storeId, catalogTheme._id, req.user?.id);

    await Theme.updateMany({ storeId, _id: { $ne: result.theme._id } }, { isActive: false });
    result.theme.isActive = true;
    result.theme.isDraft = false;
    await result.theme.save();
    await Store.findByIdAndUpdate(storeId, { themeId: result.theme._id });

    res.status(201).json({ success: true, data: result.theme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * THEME-02: lets the frontend decide, before ever opening GjsEditorShell,
 * whether this store is entitled to Level 2 (the canvas). This is a UX
 * convenience only  every actual canvas write is independently re-checked
 * server-side (see themeRoutes.js / pageController.js), so a stale or
 * forged answer here can't grant real access, only a confusing screen.
 * GET /api/stores/:storeId/theme-builder-access
 */
const getThemeBuilderAccess = async (req, res) => {
  try {
    const { storeId } = req.params;

    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const hasAccess = req.user?.isSuperAdmin || (await hasFeature(storeId, "builder"));
    res.status(200).json({ success: true, hasAccess: Boolean(hasAccess) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTheme,
  getAllThemes,
  getThemeById,
  updateTheme,
  publishTheme,
  deleteTheme,
  getActiveTheme,
  updateThemeSettings,
  duplicateTheme,
  exportTheme,
  importTheme,
  getThemeCatalog,
  applyThemeFromCatalog,
  getThemeBuilderAccess,
};
