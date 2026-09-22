const jwt = require("jsonwebtoken");
const User = require("../models/User");
const websiteVisibilityService = require("../service/websiteVisibilityService");
const { SESSION_COOKIE } = websiteVisibilityService;
const {
  renderMaintenancePage,
  renderComingSoonPage,
  renderPasswordPage,
} = require("../utils/visibilityPages");
const logger = require("../config/logger");

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  "";

const readToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return req.cookies?.adminToken || req.cookies?.token || "";
};

// Best-effort identity check: the guard must never 500 on a malformed or
// expired token  an unidentifiable visitor is simply treated as anonymous.
const identifyRequester = async (req) => {
  const token = readToken(req);
  if (!token) return { isAuthenticated: false, isAdmin: false };

  try {
    const decoded = jwt.verify(token, accessSecret);
    const user = await User.findById(decoded.id).select("_id");
    if (user) return { isAuthenticated: true, isAdmin: true };
    return { isAuthenticated: true, isAdmin: false };
  } catch {
    return { isAuthenticated: false, isAdmin: false };
  }
};

// Gates storefront (non-API) traffic according to the store's visibility
// mode. Mounted after the API routes so /api/* is never affected, and
// fail-open: any internal error lets the request through rather than taking
// the whole storefront down.
const websiteVisibilityGuard = async (req, res, next) => {
  try {
    const store = await websiteVisibilityService.resolveActiveStore();
    if (!store) return next();

    const settings = await websiteVisibilityService.getByStoreId(store._id, {
      withPassword: true,
    });

    const { isAuthenticated, isAdmin } = await identifyRequester(req);

    const decision = websiteVisibilityService.resolveAccess(settings, {
      path: req.path,
      ip: getClientIp(req),
      isAuthenticated,
      isAdmin,
      sessionToken: req.cookies?.[SESSION_COOKIE],
    });

    if (decision.noindex) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    switch (decision.action) {
      case "redirect":
        return res.redirect(302, decision.redirectTo);
      case "password":
        return res
          .status(401)
          .type("html")
          .send(renderPasswordPage(settings, { redirectTo: req.originalUrl }));
      case "maintenance":
        return res.status(503).type("html").send(renderMaintenancePage(settings));
      case "comingSoon":
        return res.status(503).type("html").send(renderComingSoonPage(settings));
      case "allow":
      default:
        return next();
    }
  } catch (error) {
    logger.error("websiteVisibilityGuard failed:", error.message);
    return next();
  }
};

module.exports = { websiteVisibilityGuard, getClientIp };
