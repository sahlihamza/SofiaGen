const mongoose = require("mongoose");
const UserStore = require("../models/UserStore");
const Role = require("../models/Role");
const { resolveStoreId } = require("../utils/requestContext");
const { normalizePermissionCode } = require("../utils/normalizePermissionCode");
const { computeAccessibleModules } = require("../config/rbac/moduleAccess");

const PLATFORM_PREFIXES = ["/api/platform", "/api/v1/platform", "/api/dashboard/store-owner"];
const STORE_PARAM_PATTERNS = ["/stores/", "/store/"];

const isPlatformRoute = (req) => {
  const baseUrl = req.baseUrl || "";
  const path = req.path || "";
  return PLATFORM_PREFIXES.some((prefix) => baseUrl.startsWith(prefix) || path.startsWith(prefix));
};

const isStoreRoute = (req) => {
  const baseUrl = req.baseUrl || "";
  const path = req.path || "";
  return STORE_PARAM_PATTERNS.some((pattern) => baseUrl.includes(pattern) || path.includes(pattern));
};

const resolveStoreIdFromReq = (req) => {
  return (
    req.params?.storeId ||
    (isStoreRoute(req) ? req.params?.id : null) ||
    req.body?.storeId ||
    req.query?.storeId ||
    req.get("company") ||
    resolveStoreId(req) ||
    req.currentStoreId ||
    (!isStoreRoute(req) ? req.params?.id : null) ||
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

async function resolvePlatformPermissions(user) {
  const permissions = new Set();
  const permissionByCode = new Map();
  const roles = Array.isArray(user.role) ? user.role : user.role ? [user.role] : [];

  for (const role of roles) {
    if (!role) continue;
    for (const p of role.permissions || []) {
      const code = normalizePermissionCode(p.code);
      permissions.add(code);
      permissionByCode.set(code, p);
    }
  }

  return { permissions, permissionByCode };
}

async function resolveStorePermissions(user, storeId) {
  const permissions = new Set();
  const permissionByCode = new Map();

  if (!storeId) {
    return { permissions, permissionByCode, membership: null, role: null };
  }

  const membership = await UserStore.findOne({
    userId: user._id,
    storeId: toObjectId(storeId),
    status: "active",
  })
    .populate({
      path: "roleId",
      select: "name slug permissions",
      populate: {
        path: "permissions",
        select: "code scope module action",
      },
    })
    .lean()
    .exec();

  if (!membership) {
    return { permissions, permissionByCode, membership: null, role: null };
  }

  for (const p of membership.roleId?.permissions || []) {
    const code = normalizePermissionCode(p.code);
    permissions.add(code);
    permissionByCode.set(code, p);
  }

  return { permissions, permissionByCode, membership, role: membership.roleId };
}

const resolveAuthorizationContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Utilisateur non chargé" });
    }

    if (req.authContext && req.authContext.permissions.size > 0) {
      return next();
    }

    // SO-16: the contract is fixed-shape  every field always present, never
    // undefined. isSuperAdmin used to only ever get set by requireStoreAccess
    // (and only when it happened to run), so any route that skipped that
    // middleware left req.authContext.isSuperAdmin undefined  a caller
    // checking authContext.isSuperAdmin instead of req.user.isSuperAdmin
    // would silently treat a real superadmin as a regular user.
    req.authContext = {
      userId: req.user._id,
      isSuperAdmin: Boolean(req.user.isSuperAdmin),
      scope: null,
      storeId: null,
      membership: null,
      role: null,
      permissions: new Set(),
      permissionByCode: new Map(),
    };

    const isContextRoute = req.path === "/api/me/context";

    if (isPlatformRoute(req) || isContextRoute) {
      const platform = await resolvePlatformPermissions(req.user);
      for (const code of platform.permissions) {
        req.authContext.permissions.add(code);
        req.authContext.permissionByCode.set(code, platform.permissionByCode.get(code));
      }
      req.authContext.scope = "platform";
    }

    // Gate on the store isAuth/loadUser already resolved (company header, then
    // the JWT claim, then the user's own currentStoreId)  not on the user
    // document's currentStoreId alone. A superadmin browsing a store via the
    // company header has no currentStoreId of their own, so gating on the
    // document left authContext.storeId null and every controller reading it
    // (products, orders, &) issued an unscoped query.
    if (isStoreRoute(req) || isContextRoute || (req.currentStoreId && !isPlatformRoute(req))) {
      const storeId = isContextRoute
        ? req.user.currentStoreId
        : resolveStoreIdFromReq(req) || req.user.currentStoreId;

      if (storeId) {
        req.authContext.storeId = storeId;
        const store = await resolveStorePermissions(req.user, storeId);
        for (const code of store.permissions) {
          req.authContext.permissions.add(code);
          req.authContext.permissionByCode.set(code, store.permissionByCode.get(code));
        }
        req.authContext.membership = store.membership;
        req.authContext.role = store.role;
      }

      req.authContext.scope = "store";
    }

    // SO-16: scope must always resolve to "platform" or "store", never stay
    // null  a store-agnostic route (a personal profile/notifications
    // endpoint, say) matches neither isPlatformRoute nor isStoreRoute and
    // carries no currentStoreId, so without this every authContext.scope
    // check downstream ("platform" vs "store" permission mismatch guard in
    // buildPermissionGuard) would silently no-op instead of applying. Every
    // authenticated user has a platform identity (even with zero
    // permissions), so that's the correct default  never store, which
    // would require a storeId that doesn't exist here.
    if (!req.authContext.scope) {
      req.authContext.scope = "platform";
    }

    if (isContextRoute) {
      req.authContext.accessibleModules = computeAccessibleModules(Array.from(req.authContext.permissions));
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la résolution du contexte d'autorisation",
      error: error.message,
    });
  }
};

module.exports = resolveAuthorizationContext;
