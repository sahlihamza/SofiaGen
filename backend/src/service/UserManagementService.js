const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Role = require("../models/Role");
const UserStore = require("../models/UserStore");
const AuditService = require("./AuditService");
const PermissionService = require("./PermissionService");
const LoginHistoryService = require("./LoginHistoryService");

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const PLATFORM_USER_TYPES = new Set(["superadmin", "platform_admin"]);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeRoleIds = (role) => {
  if (Array.isArray(role)) {
    return role.filter(Boolean);
  }
  return role ? [role] : [];
};

const maskIp = (ip) => {
  if (!ip) return null;
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "xxx";
    return parts.join(".");
  }
  return ip.slice(0, Math.floor(ip.length / 2)) + "***";
};

class UserManagementService {
  async getAllUsers(filters = {}, pagination = {}, sort = "-createdAt") {
    const {
      userType,
      status: statusFilter,
      isSuperAdmin,
      role,
      roleId,
      roleIds,
      storeId,
      storeIds,
      teamId,
      department,
      twoFactorEnabled,
      twoFactorVerified,
      forcePasswordChange,
      dateFrom,
      dateTo,
      lastLoginFrom,
      lastLoginTo,
      createdBy,
      country,
      search = "",
      platformOnly = false,
    } = filters;

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 25));
    const skip = (page - 1) * limit;

    const query = { deletedAt: null };
    const andConditions = [];

    if (platformOnly) {
      const platformRoleIds = await Role.find({ scope: "platform" }).distinct("_id");
      andConditions.push({
        $or: [
        { isSuperAdmin: true },
        { role: { $in: platformRoleIds } },
        ],
      });
    }

    if (userType) {
      if (Array.isArray(userType)) {
        query.userType = { $in: userType };
      } else {
        query.userType = userType;
      }
    }
    if (statusFilter) {
      const statusAliases = { active: "Active", inactive: "Inactive", suspended: "Suspended" };
      const status = Array.isArray(statusFilter)
        ? statusFilter.map((value) => statusAliases[String(value).toLowerCase()] || value)
        : statusAliases[String(statusFilter).toLowerCase()] || statusFilter;
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    if (isSuperAdmin !== undefined) query.isSuperAdmin = isSuperAdmin;

    const roleQueryIds = roleIds || roleId || role;
    if (roleQueryIds) {
      const idsArray = Array.isArray(roleQueryIds) ? roleQueryIds : [roleQueryIds];
      const platformRoles = await Role.find({
        _id: { $in: idsArray },
        scope: "platform",
      }).select("_id").lean();
      if (platformOnly) {
        andConditions.push({
          role: { $in: platformRoles.map((platformRole) => platformRole._id) },
        });
      } else {
        query.role = { $in: platformRoles.map((platformRole) => platformRole._id) };
      }
    }

    const storeQueryIds = storeIds || storeId;
    if (storeQueryIds) {
      const idsArray = Array.isArray(storeQueryIds) ? storeQueryIds : [storeQueryIds];
      const membershipUserIds = await UserStore.distinct("userId", { storeId: { $in: idsArray } });
      // Users may be linked to stores either through UserStore memberships
      // or directly through the User.storeIds field  cover both sources.
      andConditions.push({
        $or: [
          { _id: { $in: membershipUserIds } },
          { storeIds: { $in: idsArray } },
        ],
      });
    }

    if (twoFactorEnabled !== undefined) query.twoFactorEnabled = twoFactorEnabled;
    if (twoFactorVerified !== undefined) query.twoFactorVerified = twoFactorVerified;
    if (forcePasswordChange !== undefined) query.forcePasswordChange = forcePasswordChange;
    if (teamId) query.team = teamId;
    if (department) query.department = department;
    if (country) query.country = country;
    if (createdBy) query.createdBy = createdBy;

    if (lastLoginFrom || lastLoginTo) {
      query.lastLogin = {};
      if (lastLoginFrom) query.lastLogin.$gte = new Date(lastLoginFrom);
      if (lastLoginTo) {
        const lastLoginEnd = new Date(lastLoginTo);
        lastLoginEnd.setHours(23, 59, 59, 999);
        query.lastLogin.$lte = lastLoginEnd;
      }
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const createdAtEnd = new Date(dateTo);
        createdAtEnd.setHours(23, 59, 59, 999);
        query.createdAt.$lte = createdAtEnd;
      }
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      const searchConditions = [
        { name: { $regex: safeSearch, $options: "i" } },
        { firstName: { $regex: safeSearch, $options: "i" } },
        { lastName: { $regex: safeSearch, $options: "i" } },
        { displayName: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
      ];
      if (mongoose.Types.ObjectId.isValid(String(search))) {
        searchConditions.push({ _id: new mongoose.Types.ObjectId(String(search)) });
      }
      andConditions.push({ $or: searchConditions });
    }

    if (andConditions.length > 0) query.$and = andConditions;

    const [total, active, suspended, superAdmins] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ ...query, status: "Active" }),
      User.countDocuments({ ...query, status: "Suspended" }),
      User.countDocuments({ ...query, isSuperAdmin: true }),
    ]);

    const allowedSortFields = new Set([
      "name", "firstName", "lastName", "email", "status", "userType", "lastLogin", "createdAt", "updatedAt",
    ]);
    const requestedSort = typeof sort === "string" ? sort : "-createdAt";
    const sortField = requestedSort.replace(/^-/, "");
    const sortQuery = allowedSortFields.has(sortField)
      ? requestedSort
      : "-createdAt";

    const users = await User.find(query)
      .populate({
        path: "role",
        select: "name slug scope permissions",
        populate: { path: "permissions", select: "code scope module action" },
      })
      .populate("storeIds", "name")
      .populate("currentStoreId", "name")
      .populate("createdBy", "name email")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .select("-password -refreshToken -passwordResetToken -passwordResetExpires -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -invitationToken -invitationTokenExpires")
      .lean();

    const memberships = await UserStore.find({ userId: { $in: users.map((user) => user._id) } })
      .populate("storeId", "name slug status")
      .populate({
        path: "roleId",
        select: "name slug scope permissions",
        populate: { path: "permissions", select: "code scope module action" },
      })
      .lean();
    const membershipsByUser = new Map();
    for (const membership of memberships) {
      const key = String(membership.userId);
      membershipsByUser.set(key, [...(membershipsByUser.get(key) || []), membership]);
    }
    const enrichedUsers = users.map((user) => {
      const storeMemberships = membershipsByUser.get(String(user._id)) || [];
      const stores = storeMemberships.filter((membership) => membership.storeId).map((membership) => membership.storeId);
      const platformRoles = (user.role || []).filter((role) => role?.scope === "platform");
      const platformType = user.isSuperAdmin || platformRoles.length > 0
        ? (stores.length > 0 ? "multi-store" : "platform")
        : (stores.length > 1 ? "multi-store" : "store");
      return { ...user, storeMemberships, stores, storeCount: stores.length, platformRoles, platformType };
    });

    return {
      users: enrichedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      stats: { total, active, suspended, superAdmins },
    };
  }

  async searchUsers(query, limit = 10) {
    if (!query || !String(query).trim()) return [];
    const q = String(query).trim();
    const regex = { $regex: q, $options: "i" };
    return await User.find({
      deletedAt: null,
      $or: [
        { name: regex },
        { firstName: regex },
        { lastName: regex },
        { displayName: regex },
        { email: regex },
        { phone: regex },
      ],
    })
      .select("name firstName lastName email phone image userType status isSuperAdmin displayName")
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async createUser(data) {
    const {
      name,
      firstName,
      lastName,
      email,
      password,
      phone,
      userType = "platform_admin",
      isSuperAdmin = false,
      role: roleInput,
      storeIds,
      primaryStoreId,
      status = "Active",
      twoFactorEnabled = false,
      twoFactorRequired = false,
      image,
      address,
      country,
      city,
      gender,
      selectedStore,
      joiningData,
      sendInvitationEmail = true,
    } = data;

    const exists = await User.findOne({ email, deletedAt: null });
    if (exists) {
      const error = new Error("Cet email est déjà utilisé");
      error.name = "EmailExists";
      error.code = 11000;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = password
      ? await bcrypt.hash(password, salt)
      : null;

    const roleIds = normalizeRoleIds(roleInput);
    if (isSuperAdmin) {
      const error = new Error("La création d'un Super Admin nécessite un bootstrap explicite");
      error.name = "Forbidden";
      throw error;
    }

    const isPlatformUserType = PLATFORM_USER_TYPES.has(userType);

    if (roleIds.length === 0) {
      // No role supplied: resolve a scope-appropriate default instead of
      // silently assigning a store-scoped role. This prevents a user created
      // from the SuperAdmin / platform context from being silently turned into
      // a "store_admin" with a store role and no store (see PLAT-USER-01).
      if (isPlatformUserType) {
        const defaultRole = await Role.findOne({ slug: "platform-admin", scope: "platform" });
        if (!defaultRole) {
          const error = new Error(
            "Aucun rôle plateforme par défaut n'a t trouvé  créz un rôle plateforme ou assignez-en un explicitement"
          );
          error.name = "DefaultRoleNotFound";
          throw error;
        }
        roleIds.push(defaultRole._id);
      } else {
        const store = primaryStoreId || (storeIds && storeIds[0]) || null;
        if (!store) {
          const error = new Error(
            "La création d'un utilisateur store nécessite un store ou un rôle explicite  aucun rôle store n'est assigné par défaut"
          );
          error.name = "DefaultRoleNotFound";
          throw error;
        }
        const defaultRole = await Role.findOne({ name: "Admin", scope: "store", storeId: store });
        if (!defaultRole) {
          const error = new Error(
            "Aucun rôle 'Admin' par défaut trouvé pour ce store  créz-en un ou assignez un rôle explicitement"
          );
          error.name = "DefaultRoleNotFound";
          throw error;
        }
        roleIds.push(defaultRole._id);
      }
    } else {
      const validRoles = await Role.find({ _id: { $in: roleIds } });
      if (validRoles.length !== roleIds.length) {
        const error = new Error("Un ou plusieurs rôles sont invalides");
        error.name = "InvalidRoles";
        throw error;
      }
      if (isPlatformUserType && validRoles.some((role) => role.scope !== "platform")) {
        const error = new Error("Un utilisateur plateforme ne peut recevoir qu'un rôle plateforme");
        error.name = "InvalidRoleScope";
        throw error;
      }
    }

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || name;
    const resolvedName = name || displayName;

     const invitationToken = crypto.randomBytes(32).toString("hex");
    const invitationTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const userData = {
      name: resolvedName,
      firstName,
      lastName,
      displayName,
      email,
      password: hashedPassword,
      phone,
      userType,
      isSuperAdmin,
      role: roleIds,
      status: userType === "superadmin" ? "Active" : status,
      storeIds,
      primaryStoreId: primaryStoreId || (storeIds && storeIds[0]) || null,
      image,
      address,
      country,
      city,
      gender,
      selectedStore,
      joiningData,
      invitationToken,
      invitationTokenExpires,
      emailVerified: !!password,
      provider: password ? "local" : "invitation",
    };

    if (twoFactorEnabled || twoFactorRequired) {
      userData.twoFactorEnabled = true;
      userData.twoFactorSecret = crypto.randomBytes(32).toString("hex");
    }

    const user = new User(userData);
    const savedUser = await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: data.createdBy || null,
      module: "platform.user",
      action: "platform.user.created",
      entityType: "user",
      entityId: savedUser._id,
      status: "success",
      severity: "medium",
      changes: null,
      newValue: {
        name: savedUser.name,
        email: savedUser.email,
        userType: savedUser.userType,
        isSuperAdmin: savedUser.isSuperAdmin,
        storeIds: savedUser.storeIds,
        role: savedUser.role,
      },
      metadata: { actorId: data.createdBy || null, targetUserId: savedUser._id, timestamp: new Date().toISOString() },
    });

    // Send invitation email if requested (best-effort, non-blocking)
    if (sendInvitationEmail && !password) {
      try {
        const { sendInvitationEmail: sendEmail } = require("../utils/mailer");
        const invitationUrl = `${process.env.ADMIN_BASE_URL || process.env.FRONTEND_URL || ""}/invite?token=${invitationToken}`;
        await sendEmail(savedUser.email, savedUser.name, invitationUrl);
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError.message);
      }
    }

    return {
      user: await this._sanitizeUser(savedUser),
      invitationToken: password ? null : invitationToken,
      invitationUrl: password
        ? null
        : `${process.env.ADMIN_BASE_URL || process.env.FRONTEND_URL || ""}/invite?token=${invitationToken}`,
    };
  }

  async _sanitizeUser(user) {
    return user.toObject({
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.twoFactorSecret;
        delete ret.twoFactorBackupCodes;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.invitationToken;
        delete ret.invitationTokenExpires;
        delete ret.emailVerificationToken;
        return ret;
      },
    });
  }

  async getUserById(userId) {
    const user = await User.findOne({ _id: userId, deletedAt: null })
      .populate({
        path: "role",
        select: "name slug scope permissions",
        populate: { path: "permissions", select: "code scope module action" },
      })
      .populate("storeIds", "name")
      .populate("currentStoreId", "name")
      .populate("primaryStoreId", "name")
      .select("-password -refreshToken -passwordResetToken -passwordResetExpires -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -invitationToken -invitationTokenExpires");

    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const storeMemberships = await UserStore.find({ userId: user._id })
      .populate("storeId", "name slug status")
      .populate("roleId", "name slug scope")
      .lean();

    const userObj = user.toJSON ? user.toJSON() : user.toObject();
    const platformRoles = (userObj.role || []).filter((role) => role?.scope === "platform");
    userObj.platformRoles = platformRoles;
    userObj.platformPermissions = [
      ...new Map(
        platformRoles
          .flatMap((role) => role.permissions || [])
          .filter((permission) => permission?.code)
          .map((permission) => [permission.code, permission])
      ).values(),
    ];
    userObj.storeMemberships = storeMemberships.map((m) => ({
      storeId: m.storeId?._id,
      storeName: m.storeId?.name,
      storeSlug: m.storeId?.slug,
      storeStatus: m.storeId?.status,
      roleId: m.roleId?._id,
      roleName: m.roleId?.name,
      roleSlug: m.roleId?.slug,
      roleScope: m.roleId?.scope,
      status: m.status,
      invitedBy: m.invitedBy,
      expiresAt: m.expiresAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return userObj;
  }

  async updateUser(userId, data) {
    const {
      name,
      firstName,
      lastName,
      displayName,
      email,
      phone,
      userType,
      isSuperAdmin,
      role: roleInput,
      storeIds,
      primaryStoreId,
      status,
      image,
      address,
      country,
      city,
      gender,
      preferences,
    } = data;

    const existingUser = await User.findOne({ _id: userId, deletedAt: null });
    if (!existingUser) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const oldValues = {
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      userType: existingUser.userType,
      isSuperAdmin: existingUser.isSuperAdmin,
      status: existingUser.status,
      role: existingUser.role,
    };

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (displayName !== undefined) updates.displayName = displayName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (userType !== undefined) updates.userType = userType;
    if (isSuperAdmin !== undefined) updates.isSuperAdmin = isSuperAdmin;
    if (status !== undefined) updates.status = status;
    if (image !== undefined) updates.image = image;
    if (address !== undefined) updates.address = address;
    if (country !== undefined) updates.country = country;
    if (city !== undefined) updates.city = city;
    if (gender !== undefined) updates.gender = gender;
    if (preferences !== undefined) updates.preferences = preferences;

    if (roleInput !== undefined) {
      const roleIds = normalizeRoleIds(roleInput);
      const validRoles = await Role.find({ _id: { $in: roleIds }, scope: "platform" });
      if (validRoles.length !== roleIds.length) {
        const error = new Error("Un ou plusieurs rôles sont invalides");
        error.name = "InvalidRoleScope";
        throw error;
      }
      updates.role = roleIds;
    }

    if (email && email !== existingUser.email) {
      const emailTaken = await User.findOne({ email, deletedAt: null, _id: { $ne: userId } });
      if (emailTaken) {
        const error = new Error("Cet email est déjà utilisé");
        error.name = "EmailExists";
        error.code = 11000;
        throw error;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    })
      .populate("role", "name slug scope permissions")
      .populate("storeIds", "name")
      .populate("primaryStoreId", "name")
      .select("-password -refreshToken -passwordResetToken -passwordResetExpires -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -invitationToken -invitationTokenExpires");

    const fieldChanges = {};
    for (const key of Object.keys(updates)) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(updates[key])) {
        fieldChanges[key] = { from: oldValues[key], to: updates[key] };
      }
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: data.updatedBy || null,
      module: "platform.user",
      action: fieldChanges.role ? "platform.user.role_changed" : "platform.user.updated",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: Object.keys(fieldChanges).length > 0 ? "medium" : "low",
      changes: fieldChanges,
      oldValue: oldValues,
      newValue: updates,
      metadata: { actorId: data.updatedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return updatedUser;
  }

  async deleteUser(userId, deletedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.isSuperAdmin) {
      const error = new Error("Impossible de supprimer un super administrateur");
      error.name = "Forbidden";
      throw error;
    }

    await User.findByIdAndUpdate(userId, {
      deletedAt: new Date(),
      status: "Inactive",
      email: `${user.email}.deleted.${Date.now()}`,
      refreshToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: deletedBy || null,
      module: "platform.user",
      action: "platform.user.deleted",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "critical",
      changes: { name: user.name, email: user.email },
      oldValue: { name: user.name, email: user.email },
      metadata: { actorId: deletedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { success: true };
  }

  async suspendUser(userId, reason, suspendedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const oldStatus = user.status;
    const oldSuspendedAt = user.suspendedAt;
    const oldSuspendedReason = user.suspendedReason;

    user.status = "Suspended";
    user.suspendedAt = new Date();
    user.suspendedReason = reason || "Compte suspendu par l'administration";
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: suspendedBy || null,
      module: "platform.user",
      action: "platform.user.suspended",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "high",
      changes: {
        status: { from: oldStatus, to: "Suspended" },
        suspendedReason: { from: oldSuspendedReason, to: user.suspendedReason },
      },
      oldValue: { status: oldStatus, suspendedAt: oldSuspendedAt },
      newValue: { status: "Suspended", suspendedAt: user.suspendedAt, suspendedReason: user.suspendedReason },
      metadata: { actorId: suspendedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async reactivateUser(userId, reactivatedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.status !== "Suspended") {
      const error = new Error("Cet utilisateur n'est pas suspendu");
      error.name = "ValidationError";
      throw error;
    }

    const oldStatus = user.status;
    const oldSuspendedAt = user.suspendedAt;
    user.status = "Active";
    user.suspendedAt = null;
    user.suspendedUntil = null;
    user.suspendedReason = null;
    user.failedLoginAttempts = 0;
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: reactivatedBy || null,
      module: "platform.user",
      action: "platform.user.activated",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      changes: {
        status: { from: oldStatus, to: "Active" },
        suspendedAt: { from: oldSuspendedAt, to: null },
      },
      oldValue: { status: oldStatus, suspendedAt: oldSuspendedAt },
      newValue: { status: "Active", suspendedAt: null },
      metadata: { actorId: reactivatedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async resetPassword(userId, newPassword, actorId = null) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = Date.now() + 60 * 60 * 1000;

    user.passwordResetToken = newPassword ? null : hashedToken;
    user.passwordResetExpires = newPassword ? null : expires;

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.refreshToken = null;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
    }

    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "Platform User",
      action: newPassword ? "reset_password" : "password_reset_requested",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: newPassword ? "high" : "medium",
      changes: { password: { from: "[hidden]", to: "[reset]" } },
      metadata: { actorId: actorId || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { user: await this._sanitizeUser(user), resetToken: newPassword ? null : rawToken };
  }

  async reset2FA(userId, actorId = null) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = backupCodes;
    await user.save({ validateBeforeSave: false });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "Platform User",
      action: "reset_2fa",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "high",
      changes: { twoFactorEnabled: { from: true, to: false } },
      metadata: { actorId: actorId || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { backupCodes };
  }

  async logoutAllDevices(userId, loggedOutBy) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    await User.findByIdAndUpdate(userId, { refreshToken: null });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: loggedOutBy || null,
      module: "platform.user",
      action: "platform.user.sessions_revoked",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "high",
      changes: { refreshToken: { from: "[active]", to: "[revoked]" } },
      metadata: { actorId: loggedOutBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { success: true };
  }

  async assignRole(userId, roleId, storeId = null, expiresAt = null, assignedBy = null) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const role = await Role.findById(roleId);
    if (!role) {
      const error = new Error("Rôle introuvable");
      error.name = "NotFound";
      throw error;
    }
    if (role.scope !== "platform") {
      const error = new Error("Un rôle Store ne peut pas être assigné depuis la gestion plateforme");
      error.name = "InvalidRoleScope";
      throw error;
    }

    const roleIdStr = String(roleId);
    const alreadyHasRole = user.role.some((r) => String(r) === roleIdStr);

    if (!alreadyHasRole) {
      user.role.push(roleId);
      await user.save({ validateBeforeSave: false });
    }

    if (storeId || expiresAt) {
      // Store-scoped role metadata is logged for audit purposes
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: assignedBy || null,
        module: "Platform User",
        action: "assign_role_store_scoped",
        entityType: "user",
        entityId: userId,
        status: "success",
        severity: "medium",
        newValue: { roleId: role._id, roleName: role.name, storeId, expiresAt },
        metadata: { actorId: assignedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
      });
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: assignedBy || null,
      module: "Platform User",
      action: "assign_role",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      newValue: { roleId: role._id, roleName: role.name, storeId, expiresAt },
      metadata: { actorId: assignedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async removeRole(userId, roleId, removedBy = null) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const role = await Role.findById(roleId);
    if (!role) {
      const error = new Error("Rôle introuvable");
      error.name = "NotFound";
      throw error;
    }
    if (role.scope !== "platform") {
      const error = new Error("Un rôle Store ne peut pas être retiré depuis la gestion plateforme");
      error.name = "InvalidRoleScope";
      throw error;
    }

    user.role = user.role.filter((r) => String(r) !== String(roleId));
    await user.save({ validateBeforeSave: false });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: removedBy || null,
      module: "Platform User",
      action: "remove_role",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      newValue: { roleId },
      metadata: { actorId: removedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async getEffectivePermissions(userId) {
    const user = await User.findById(userId).populate({
      path: "role",
      populate: { path: "permissions" },
    });

    if (!user) return [];

    if (user.isSuperAdmin) return ["*"];

    const codes = new Set();
    for (const role of user.role || []) {
      if (role?.scope !== "platform") continue;
      for (const perm of role?.permissions || []) {
        if (perm?.code) {
          codes.add(perm.code);
        } else if (perm?.module && perm?.action) {
          codes.add(
            `${String(perm.module).toLowerCase().replace(/\s+/g, "_")}_${String(perm.action).toLowerCase()}`
          );
        }
      }
    }

    return Array.from(codes);
  }

  async bulkAction(userIds, action, data = {}) {
    const results = [];
    for (const userId of userIds) {
      try {
        let result;
        switch (action) {
          case "suspend":
            result = await this.suspendUser(userId, data.reason);
            break;
          case "delete":
            result = await this.deleteUser(userId, data.deletedBy);
            break;
          case "reactivate":
            result = await this.reactivateUser(userId);
            break;
          case "assign_role":
            result = await this.assignRole(userId, data.roleId);
            break;
          case "block":
            result = await this.blockUser(userId, data.reason, data.blockedBy);
            break;
          case "unblock":
            result = await this.unblockUser(userId, data.unblockedBy);
            break;
          case "archive":
            result = await this.archiveUser(userId, data.reason, data.archivedBy);
            break;
          case "unarchive":
            result = await this.unarchiveUser(userId, data.unarchivedBy);
            break;
          case "force_password_change":
            result = await this.forcePasswordChange(userId, null, data.forcedBy);
            break;
          default:
            throw new Error(`Action inconnue: ${action}`);
        }
        const safeResult = result && typeof result.toObject === "function"
          ? this._sanitizeUser(result)
          : result;
        results.push({ userId, success: true, result: safeResult });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    return results;
  }

  async getStats() {
    const [totalUsers, superAdmins, storeAdmins, staff, customers, suspended] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ isSuperAdmin: true, deletedAt: null }),
      User.countDocuments({ userType: "store_admin", deletedAt: null }),
      User.countDocuments({ userType: "staff", deletedAt: null }),
      User.countDocuments({ userType: "customer", deletedAt: null }),
      User.countDocuments({ status: "Suspended", deletedAt: null }),
    ]);

    return {
      totalUsers,
      superAdmins,
      storeAdmins,
      staff,
      customers,
      suspended,
    };
  }

  /**
   * Export users as CSV or JSON.
   * Returns an object with { format, data, downloadUrl }.
   */
  async bulkExport(userIds, format = "csv") {
    const query = {
      deletedAt: null,
      _id: { $in: userIds },
    };

    const users = await User.find(query)
      .populate("role", "name slug")
      .select("-password -refreshToken -passwordResetToken -passwordResetExpires -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -invitationToken -invitationTokenExpires -storeIds")
      .lean();

    if (format === "json") {
      const memberships = await UserStore.find({ userId: { $in: userIds } })
        .populate("storeId", "name slug status")
        .lean();
      const membershipsByUser = new Map();
      for (const membership of memberships) {
        const key = String(membership.userId);
        membershipsByUser.set(key, [...(membershipsByUser.get(key) || []), membership]);
      }

      const enrichedUsers = users.map((user) => {
        const storeMemberships = membershipsByUser.get(String(user._id)) || [];
        const { storeIds, ...userWithoutStoreIds } = user;
        return {
          ...userWithoutStoreIds,
          storeMemberships: storeMemberships.map((m) => ({
            storeId: m.storeId?._id,
            storeName: m.storeId?.name,
            storeSlug: m.storeId?.slug,
            storeStatus: m.storeId?.status,
            roleId: m.roleId,
            status: m.status,
          })),
          storeCount: storeMemberships.length,
          stores: storeMemberships
            .filter((m) => m.storeId)
            .map((m) => m.storeId),
        };
      });

      return {
        format: "json",
        data: JSON.stringify(enrichedUsers, null, 2),
        downloadUrl: null,
        count: users.length,
      };
    }

    // CSV format
    const csvHeaders = [
      "email",
      "firstName",
      "lastName",
      "name",
      "phone",
      "userType",
      "isSuperAdmin",
      "status",
      "suspendedReason",
      "twoFactorEnabled",
      "lastLogin",
      "createdAt",
      "roles",
      "stores",
      "storeCount",
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const memberships = await UserStore.find({ userId: { $in: userIds } })
      .populate("storeId", "name slug status")
      .lean();
    const membershipsByUser = new Map();
    for (const membership of memberships) {
      const key = String(membership.userId);
      membershipsByUser.set(key, [...(membershipsByUser.get(key) || []), membership]);
    }

    const csvLines = [csvHeaders.join(",")];
    for (const user of users) {
      const storeMemberships = membershipsByUser.get(String(user._id)) || [];
      const row = {
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        name: user.name || "",
        phone: user.phone || "",
        userType: user.userType || "",
        isSuperAdmin: user.isSuperAdmin || false,
        status: user.status || "",
        suspendedReason: user.suspendedReason || "",
        twoFactorEnabled: user.twoFactorEnabled || false,
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : "",
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
        roles: Array.isArray(user.role)
          ? user.role.map((r) => (typeof r === "object" ? r.name : r)).join(";")
          : "",
        stores: storeMemberships
          .filter((m) => m.storeId)
          .map((m) => (typeof m.storeId === "object" ? m.storeId.name : String(m.storeId)))
          .join(";"),
        storeCount: storeMemberships.length,
      };
      csvLines.push(csvHeaders.map((h) => escapeCsv(row[h])).join(","));
    }

    return {
      format: "csv",
      data: csvLines.join("\n"),
      downloadUrl: null,
      count: users.length,
    };
  }

  /**
   * Get user activity logs (audit trail).
   */
  async getUserActivity(userId, limit = 50) {
    const logs = await AuditService.getAuditLogsByUser(userId, {
      limit,
    });
    return logs;
  }

  /**
   * Get active sessions for a user.
   */
  async getUserSessions(userId) {
    const user = await User.findById(userId).select("activeSessions");
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }
    return user.activeSessions || [];
  }

  /**
   * Logout a specific device/session by sessionId.
   */
  async logoutDevice(userId, sessionId, actorId = null) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const originalCount = user.activeSessions.length;
    user.activeSessions = user.activeSessions.filter(
      (s) => s.sessionId !== sessionId
    );

    if (user.activeSessions.length < originalCount) {
      await user.save({ validateBeforeSave: false });

      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: actorId || null,
        module: "Platform User",
        action: "logout_device",
        entityType: "user",
        entityId: userId,
        status: "success",
        severity: "medium",
        newValue: { sessionId: sessionId || "[unknown]" },
        metadata: { actorId: actorId || null, targetUserId: userId, timestamp: new Date().toISOString() },
      });

      return { success: true, removed: true };
    }

    return { success: true, removed: false };
  }

  /**
   * Bulk assign a role to multiple users.
   */
  async bulkAssignRole(userIds, roleId, storeId = null, assignedBy = null) {
    const role = await Role.findById(roleId);
    if (!role) {
      const error = new Error("Rôle introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (role.scope !== "platform") {
      const error = new Error("Un rôle Store ne peut pas être assigné depuis la gestion plateforme");
      error.name = "InvalidRoleScope";
      throw error;
    }

    const results = [];
    let affected = 0;

    for (const userId of userIds) {
      try {
        const user = await User.findOne({ _id: userId, deletedAt: null });
        if (!user) {
          results.push({ userId, success: false, error: "Utilisateur introuvable" });
          continue;
        }

        const roleIdStr = String(roleId);
        if (!user.role.some((r) => String(r) === roleIdStr)) {
          user.role.push(roleId);
          await user.save({ validateBeforeSave: false });
          affected += 1;
        }

      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: assignedBy || null,
        module: "Platform User",
        action: "bulk_assign_role",
        entityType: "user",
        entityId: userId,
        status: "success",
        severity: "medium",
        newValue: { roleId: role._id, roleName: role.name, storeId },
        metadata: { actorId: assignedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
      });

        results.push({ userId, success: true });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

     return { affected, results };
  }

  async blockUser(userId, reason, blockedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.isSuperAdmin) {
      const error = new Error("Impossible de bloquer un super administrateur");
      error.name = "Forbidden";
      throw error;
    }

    const oldStatus = user.status;
    const oldBlockedAt = user.blockedAt;

    user.status = "Blocked";
    user.blockedAt = new Date();
    user.blockedReason = reason || "Compte bloqué par l'administration";
    user.blockedBy = blockedBy || null;
    user.refreshToken = null;
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: blockedBy || null,
      module: "Platform User",
      action: "block_user",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "high",
      changes: {
        status: { from: oldStatus, to: "Blocked" },
        blockedReason: { from: oldBlockedAt ? user.blockedReason : null, to: user.blockedReason },
      },
      oldValue: { status: oldStatus, blockedAt: oldBlockedAt },
      newValue: { status: "Blocked", blockedAt: user.blockedAt, blockedReason: user.blockedReason },
      metadata: { actorId: blockedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async unblockUser(userId, unblockedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.status !== "Blocked") {
      const error = new Error("Cet utilisateur n'est pas bloqué");
      error.name = "ValidationError";
      throw error;
    }

    const oldStatus = user.status;
    const oldBlockedReason = user.blockedReason;

    user.status = "Active";
    user.blockedAt = null;
    user.blockedReason = null;
    user.blockedBy = null;
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: unblockedBy || null,
      module: "Platform User",
      action: "unblock_user",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      changes: {
        status: { from: oldStatus, to: "Active" },
        blockedReason: { from: oldBlockedReason, to: null },
      },
      oldValue: { status: oldStatus, blockedReason: oldBlockedReason },
      newValue: { status: "Active", blockedReason: null },
      metadata: { actorId: unblockedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async archiveUser(userId, reason, archivedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.isSuperAdmin) {
      const error = new Error("Impossible d'archiver un super administrateur");
      error.name = "Forbidden";
      throw error;
    }

    const oldStatus = user.status;
    const oldArchivedAt = user.archivedAt;

    user.status = "Archived";
    user.archivedAt = new Date();
    user.archivedBy = archivedBy || null;
    user.archivedReason = reason || null;
    user.refreshToken = null;
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: archivedBy || null,
      module: "Platform User",
      action: "archive_user",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      changes: {
        status: { from: oldStatus, to: "Archived" },
      },
      oldValue: { status: oldStatus, archivedAt: oldArchivedAt },
      newValue: { status: "Archived", archivedAt: user.archivedAt },
      metadata: { actorId: archivedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async unarchiveUser(userId, unarchivedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.status !== "Archived") {
      const error = new Error("Cet utilisateur n'est pas archivé");
      error.name = "ValidationError";
      throw error;
    }

    const oldStatus = user.status;
    const oldArchivedReason = user.archivedReason;

    user.status = "Active";
    user.archivedAt = null;
    user.archivedBy = null;
    user.archivedReason = null;
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: unarchivedBy || null,
      module: "Platform User",
      action: "unarchive_user",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      changes: {
        status: { from: oldStatus, to: "Active" },
        archivedReason: { from: oldArchivedReason, to: null },
      },
      oldValue: { status: oldStatus, archivedReason: oldArchivedReason },
      newValue: { status: "Active", archivedReason: null },
      metadata: { actorId: unarchivedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async impersonateUser(userId, reason, impersonatedBy, ttlMinutes) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (!reason || String(reason).trim().length === 0) {
      const error = new Error("Un motif (reason) est obligatoire pour usurper un compte");
      error.name = "ValidationError";
      throw error;
    }

    if (user.status === "Blocked" || user.status === "Archived" || user.status === "Deleted") {
      const error = new Error("Impossible d'usurper un compte dans cet état");
      error.name = "Forbidden";
      throw error;
    }

    // A Super Admin can never be impersonated (defence in depth).
    if (user.isSuperAdmin) {
      const error = new Error("Impossible d'usurper un super administrateur");
      error.name = "Forbidden";
      throw error;
    }

    // TTL is bounded to [1, 1440] minutes (1 hour default, up to 24 hours).
    const ttl = Math.max(1, Math.min(Number(ttlMinutes) || 60, 1440));
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    const targetUserId = String(user._id);
    const actorId = impersonatedBy ? String(impersonatedBy) : null;
    const sanitizedReason = String(reason).trim();

    // Issue a real, short-lived access token that represents the impersonated
    // user, carrying an `impersonation` claim for auditability. The token is
    // signed with the platform access secret and expires with the requested TTL.
    let token = null;
    if (accessSecret) {
      token = jwt.sign(
        {
          id: targetUserId,
          userId: targetUserId,
          roleIds: (user.role || []).map((r) => String(r)),
          storeId: user.currentStoreId
            ? String(user.currentStoreId)
            : (user.storeIds && user.storeIds[0])
              ? String(user.storeIds[0])
              : null,
          sessionId: crypto.randomBytes(16).toString("hex"),
          impersonation: {
            actorId,
            targetUserId,
            reason: sanitizedReason,
            expiresAt: expiresAt.toISOString(),
          },
        },
        accessSecret,
        { expiresIn: `${ttl}m` }
      );
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId,
      module: "Platform User",
      action: "platform.user.impersonate",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "critical",
      newValue: {
        impersonatedUser: {
          name: user.name,
          email: user.email,
          userType: user.userType,
        },
        reason: sanitizedReason,
        ttlMinutes: ttl,
        expiresAt: expiresAt.toISOString(),
        tokenIssued: token ? true : false,
      },
      metadata: { actorId, targetUserId, timestamp: new Date().toISOString() },
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      ttlMinutes: ttl,
      user: await this._sanitizeUser(user),
    };
  }

  async duplicateUser(userId, data, duplicatedBy) {
    const sourceUser = await User.findOne({ _id: userId, deletedAt: null })
      .populate("role", "name slug")
      .populate("storeIds", "name")
      .lean();
    if (!sourceUser) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const invitationUrl = `${process.env.ADMIN_BASE_URL || process.env.FRONTEND_URL || ""}/invite?token=${rawToken}`;

    const roleIds = Array.isArray(sourceUser.role)
      ? sourceUser.role.map((r) => (typeof r === "object" ? r._id : r))
      : [];

    const storeIds = Array.isArray(sourceUser.storeIds)
      ? sourceUser.storeIds.map((s) => (typeof s === "object" ? s._id : s))
      : [];

    const dupUser = new User({
      ...sourceUser,
      _id: undefined,
      email: data.email || sourceUser.email,
      name: data.name || sourceUser.name,
      firstName: data.firstName || sourceUser.firstName,
      lastName: data.lastName || sourceUser.lastName,
      displayName: data.displayName || sourceUser.displayName,
      phone: data.phone || sourceUser.phone,
      password: null,
      refreshToken: null,
      invitationToken: rawToken,
      invitationTokenExpires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      emailVerified: false,
      provider: "invitation",
      twoFactorEnabled: false,
      twoFactorVerified: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorPhone: null,
      status: "Invited",
      blockedAt: null,
      blockedReason: null,
      blockedBy: null,
      archivedAt: null,
      archivedBy: null,
      archivedReason: null,
      suspendedAt: null,
      suspendedUntil: null,
      suspendedReason: null,
      failedLoginAttempts: 0,
      lastLogin: null,
      lastLoginIp: null,
      forcePasswordChange: true,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const saved = await dupUser.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: duplicatedBy || null,
      module: "Platform User",
      action: "duplicate_user",
      entityType: "user",
      entityId: saved._id,
      status: "success",
      severity: "medium",
      newValue: {
        sourceUserId: userId,
        email: saved.email,
        name: saved.name,
        roleIds,
        storeIds,
        invitationUrl,
      },
      metadata: { actorId: duplicatedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return {
      user: await this._sanitizeUser(saved),
      invitationToken: rawToken,
      invitationUrl,
    };
  }

  async resendInvitation(userId, resendBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (user.status !== "Invited" && user.status !== "PendingActivation") {
      const error = new Error("Cet utilisateur n'a pas d'invitation en attente");
      error.name = "ValidationError";
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.invitationToken = rawToken;
    user.invitationTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await user.save();

    const invitationUrl = `${process.env.ADMIN_BASE_URL || process.env.FRONTEND_URL || ""}/invite?token=${rawToken}`;

    try {
      const { sendInvitationEmail: sendEmail } = require("../utils/mailer");
      await sendEmail(user.email, user.name, invitationUrl);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError.message);
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: resendBy || null,
      module: "Platform User",
      action: "resend_invitation",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      newValue: { invitationUrl },
      metadata: { actorId: resendBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return {
      user: await this._sanitizeUser(user),
      invitationToken: rawToken,
      invitationUrl,
    };
  }

  async forcePasswordChange(userId, newPassword, forcedBy) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (!newPassword) {
      user.forcePasswordChange = true;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();

      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: forcedBy || null,
        module: "Platform User",
        action: "force_password_change",
        entityType: "user",
        entityId: userId,
        status: "success",
        severity: "medium",
        newValue: { forcePasswordChange: true },
        metadata: { actorId: forcedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
      });

      return { user: await this._sanitizeUser(user), passwordResetToken: null };
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.forcePasswordChange = false;
    user.forcePasswordChange = true;
    user.lastPasswordChange = new Date();
    user.refreshToken = null;
    await user.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: forcedBy || null,
      module: "Platform User",
      action: "force_password_change",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "high",
      changes: { password: { from: "[hidden]", to: "[reset]" } },
      metadata: { actorId: forcedBy || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { user: await this._sanitizeUser(user) };
  }

  async sendSetupEmail(userId, sendByEmail) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.invitationToken = rawToken;
    user.invitationTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    user.status = "PendingActivation";
    await user.save();

    const invitationUrl = `${process.env.ADMIN_BASE_URL || process.env.FRONTEND_URL || ""}/invite?token=${rawToken}`;

    try {
      const { sendInvitationEmail: sendEmail } = require("../utils/mailer");
      await sendEmail(user.email, user.name, invitationUrl);
    } catch (emailError) {
      console.error("Failed to send setup email:", emailError.message);
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: sendByEmail || null,
      module: "Platform User",
      action: "send_setup_email",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      newValue: { status: "PendingActivation", invitationUrl },
      metadata: { actorId: sendByEmail || null, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return {
      user: await this._sanitizeUser(user),
      invitationToken: rawToken,
      invitationUrl,
    };
  }

  async getUserLoginHistory(userId, filters = {}, pagination = {}) {
    return await LoginHistoryService.getUserLoginHistory(userId, filters, pagination);
  }

  async getAllLoginHistory(filters = {}, pagination = {}) {
    return await LoginHistoryService.getAllLoginHistory(filters, pagination);
  }

  async dashboardStats() {
    const [totalUsers, superAdmins, storeAdmins, staff, customers, suspended, blocked, archived, invited, pendingActivation, loginStats] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ isSuperAdmin: true, deletedAt: null }),
      User.countDocuments({ userType: "store_admin", deletedAt: null }),
      User.countDocuments({ userType: "staff", deletedAt: null }),
      User.countDocuments({ userType: "customer", deletedAt: null }),
      User.countDocuments({ status: "Suspended", deletedAt: null }),
      User.countDocuments({ status: "Blocked", deletedAt: null }),
      User.countDocuments({ status: "Archived", deletedAt: null }),
      User.countDocuments({ status: "Invited", deletedAt: null }),
      User.countDocuments({ status: "PendingActivation", deletedAt: null }),
      LoginHistoryService.getStats(),
    ]);

    return {
      totalUsers,
      superAdmins,
      storeAdmins,
      staff,
      customers,
      suspended,
      blocked,
      archived,
      invited,
      pendingActivation,
      loginStats,
    };
  }

  async getUserStoreRoles(userId, storeId = null) {
    const query = { userId };
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      query.storeId = storeId;
    }

    const entries = await UserStore.find(query)
      .populate("storeId", "name slug")
      .populate("roleId", "name slug scope permissions")
      .lean();

    return entries.map((entry) => ({
      storeId: entry.storeId?._id,
      storeName: entry.storeId?.name,
      storeSlug: entry.storeId?.slug,
      roleId: entry.roleId?._id,
      roleName: entry.roleId?.name,
      roleSlug: entry.roleId?.slug,
      roleScope: entry.roleId?.scope,
      status: entry.status,
    }));
  }
}

module.exports = new UserManagementService();
