const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const multer = require("multer");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Import controllers
const themeController = require("../controller/themeController");
const pageController = require("../controller/pageController");
const sectionController = require("../controller/sectionController");

// Middleware
const { isAuth, loadUser, requirePermission, canCreatePage, canUpdatePage, canDeletePage, canPublishPage, canDuplicatePage, canSetHomePage, canRestoreVersion, canCompareVersions, canCreateTheme, canUpdateTheme, canDeleteTheme, canPublishTheme, canDuplicateTheme, canExportTheme, canImportTheme } = require("../middleware/auth");
const { requireFeatureMiddleware } = require("../service/EntitlementService");
const requireLevel2Builder = requireFeatureMiddleware("builder");

// ========== THEME ROUTES ==========

// Create theme
router.post("/themes", isAuth, loadUser, canCreateTheme, themeController.createTheme);

// Get all themes  SO-10: no isAuth/loadUser here left req.user undefined for
// the storeId-membership check in the controller (same for /themes/:id,
// which already had its own hasStoreAccess check with nothing to check).
router.get("/themes", isAuth, loadUser, themeController.getAllThemes);

// Get theme by ID
router.get("/themes/:id", isAuth, loadUser, themeController.getThemeById);

// Update theme
router.put("/themes/:id", isAuth, loadUser, canUpdateTheme, themeController.updateTheme);

// Publish theme
router.post("/themes/:id/publish", isAuth, loadUser, canPublishTheme, themeController.publishTheme);

// Delete theme
router.delete("/themes/:id", isAuth, loadUser, canDeleteTheme, themeController.deleteTheme);

// Duplicate theme
router.post("/themes/:id/duplicate", isAuth, loadUser, canDuplicateTheme, themeController.duplicateTheme);

// Export theme
router.post("/themes/:id/export", isAuth, loadUser, canExportTheme, themeController.exportTheme);

// Import theme
router.post("/themes/import", isAuth, loadUser, canImportTheme, upload.single("file"), themeController.importTheme);

// THEME-02: Super Admin theme catalog  list (with per-item Plan-gated
// "locked" flag) and apply (clones the picked template into the store,
// re-checking the gate server-side).
router.get("/theme-catalog", isAuth, loadUser, themeController.getThemeCatalog);
router.post("/stores/:storeId/theme-catalog/:catalogThemeId/apply", isAuth, loadUser, canUpdateTheme, themeController.applyThemeFromCatalog);

// THEME-02: frontend-convenience check  see getThemeBuilderAccess for why
// this doesn't weaken the real, independently-enforced gate.
router.get("/stores/:storeId/theme-builder-access", isAuth, loadUser, themeController.getThemeBuilderAccess);

// ========== PAGE ROUTES ==========

// Create page
router.post("/pages", isAuth, loadUser, canCreatePage, pageController.createPage);

// Get all pages (back-office listing, not the storefront)  SO-10: this had
// no isAuth/loadUser at all, so the storeId-scoping added to the controller
// had no req.user to check against. Same for /pages/:id just below.
router.get("/pages", isAuth, loadUser, pageController.getAllPages);

// Get page by slug (public endpoint)  must be BEFORE /pages/:id to avoid conflict
router.get("/pages/slug/:slug", pageController.getPageBySlug);

// Get page by ID
router.get("/pages/:id", isAuth, loadUser, pageController.getPageById);

// Save page draft
router.post("/pages/:id/draft", isAuth, loadUser, canUpdatePage, requireLevel2Builder, pageController.saveDraft);

// Publish page
router.post("/pages/:id/publish", isAuth, loadUser, canPublishPage, pageController.publishPage);

// Unpublish page
router.post("/pages/:id/unpublish", isAuth, loadUser, canPublishPage, pageController.unpublishPage);

// Schedule page
router.post("/pages/:id/schedule", isAuth, loadUser, canPublishPage, pageController.schedulePage);
router.post("/pages/:id/schedule/cancel", isAuth, loadUser, canPublishPage, pageController.cancelSchedule);

// Update page (content autosave  requires auth)
router.put("/pages/:id", isAuth, loadUser, canUpdatePage, pageController.updatePage);

// Duplicate page
router.post("/pages/:id/duplicate", isAuth, loadUser, canDuplicatePage, pageController.duplicatePage);

// Set home page
router.post("/pages/:id/set-home", isAuth, loadUser, canSetHomePage, pageController.setHomePage);

// Delete page
router.delete("/pages/:id", isAuth, loadUser, canDeletePage, pageController.deletePage);

// Preview page (full pipeline render  editorial, auth + page.view required)
router.get("/pages/:id/preview", isAuth, loadUser, requirePermission(getCode("Page", "view")), pageController.previewPage);

// Get page versions
router.get("/pages/:id/versions", isAuth, loadUser, requirePermission(getCode("Page", "view")), pageController.getPageVersions);

// Restore page version
router.post("/pages/:id/versions/:versionNumber/restore", isAuth, loadUser, canRestoreVersion, pageController.restoreVersion);

// Compare page versions
router.get("/pages/:id/versions/compare", isAuth, loadUser, canCompareVersions, pageController.compareVersions);

// ========== SECTION ROUTES ==========

// Create section
router.post("/sections", isAuth, loadUser, requirePermission(getCode("Sections", "create")), requireLevel2Builder, sectionController.createSection);

// Get sections for page
router.get("/sections", sectionController.getSectionsForPage);

// Get section by ID
router.get("/sections/:id", sectionController.getSectionById);

// Update section
router.put("/sections/:id", isAuth, loadUser, requirePermission(getCode("Sections", "update")), requireLevel2Builder, sectionController.updateSection);

// Delete section
router.delete("/sections/:id", isAuth, loadUser, requirePermission(getCode("Sections", "delete")), requireLevel2Builder, sectionController.deleteSection);

// ========== STORE-SCOPED THEME & PAGE ROUTES ==========
// GET endpoints: public (no auth needed to read the active theme/pages for the storefront)
// SO-19: this only appeared to require login as a side effect of mount
// order (storeRoute.js's blanket isAuth on "/api/stores/" runs first and
// leaves req.user set even when none of ITS routes match)  not because
// this route declared any auth of its own. Explicit now, so it stays
// correct regardless of what else is mounted before it.
router.get("/stores/:storeId/theme", isAuth, loadUser, themeController.getActiveTheme);
router.put("/stores/:storeId/theme/settings", isAuth, loadUser, canUpdateTheme, themeController.updateThemeSettings);
router.get("/stores/:storeId/pages", pageController.getStorePages);
router.post("/stores/:storeId/pages", isAuth, loadUser, canCreatePage, pageController.createPageForStore);

// Storefront route for published page rendering
router.get("/storefront/:storeId/:urlSlug", pageController.getStorefrontPage);

module.exports = router;
