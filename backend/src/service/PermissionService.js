/**
 * permissionService.js
 *
 * Centralised permission checking for the backend.
 * Acts as the single source of truth for "can this user do X?" so that
 * socket.js, EmailProvider.js, controllers, and services all share the
 * same logic.
 */
const Role = require("../models/Role");
const User = require("../models/User");
const logger = require("../config/logger");
const { normalizePermissionCode } = require("../utils/normalizePermissionCode");

class PermissionService {
  /**
   * Checks whether a user has a given permission code.
   *
   * Resolution order:
   *   1. Super-admin / platform-admin  always true.
   *   2. Denoormalized `user.permissions` array.
   *   3. Role-based permissions (globally-scoped + store-scoped roles).
   *
   * @param {string|ObjectId} userId
   * @param {string} permissionCode
   * @param {string|ObjectId|null} storeId - When provided, store-scoped roles are included.
   * @returns {Promise<boolean>}
   */
  async hasPermission(userId, permissionCode, storeId = null) {
    if (!userId || !permissionCode) return false;

    const normalisedCode = normalizePermissionCode(permissionCode);

    const user = await User.findById(userId)
      .select("role isSuperAdmin userType storeIds permissions status deletedAt")
      .lean();

    if (!user || user.deletedAt) return false;

    // Super-admin overrides.
    if (user.isSuperAdmin || user.userType === "superadmin") {
      return true;
    }

    // Check denormalized permissions (fast-path, no extra DB round-trip).
    if (user.permissions?.some((p) => normalizePermissionCode(p) === normalisedCode)) {
      return true;
    }

    if (!user.role || user.role.length === 0) return false;

    // Load roles that are either global (storeId == null) or scoped to the
    // requested store.
    const roles = await Role.find({
      _id: { $in: user.role },
      $or: [
        { storeId: null },
        ...(storeId ? [{ storeId }] : []),
      ],
    })
      .select("permissions scope storeId")
      .populate("permissions", "code")
      .lean();

    for (const role of roles) {
      const codes = (role.permissions || []).map((p) =>
        typeof p === "string" ? normalizePermissionCode(p) : normalizePermissionCode(p?.code)
      );
      if (codes.includes(normalisedCode)) return true;
    }

    return false;
  }

  /**
   * Returns true only if the user has *all* of the given permission codes.
   */
  async hasAllPermissions(userId, permissionCodes, storeId = null) {
    for (const code of permissionCodes) {
      if (!(await this.hasPermission(userId, code, storeId))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns true if the user has *at least one* of the given permission codes.
   */
  async hasAnyPermission(userId, permissionCodes, storeId = null) {
    for (const code of permissionCodes) {
      if (await this.hasPermission(userId, code, storeId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks tenant-scoping access: does the user belong to / administer the
   * given store?
   */
  async hasStoreAccess(userId, storeId) {
    if (!userId || !storeId) return false;

    const user = await User.findById(userId)
      .select("isSuperAdmin userType storeIds currentStoreId")
      .lean();

    if (!user) return false;
    if (user.isSuperAdmin || user.userType === "superadmin") {
      return true;
    }

    const storeIds = (user.storeIds || []).map((s) => String(s));
    if (storeIds.includes(String(storeId))) return true;

    if (user.currentStoreId && String(user.currentStoreId) === String(storeId)) return true;

    return false;
  }

  /**
   * Loads the full set of permission codes for a user (useful for caching
   * in session middleware).
   */
  async loadUserPermissions(userId, storeId = null) {
    if (!userId) return [];

    const user = await User.findById(userId)
      .select("role isSuperAdmin permissions")
      .lean();

    if (!user) return [];
    if (user.isSuperAdmin || user.userType === "superadmin") {
      return ["*"];
    }

    const codes = new Set();

    // Direct permissions.
    for (const p of user.permissions || []) {
      codes.add(normalizePermissionCode(p));
    }

    // Role-based permissions.
    if (user.role?.length > 0) {
      const roles = await Role.find({
        _id: { $in: user.role },
        $or: [
          { storeId: null },
          ...(storeId ? [{ storeId }] : []),
        ],
      })
        .select("permissions")
        .populate("permissions", "code")
        .lean();

      for (const role of roles) {
        for (const perm of role.permissions || []) {
          codes.add(
            typeof perm === "string" ? normalizePermissionCode(perm) : normalizePermissionCode(perm?.code)
          );
        }
      }
    }

    return Array.from(codes);
  }
}

module.exports = new PermissionService();
