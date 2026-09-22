const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const UserStore = require("../models/UserStore");
const Rider = require("../models/Rider");
const Role = require("../models/Role");
const Store = require("../models/Store");
const AuditService = require("../service/AuditService");
const { ADMIN_USER_TYPES } = require("../utils/userTypes");
const { permissions } = require("../config/rbac/permissions");
const logger = require("../config/logger");
const { normalizePermissionCode } = require("../utils/normalizePermissionCode");

const { maskPii, normalizeIp } = AuditService;

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (!accessSecret) {
  throw new Error("JWT_ACCESS_SECRET manquant");
}

const normalizeRoles = (roleValue) => {
  if (Array.isArray(roleValue)) {
    return roleValue.filter(Boolean);
  }
  return roleValue ? [roleValue] : [];
};

const isSuperAdminRole = (roles) =>
  roles.some(
    (role) =>
      typeof role?.name === "string" && role.name.trim().toLowerCase() === "super admin"
  );

const extractUserPermissions = (user, req) => {
  const codes = new Set();
  let roles;

  if (req?.storeMembership?.roleId) {
    roles = [req.storeMembership.roleId];
  } else {
    roles = normalizeRoles(user.role);
  }

  for (const role of roles) {
    const permissions = Array.isArray(role?.permissions) ? role.permissions : [];
    for (const p of permissions) {
      if (p?.code) {
        codes.add(normalizePermissionCode(p.code));
      } else if (p?.module && p?.action) {
        codes.add(normalizePermissionCode(`${p.module}.${p.action}`));
      }
    }
  }
  return codes;
};

const buildPermissionGuard = (resolver) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Utilisateur non chargé" });
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  let userPerms = req.authContext?.permissions?.size
    ? req.authContext.permissions
    : extractUserPermissions(req.user, req);

  // Many theme/page/section/saved-block/asset routes are id-based
  // (/pages/:id, /sections/:id, ...) and can't resolve their storeId from
  // the URL before the controller loads the resource, so neither
  // resolveAuthorizationContext nor requireStoreAccess ran before this
  // guard  extractUserPermissions above only ever reads the platform
  // User.role, which is empty for a real store-scoped user. Without this
  // fallback, every one of these checks always fails for a Store Owner.
  if (userPerms.size === 0 && req.currentStoreId) {
    try {
      const membership = await hasStoreAccess(req.user, req.currentStoreId);
      if (membership && membership !== true) {
        userPerms = new Set(
          (membership.roleId?.permissions || []).map((p) => normalizePermissionCode(p.code))
        );
        req.storeMembership = membership;
        req.storeRole = membership.roleId;
      }
    } catch (err) {
      logger.error(`buildPermissionGuard: store permission fallback failed: ${err.message}`);
    }
  }

  const result = resolver(userPerms);
  if (!result.ok) {
    return res.status(403).json({ success: false, message: `Permission '${result.needed}' requise` });
  }

  if (req.authContext?.scope && req.authContext?.permissionByCode) {
    const neededCode = normalizePermissionCode(result.needed);
    const permDoc = req.authContext.permissionByCode.get(neededCode);
    if (permDoc && permDoc.scope && permDoc.scope !== req.authContext.scope) {
      return res.status(403).json({
        success: false,
        message: `Permission '${result.needed}' refusé: scope '${permDoc.scope}' incompatible avec le contexte '${req.authContext.scope}'`,
      });
    }
  }

  next();
};

// SO-17: `needed` has to be set on the ok:true branch too, not just ok:false
//  buildPermissionGuard's scope-mismatch check (a permission code the
// caller holds, but tagged with a scope that disagrees with the current
// route's authContext.scope) reads result.needed to look the permission doc
// up in permissionByCode. Leaving it undefined on success made that whole
// check dead code: normalizePermissionCode(undefined) can never match a
// real key, so the lookup always missed and the mismatch could never fire.
const requirePermission = (code) =>
  buildPermissionGuard((perms) => ({ ok: perms.has(normalizePermissionCode(code)), needed: code }));

const hasPermission = (module, action) =>
  requirePermission(`${module}.${action}`);

const hasAnyPermission = (...permissionPairs) =>
  buildPermissionGuard((perms) => {
    const granted = permissionPairs.some((pair) => {
      if (!Array.isArray(pair) || pair.length !== 2) return false;
      const [module, action] = pair;
      return perms.has(normalizePermissionCode(`${module}.${action}`));
    });
    return granted ? { ok: true } : { ok: false, needed: "any_of_provided" };
  });

// ========== Constants ==========

const THEME_PERMISSION_GUARDS = Object.fromEntries(
  permissions
    .filter((p) => p.module === "Theme")
    .map((perm) => [perm.action, requirePermission(perm.code)])
);

const PAGE_PERMISSION_GUARDS = Object.fromEntries(
  permissions
    .filter((p) => p.module === "Page")
    .map((perm) => [perm.action, requirePermission(perm.code)])
);

const canCreateTheme = THEME_PERMISSION_GUARDS.create;
const canUpdateTheme = THEME_PERMISSION_GUARDS.update;
const canDeleteTheme = THEME_PERMISSION_GUARDS.delete;
const canPublishTheme = THEME_PERMISSION_GUARDS.publish;
const canDuplicateTheme = THEME_PERMISSION_GUARDS.duplicate;
const canExportTheme = THEME_PERMISSION_GUARDS.export;
const canImportTheme = THEME_PERMISSION_GUARDS.import;

const canCreatePage = PAGE_PERMISSION_GUARDS.create;
const canUpdatePage = PAGE_PERMISSION_GUARDS.update;
const canDeletePage = PAGE_PERMISSION_GUARDS.delete;
const canPublishPage = PAGE_PERMISSION_GUARDS.publish;
const canDuplicatePage = PAGE_PERMISSION_GUARDS.duplicate;
const canSetHomePage = PAGE_PERMISSION_GUARDS.set_home;
const canRestoreVersion = PAGE_PERMISSION_GUARDS.restore_version;
const canCompareVersions = PAGE_PERMISSION_GUARDS.compare_versions;

const isAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Accès refusé, token manquant" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, accessSecret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expiré", expired: true });
      }
      return res.status(401).json({ success: false, message: "Token invalide" });
    }

    req.userId = decoded.userId || decoded.id;

    // Support the "company" header sent by the frontend for the active store.
    // The frontend falls back to the user's own _id for this cookie when the
    // admin has no real company/store (see useLoginSubmit.js), so that exact
    // value must NOT be treated as a store scope  otherwise store-agnostic
    // resources (e.g. a user's personal notification inbox) get silently
    // filtered down to nothing.
    let storeId = req.headers.company || decoded.storeId || decoded.currentStoreId || null;
    if (storeId && storeId === req.userId) {
      storeId = null;
    }
    req.currentStoreId = storeId;


    
    req.roleIds = decoded.roleIds || [];
    req.sessionId = decoded.sessionId || null;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

// The `isAdmin` gate is based on the stable `userType` enum (single source of
// truth: utils/userTypes.js)  NOT loose role *names* which are mutable app
// data managed through the Roles/Permissions UI.
const isAdmin = (req, res, next) => {
  let authorized = false;

  if (req.user) {
    if (req.user.isSuperAdmin) {
      authorized = true;
    } else if (
      typeof req.user.userType === "string" &&
      ADMIN_USER_TYPES.includes(req.user.userType.toLowerCase())
    ) {
      authorized = true;
    } else {
      authorized = isSuperAdminRole(normalizeRoles(req.user.role));
    }
  }

  if (authorized) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Accès rûrervé aux administrateurs",
    });
  }
};
const loadUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select("email isSuperAdmin status deletedAt blockedReason blockedAt storeIds currentStoreId selectedStore role")
      .populate({
        path: "role",
        select: "name slug permissions",
        populate: {
          path: "permissions",
          select: "code scope module action",
        },
      })
      .lean();

    if (process.env.NODE_ENV !== "production") {
      logger.debug("[auth:loadUser]", {
        userId: req.userId,
        userEmail: user?.email,
        isSuperAdmin: Boolean(user?.isSuperAdmin),
        roleNames: Array.isArray(user?.role) ? user.role.map((r) => r?.name) : [user?.role?.name],
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Utilisateur introuvable" });
    }

    if (user.deletedAt) {
      return res.status(401).json({ success: false, message: "Compte désactivé" });
    }

    if (user.status === "Blocked") {
      return res.status(403).json({
        success: false,
        message: user.blockedReason || "Compte bloqué, contactez l'administrateur",
        blocked: true,
        blockedAt: user.blockedAt,
      });
    }

    const populatedRoleIds = user.role
      .filter(Boolean)
      .map((r) => typeof r === "object" ? r._id?.toString() : String(r));

    if (req.roleIds.length > 0 && !req.roleIds.every((id) => populatedRoleIds.includes(id))) {
      return res.status(401).json({ success: false, message: "Token invalide" });
    }

    req.user = user;
    // isAuth already resolved req.currentStoreId from the "company" header
    // (falling back to the JWT claim)  that must win here too. Only fall
    // back to the DB's own currentStoreId when isAuth found nothing at all,
    // otherwise a superadmin passing an explicit company header to browse a
    // specific store gets silently overridden back to their own (often
    // null) currentStoreId on every single request.
    req.currentStoreId = req.currentStoreId || user.currentStoreId || null;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const loadRider = async (req, res, next) => {
  try {
    const rider = await Rider.findById(req.userId);

    if (!rider) {
      return res.status(401).json({ success: false, message: "Livreur introuvable" });
    }

    req.rider = rider;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Utilisateur non chargé",
    });
  }

  if (process.env.NODE_ENV !== "production") {
    logger.debug("[auth:requireSuperAdmin]", {
      userId: req.user?._id?.toString?.() || req.user?.id,
      isSuperAdmin: Boolean(req.user?.isSuperAdmin),
    });
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Accès rûrervé aux super administrateurs",
  });
};

const validateStoreAccess = async (req, res, next) => {
  const { storeId } = req.params;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "storeId est requis",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Utilisateur non chargé",
    });
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  const roles = normalizeRoles(req.user.role);
  if (isSuperAdminRole(roles)) {
    return next();
  }

  const membership = await UserStore.findOne({
    userId: req.user._id,
    storeId: toObjectId(storeId),
    status: "active",
  }).populate({
    path: "roleId",
    select: "name slug permissions",
    populate: {
      path: "permissions",
      select: "code scope module action",
    },
  });

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: "Accès refusé  ce store",
    });
  }

  next();
};

const resolveTargetStoreId = (req) => {
  return (
    req.params?.storeId ||
    req.params?.id ||
    req.body?.storeId ||
    req.query?.storeId ||
    req.currentStoreId ||
    null
  );
};

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

// SO-02 golden rule: UserStore.status="active" AND the store itself must be
// usable  a membership row being active is not enough on its own if the
// store is suspended/inactive/deleted. "Usable" is NOT the literal string
// "active": Store.js's own isActive virtual treats "active", "trial" AND
// "pending" as usable (a brand-new store defaults to status:"pending" and
// its own creator must be able to use it immediately)  only "inactive",
// "suspended" and "deleted" actually block access. Mirrors that virtual
// instead of duplicating a stricter, wrong definition.
const isUsableStoreStatus = (status) => status === "active" || status === "trial" || status === "pending";

// Checked here (not only inside requireStoreAccess) because several
// controllers call hasStoreAccess directly (menuController, pageController,
// themeController) without going through that middleware, and used to skip
// the store-status check entirely.
const hasStoreAccess = async (user, storeId) => {
  if (!storeId) return null;
  if (user.isSuperAdmin) return true;

  const store = await Store.findById(storeId).select("status deletedAt").lean();
  if (!store || store.deletedAt || !isUsableStoreStatus(store.status)) return null;

  const membership = await UserStore.findOne({
    userId: user._id,
    storeId: toObjectId(storeId),
    status: "active",
  }).populate({
    path: "roleId",
    select: "name slug permissions",
    populate: {
      path: "permissions",
      select: "code scope module action",
    },
  });

  return membership;
};

const requireStoreAccess = (options = {}) => {
  const { source = "auto", required = true } = options;

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non chargé",
      });
    }

    const storeId = source === "auto" ? resolveTargetStoreId(req) : source(req);

    if (!storeId && !required) {
      return next();
    }

    if (!storeId && required) {
      return res.status(400).json({
        success: false,
        message: "storeId est requis",
      });
    }

    const store = await Store.findById(storeId).select("status deletedAt").lean();
    if (store && store.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Store introuvable",
      });
    }

    const isSuperAdmin = Boolean(req.user.isSuperAdmin);

    // SO-02: UserStore.status="active" alone isn't enough  the golden rule
    // is UserStore active AND the store itself usable (see
    // isUsableStoreStatus above  "pending" and "trial" count, only
    // inactive/suspended/deleted actually block access). A suspended/
    // inactive store must deny access to its own members even though their
    // membership row is perfectly active; only a superadmin can still reach
    // it (e.g. to review/reactivate it).
    if (!isSuperAdmin && store && !isUsableStoreStatus(store.status)) {
      return res.status(403).json({
        success: false,
        message: "Cette boutique n'est pas active",
      });
    }

    const membership = await hasStoreAccess(req.user, storeId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé  ce store",
      });
    }

    req.storeMembership = isSuperAdmin ? null : membership;
    req.storeRole = isSuperAdmin ? null : membership.roleId;
    req.storeId = storeId;

    if (!req.authContext) {
      req.authContext = {
        userId: req.user._id,
        scope: "store",
        storeId,
        membership: isSuperAdmin ? null : membership,
        role: isSuperAdmin ? null : membership.roleId,
        permissions: isSuperAdmin ? new Set() : new Set(),
        permissionByCode: isSuperAdmin ? new Map() : new Map(),
      };
    } else {
      req.authContext.scope = req.authContext.scope || "store";
      req.authContext.storeId = req.authContext.storeId || storeId;
      req.authContext.membership = isSuperAdmin ? null : (req.authContext.membership || membership);
      req.authContext.role = isSuperAdmin ? null : (req.authContext.role || membership.roleId);
    }

    if (isSuperAdmin) {
      req.authContext.isSuperAdmin = true;
    }

    if (!isSuperAdmin && !req.authContext.permissions.size) {
      for (const p of membership.roleId?.permissions || []) {
        const code = normalizePermissionCode(p.code);
        req.authContext.permissions.add(code);
        req.authContext.permissionByCode.set(code, p);
      }
    }

    next();
  };
};

// AUDIT-SECURITY-1: for list/search endpoints (audit trail, logs, ...) where
// storeId is an optional query filter rather than a required path param 
// unlike validateStoreAccess, this never 400s on a missing storeId. A Super
// Admin can query across every store; anyone else has req.query.storeId
// forced to their own store, even if they tried to pass a different one.
const scopeQueryToOwnStore = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Utilisateur non chargé" });
  }

  if (req.user.isSuperAdmin) return next();

  const roles = normalizeRoles(req.user.role);
  if (isSuperAdminRole(roles)) return next();

  const userStoreIds = [
    ...(req.user.storeIds || []),
    req.user.currentStoreId,
    req.user.selectedStore,
  ]
    .filter(Boolean)
    .map(String);

  if (userStoreIds.length === 0) {
    return res.status(403).json({ success: false, message: "Aucune boutique associé  ce compte" });
  }

  const requestedStoreId = req.query.storeId;
  if (requestedStoreId && !userStoreIds.includes(String(requestedStoreId))) {
    return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
  }

  req.query.storeId = requestedStoreId || userStoreIds[0];
  next();
};

const rateLimiter = (maxAttempts = 100, windowMinutes = 15) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const record = attempts.get(key);
    if (record && now - record.resetTime < windowMs) {
      if (record.count >= maxAttempts) {
        return res.status(429).json({
          success: false,
          message: "Trop de requêtes, veuillez réssayer plus tard",
        });
      }
      record.count += 1;
    } else {
      attempts.set(key, { count: 1, resetTime: now });
    }

    res.on("finish", () => {
      const now = Date.now();
      for (const [k, v] of attempts) {
        if (now - v.resetTime >= windowMs) {
          attempts.delete(k);
        }
      }
    });

    next();
  };
};

const auditLog = (module, action, options = {}) => {
  return async (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.connection?.remoteAddress || req.ip;
    const userAgent = req.headers["user-agent"] || "";

    const actorType =
      req.user?.isSuperAdmin || req.user?.userType === "superadmin"
        ? "platform_admin"
        : req.user?.userType === "platform_admin"
        ? "platform_admin"
        : req.user?.accountType === "rider"
        ? "rider"
        : "store_owner";

    const auditData = {
      actorType,
      actorId: req.user?._id || null,
      module,
      action,
      ip: normalizeIp(ip),
      userAgent,
      status: "success",
      severity: options.severity || "low",
      storeId: req.user?.currentStoreId || null,
    };

    if (options.logRequest) {
      auditData.newValue = {
        body: maskPii(req.body),
        params: req.params,
        query: req.query,
      };
    }

    AuditService.logAction(auditData).catch(() => {});

    res.on("finish", () => {
      if (res.statusCode >= 400 && options.logFailures !== false) {
        AuditService.logAction({
          ...auditData,
          status: "failed",
          severity: "high",
          newValue: { error: res.statusMessage || "Request failed" },
        }).catch(() => {});
      }
    });

    next();
  };
};

// ========== Permission middleware for Theme/Page/Section management ==========
// Each guard delegates to requirePermission() with a matching permission code
// (module.action canonical format  requirePermission() normalizes legacy
// module_action codes to this format too, so both sides of the merge are
// equivalent here).

module.exports = {
  isAuth,
  loadUser,
  buildPermissionGuard,
  hasPermission,
  hasAnyPermission,
  loadRider,
  requireSuperAdmin,
  requirePermission,
  normalizePermissionCode,
  isSuperAdminRole,
  validateStoreAccess,
  requireStoreAccess,
  resolveTargetStoreId,
  hasStoreAccess,
  isUsableStoreStatus,
  scopeQueryToOwnStore,
  rateLimiter,
  auditLog,
  canCreateTheme,
  canUpdateTheme,
  canDeleteTheme,
  canPublishTheme,
  canDuplicateTheme,
  canExportTheme,
  canImportTheme,
  canCreatePage,
  canUpdatePage,
  canDeletePage,
  canPublishPage,
  canDuplicatePage,
  canSetHomePage,
  canRestoreVersion,
  canCompareVersions,
  resolveAuthorizationContext: require("./resolveAuthorizationContext"),
};
