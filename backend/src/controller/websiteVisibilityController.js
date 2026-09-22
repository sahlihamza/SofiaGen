const websiteVisibilityService = require("../service/websiteVisibilityService");
const { SESSION_COOKIE } = websiteVisibilityService;
const { getClientIp } = require("../middleware/websiteVisibility");
const {
  renderMaintenancePage,
  renderComingSoonPage,
  renderPasswordPage,
  renderPublicPage,
  renderPrivatePage,
} = require("../utils/visibilityPages");

const handleError = (res, error) => {
  if (error.name === "ValidationError") {
    return res.status(422).json({
      success: false,
      message: error.message || "Donnés invalides",
      errors: error.errors
        ? Object.values(error.errors).map((err) => ({
            field: err.path,
            message: err.message,
          }))
        : [],
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Identifiant invalide" });
  }

  return res.status(500).json({
    success: false,
    message: "Erreur serveur",
    error: error.message,
  });
};

/* ------------------------------- admin API ------------------------------ */

const getSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await websiteVisibilityService.getByStoreId(storeId, {
      withPassword: true,
    });

    return res.status(200).json({
      success: true,
      message: "Paramètres de visibilité récupérés avec succès",
      data: websiteVisibilityService.toClientJSON(settings),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await websiteVisibilityService.updateByStoreId(storeId, req.body, {
      actor: req.user,
      ip: getClientIp(req),
    });

    return res.status(200).json({
      success: true,
      message: "Paramètres de visibilité mis à jour avec succès",
      data: websiteVisibilityService.toClientJSON(settings),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const resetSessions = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await websiteVisibilityService.resetPasswordSessions(storeId, {
      actor: req.user,
      ip: getClientIp(req),
    });

    return res.status(200).json({
      success: true,
      message: "Toutes les sessions d'accès ont t réinitialisés",
      data: websiteVisibilityService.toClientJSON(settings),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const previewMode = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await websiteVisibilityService.getByStoreId(storeId);
    const mode = req.query.mode || settings.visibility;
    const theme = req.query.theme === "dark" ? "dark" : "light";
    const previewSettings = { ...settings.toObject(), visibility: mode };

    switch (mode) {
      case "maintenance":
        return res.type("html").send(renderMaintenancePage(previewSettings, { theme }));
      case "comingSoon":
        return res.type("html").send(renderComingSoonPage(previewSettings, { theme }));
      case "password":
        return res.type("html").send(renderPasswordPage(previewSettings, { theme }));
      case "private":
        return res.type("html").send(renderPrivatePage({ theme }));
      case "public":
      default:
        return res.type("html").send(renderPublicPage({ theme }));
    }
  } catch (error) {
    return handleError(res, error);
  }
};

/* ------------------------------ public API ------------------------------ */
const submitSitePassword = async (req, res) => {
  try {
    const store = await websiteVisibilityService.resolveActiveStore();
    if (!store) return res.redirect(302, "/");

    const { password, redirectTo = "/" } = req.body || {};
    const isValid = await websiteVisibilityService.verifyPassword(store._id, password);

    const settings = await websiteVisibilityService.getByStoreId(store._id);

    if (!isValid) {
      return res
        .status(401)
        .type("html")
        .send(
          renderPasswordPage(settings, {
            error: "Mot de passe incorrect.",
            redirectTo,
          })
        );
    }

    const token = websiteVisibilityService.issuePasswordSessionToken(settings);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });
    const safeRedirect =
      typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/";

    return res.redirect(302, safeRedirect);
  } catch (error) {
    return handleError(res, error);
  }
};

// Story 7  robots.txt reflects the current visibility/SEO settings.
const getRobotsTxt = async (req, res) => {
  try {
    const store = await websiteVisibilityService.resolveActiveStore();
    if (!store) return res.type("text/plain").send("User-agent: *\nDisallow: /\n");

    const settings = await websiteVisibilityService.getByStoreId(store._id);
    if (!settings.seo?.generateRobots) {
      return res.status(404).type("text/plain").send("Not found");
    }

    const siteUrl = process.env.STORE_URL || `${req.protocol}://${req.get("host")}`;
    return res
      .type("text/plain")
      .send(websiteVisibilityService.buildRobotsTxt(settings, { siteUrl }));
  } catch (error) {
    return handleError(res, error);
  }
};

const getSitemapXml = async (req, res) => {
  try {
    const store = await websiteVisibilityService.resolveActiveStore();
    if (!store) return res.status(404).type("text/plain").send("Not found");

    const settings = await websiteVisibilityService.getByStoreId(store._id);
    if (!settings.seo?.generateSitemap || websiteVisibilityService.shouldNoIndex(settings)) {
      return res.status(404).type("text/plain").send("Not found");
    }

    const siteUrl = process.env.STORE_URL || `${req.protocol}://${req.get("host")}`;
    const xml = await websiteVisibilityService.buildSitemapXml(store._id, { siteUrl });
    return res.type("application/xml").send(xml);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSessions,
  previewMode,
  submitSitePassword,
  getRobotsTxt,
  getSitemapXml,
};
