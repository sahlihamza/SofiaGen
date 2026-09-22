const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const WebsiteVisibility = require("../models/WebsiteVisibility");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Category = require("../models/Category");
const MarketingSettings = require("../models/MarketingSettings");
const auditLogService = require("./auditLogService");
const { VISIBILITY_MODES } = WebsiteVisibility;

const SESSION_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const SESSION_COOKIE = "site_access";
const SESSION_TTL = "12h";

const validationError = (message) => {
  const error = new Error(message);
  error.name = "ValidationError";
  error.errors = {};
  return error;
};

const patternToRegex = (pattern) => {
  const escaped = String(pattern)
    .trim()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
};

class WebsiteVisibilityService {
  async getByStoreId(storeId, { withPassword = false } = {}) {
    const query = WebsiteVisibility.findOne({ storeId });
    if (withPassword) query.select("+password");

    let settings = await query;
    if (!settings) {
      try {
        settings = await WebsiteVisibility.create({ storeId });
        if (withPassword) {
          settings = await WebsiteVisibility.findById(settings._id).select("+password");
        }
      } catch (error) {
        if (error.code !== 11000) throw error;
        const retry = WebsiteVisibility.findOne({ storeId });
        if (withPassword) retry.select("+password");
        settings = await retry;
        if (!settings) throw error;
      }
    }

    return settings;
  }

  async updateByStoreId(storeId, updates = {}, { actor = null, ip = "" } = {}) {
    const {
      visibility,
      password,
      passwordPage,
      allowSearchEngines,
      robotsNoIndex,
      maintenance,
      comingSoon,
      seo,
      exceptions,
    } = updates;

    if (visibility && !VISIBILITY_MODES.includes(visibility)) {
      throw validationError(`Mode de visibilité inconnu: ${visibility}`);
    }
    if (exceptions !== undefined && !Array.isArray(exceptions)) {
      throw validationError("exceptions doit être un tableau");
    }
    if (maintenance?.allowedIps !== undefined && !Array.isArray(maintenance.allowedIps)) {
      throw validationError("maintenance.allowedIps doit être un tableau");
    }
    const current = await this.getByStoreId(storeId, { withPassword: true });
    if (visibility === "password" && !password && !current.password) {
      throw validationError(
        "Définissez un mot de passe avant d'activer le mode  protég par mot de passe "
      );
    }

    const previousVisibility = current.visibility;

    const merge = (base, patch) => ({
      ...(base?.toObject?.() || base || {}),
      ...(patch || {}),
    });

    const next = {
      visibility: visibility || current.visibility,
      passwordPage: merge(current.passwordPage, passwordPage),
      allowSearchEngines:
        allowSearchEngines !== undefined ? allowSearchEngines : current.allowSearchEngines,
      robotsNoIndex: robotsNoIndex !== undefined ? robotsNoIndex : current.robotsNoIndex,
      maintenance: merge(current.maintenance, maintenance),
      comingSoon: merge(current.comingSoon, comingSoon),
      seo: merge(current.seo, seo),
      exceptions: exceptions !== undefined ? exceptions : current.exceptions,
      updatedBy: actor?._id || null,
    };

    const passwordChanged = Boolean(password);
    if (passwordChanged) {
      next.password = bcrypt.hashSync(password);
    }

    const settings = await WebsiteVisibility.findOneAndUpdate(
      { storeId },
      { $set: next, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await this._logChanges({
      storeId,
      settings,
      previousVisibility,
      current,
      updates,
      passwordChanged,
      actor,
      ip,
    });

    return settings;
  }

  async _logChanges({
    storeId,
    settings,
    previousVisibility,
    current,
    updates,
    passwordChanged,
    actor,
    ip,
  }) {
    const entityId = String(settings._id);
    const log = (action, summary, metadata = {}) =>
      auditLogService.log({
        storeId,
        action,
        entityType: "WebsiteVisibility",
        entityId,
        summary,
        metadata,
        actor,
        ipAddress: ip,
      });

    if (settings.visibility !== previousVisibility) {
      await log(
        "visibility_changed",
        `Visibilité du site :  ${previousVisibility}    ${settings.visibility} `,
        { from: previousVisibility, to: settings.visibility }
      );
    }

    if (passwordChanged) {
      await log("visibility_password_changed", "Mot de passe du site modifié");
    }

    if (updates.exceptions !== undefined) {
      const before = current.exceptions || [];
      const after = settings.exceptions || [];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await log(
          "visibility_exceptions_changed",
          `Exceptions d'URL modifiées (${after.length} règle(s))`,
          { before, after }
        );
      }
    }

    const seoBefore = {
      allowSearchEngines: current.allowSearchEngines,
      robotsNoIndex: current.robotsNoIndex,
      generateRobots: current.seo?.generateRobots,
      generateSitemap: current.seo?.generateSitemap,
    };
    const seoAfter = {
      allowSearchEngines: settings.allowSearchEngines,
      robotsNoIndex: settings.robotsNoIndex,
      generateRobots: settings.seo?.generateRobots,
      generateSitemap: settings.seo?.generateSitemap,
    };
    if (JSON.stringify(seoBefore) !== JSON.stringify(seoAfter)) {
      await log("visibility_seo_changed", "Paramètres SEO de visibilité modifiés", {
        before: seoBefore,
        after: seoAfter,
      });
    }
  }

  async resetPasswordSessions(storeId, { actor = null, ip = "" } = {}) {
    const settings = await WebsiteVisibility.findOneAndUpdate(
      { storeId },
      { $set: { passwordSessionsResetAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await auditLogService.log({
      storeId,
      action: "visibility_sessions_reset",
      entityType: "WebsiteVisibility",
      entityId: String(settings._id),
      summary: "Toutes les sessions d'accès au site ont t réinitialisés",
      actor,
      ipAddress: ip,
    });

    return settings;
  }

  async verifyPassword(storeId, candidatePassword) {
    const settings = await this.getByStoreId(storeId, { withPassword: true });
    if (!settings.password) return false;
    return bcrypt.compareSync(candidatePassword || "", settings.password);
  }

  issuePasswordSessionToken(settings) {
    return jwt.sign(
      {
        storeId: String(settings.storeId),
        resetAt: settings.passwordSessionsResetAt
          ? new Date(settings.passwordSessionsResetAt).getTime()
          : 0,
      },
      SESSION_SECRET,
      { expiresIn: SESSION_TTL }
    );
  }

  hasValidPasswordSession(settings, token) {
    if (!token) return false;
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      if (String(decoded.storeId) !== String(settings.storeId)) return false;

      const resetAt = settings.passwordSessionsResetAt
        ? new Date(settings.passwordSessionsResetAt).getTime()
        : 0;
      return Number(decoded.resetAt || 0) >= resetAt;
    } catch {
      return false;
    }
  }

  matchesException(path, exceptions = []) {
    return exceptions.some((pattern) => {
      if (!pattern) return false;
      try {
        return patternToRegex(pattern).test(path);
      } catch {
        return false;
      }
    });
  }

  // Exact match, or a trailing wildcard like "192.168.*".
  isIpAllowed(ip, allowedIps = []) {
    if (!ip || allowedIps.length === 0) return false;
    const normalized = String(ip).replace(/^::ffff:/, "");
    return allowedIps.some((entry) => {
      if (!entry) return false;
      const candidate = String(entry).trim();
      if (candidate === normalized) return true;
      if (candidate.includes("*")) {
        try {
          return patternToRegex(candidate).test(normalized);
        } catch {
          return false;
        }
      }
      return false;
    });
  }

  resolveAccess(settings, { path = "/", ip = "", isAuthenticated = false, isAdmin = false, sessionToken = "" } = {}) {
    const allow = (reason) => ({ action: "allow", reason, noindex: this.shouldNoIndex(settings) });

    if (this.matchesException(path, settings.exceptions)) {
      return allow("exception");
    }

    switch (settings.visibility) {
      case "private":
        if (isAuthenticated) return allow("authenticated");
        return { action: "redirect", redirectTo: "/login", reason: "private", noindex: true };

      case "password":
        if (isAdmin) return allow("admin");
        if (this.hasValidPasswordSession(settings, sessionToken)) {
          return allow("password-session");
        }
        return { action: "password", reason: "password", noindex: true };

      case "maintenance":
        if (settings.maintenance?.allowAdmins && isAdmin) return allow("admin");
        if (this.isIpAllowed(ip, settings.maintenance?.allowedIps)) return allow("allowed-ip");
        return { action: "maintenance", reason: "maintenance", noindex: true };

      case "comingSoon":
        if (isAdmin) return allow("admin");
        return { action: "comingSoon", reason: "comingSoon", noindex: true };

      case "public":
      default:
        return allow("public");
    }
  }

  shouldNoIndex(settings) {
    if (settings.visibility !== "public") return true;
    if (settings.robotsNoIndex) return true;
    return !settings.allowSearchEngines;
  }

  buildRobotsTxt(settings, { siteUrl = "" } = {}) {
    if (this.shouldNoIndex(settings)) {
      return "User-agent: *\nDisallow: /\n";
    }

    const lines = ["User-agent: *", "Allow: /"];
    if (settings.seo?.generateSitemap && siteUrl) {
      lines.push(`Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap.xml`);
    }
    return `${lines.join("\n")}\n`;
  }

  async buildSitemapXml(storeId, { siteUrl = "" } = {}) {
    const base = siteUrl.replace(/\/$/, "");
    const marketing = storeId ? await MarketingSettings.findOne({ storeId }).lean() : null;
    const sitemapEnabled = marketing ? marketing.sitemap?.enabled !== false : true;
    const includeProducts = marketing ? marketing.sitemap?.includeProducts !== false : true;
    const includeCategories = marketing ? marketing.sitemap?.includeCategories !== false : true;
    const customUrls = Array.isArray(marketing?.sitemap?.customUrls) ? marketing.sitemap.customUrls : [];

    if (!sitemapEnabled) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n`;
    }

    const urls = [{ loc: `${base}/`, lastmod: new Date().toISOString() }];

    if (includeProducts) {
      const products = await Product.find({ status: "published", visibility: "public" })
        .select("updatedAt")
        .limit(5000)
        .lean();
      for (const product of products) {
        urls.push({
          loc: `${base}/product/${product._id}`,
          lastmod: new Date(product.updatedAt || Date.now()).toISOString(),
        });
      }
    }

    if (includeCategories) {
      const categories = await Category.find({ status: "published" })
        .select("slug updatedAt")
        .limit(2000)
        .lean()
        .catch(() => []);
      for (const category of categories) {
        const slug = category.slug || category._id;
        urls.push({
          loc: `${base}/category/${slug}`,
          lastmod: new Date(category.updatedAt || Date.now()).toISOString(),
        });
      }
    }

    for (const customUrl of customUrls) {
      if (/^https?:\/\//i.test(customUrl)) {
        urls.push({ loc: customUrl, lastmod: new Date().toISOString() });
      }
    }

    const body = urls
      .map(
        (url) =>
          `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n  </url>`
      )
      .join("\n");

    if (storeId) {
      await MarketingSettings.findOneAndUpdate(
        { storeId },
        { $set: { "sitemap.lastGeneratedAt": new Date() } }
      ).catch(() => {});
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  }

  async resolveActiveStore() {
    return (
      (await Store.findOne({ isSelected: true })) || (await Store.findOne({ isActive: true }))
    );
  }

  toClientJSON(settings) {
    const plain = settings.toObject ? settings.toObject() : { ...settings };
    delete plain.password;
    return { ...plain, hasPassword: Boolean(settings.password) };
  }
}

module.exports = new WebsiteVisibilityService();
module.exports.SESSION_COOKIE = SESSION_COOKIE;
