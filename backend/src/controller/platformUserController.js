const UserManagementService = require("../service/UserManagementService");
const AuditService = require("../service/AuditService");

const parseList = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const values = Array.isArray(value) ? value : String(value).split(",");
  return values.map((item) => String(item).trim()).filter(Boolean);
};

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

const getAllUsers = async (req, res) => {
  try {
    console.log("[getAllUsers] query:", req.query, "user:", req.user?._id, "isSuperAdmin:", req.user?.isSuperAdmin, "authContext:", req.authContext?.scope);
    const filters = {
      userType: parseList(req.query.userType),
      status: parseList(req.query.status),
      isSuperAdmin: parseBoolean(req.query.isSuperAdmin),
      roleId: parseList(req.query.roleId || req.query.role),
      roleIds: parseList(req.query.roleIds),
      storeIds: parseList(req.query.storeId || req.query.storeIds),
      teamId: req.query.teamId,
      department: req.query.department,
      twoFactorEnabled: parseBoolean(req.query.twoFactorEnabled),
      twoFactorVerified: parseBoolean(req.query.twoFactorVerified),
      forcePasswordChange: parseBoolean(req.query.forcePasswordChange),
      country: req.query.country,
      createdBy: req.query.createdBy,
      search: req.query.search || req.query.userId,
      platformOnly: req.query.platformOnly === "true" || req.query.platformOnly === true,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      lastLoginFrom: req.query.lastLoginFrom,
      lastLoginTo: req.query.lastLoginTo,
    };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const sortBy = req.query.sortBy || req.query.sort;
    const sortOrder = String(req.query.sortOrder || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const sort = sortBy
      ? (String(sortBy).startsWith("-") ? String(sortBy) : `${sortOrder === "desc" ? "-" : ""}${sortBy}`)
      : "-createdAt";

    const result = await UserManagementService.getAllUsers(filters, pagination, sort);
    console.log("[getAllUsers] result users count:", result?.users?.length || 0, "total:", result?.pagination?.total);

    return res.status(200).json({
      success: true,
      message: "Liste des utilisateurs récupéré avec succès",
      data: result.users,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    console.error("[getAllUsers] error:", error);
    if (error.name === "ValidationError") {
      const errors = Array.isArray(error.errors)
        ? error.errors
        : error.errors
          ? Object.values(error.errors)
          : [];
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors: errors.map((err) => ({
          field: err?.path || err?.field,
          message: err?.message,
        })),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await UserManagementService.createUser({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "EmailExists" || error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }
    if (error.name === "Forbidden") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.name === "InvalidRoleScope") {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.name === "InvalidRoles") {
      return res.status(422).json({
        success: false,
        message: error.message,
      });
    }
    if (error.name === "ValidationError") {
      const errors = Array.isArray(error.errors)
        ? error.errors
        : error.errors
          ? Object.values(error.errors)
          : [];
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors: errors.map((err) => ({
          field: err?.path || err?.field,
          message: err?.message,
        })),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await UserManagementService.getUserById(req.params.userId);

    return res.status(200).json({
      success: true,
      message: "Utilisateur récupéré avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await UserManagementService.updateUser(req.params.userId, {
      ...req.body,
      updatedBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    if (error.name === "EmailExists" || error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }
    if (error.name === "InvalidRoleScope") {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      const errors = Array.isArray(error.errors)
        ? error.errors
        : error.errors
          ? Object.values(error.errors)
          : [];
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors: errors.map((err) => ({
          field: err?.path || err?.field,
          message: err?.message,
        })),
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    await UserManagementService.deleteUser(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    if (error.name === "Forbidden") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await UserManagementService.suspendUser(
      req.params.userId,
      reason,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Utilisateur suspendu avec succès",
      data: { id: user._id, status: user.status },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const reactivateUser = async (req, res) => {
  try {
    const user = await UserManagementService.reactivateUser(
      req.params.userId,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Utilisateur réactivé avec succès",
      data: { id: user._id, status: user.status },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(422).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const result = await UserManagementService.resetPassword(req.params.userId, password, req.user._id);

    return res.status(200).json({
      success: true,
      message: password
        ? "Mot de passe réinitialisé avec succès"
        : "Lien de réinitialisation généré",
      data: {
        user: result.user,
        resetToken: result.resetToken,
      },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const reset2FA = async (req, res) => {
  try {
    const result = await UserManagementService.reset2FA(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "2FA réinitialisé avec succès",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const logoutAllDevices = async (req, res) => {
  try {
    await UserManagementService.logoutAllDevices(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Toutes les sessions ont t révoqués",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const assignRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    if (!roleId) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform User",
        action: "assign_role",
        entityType: "user",
        entityId: req.params.userId,
        status: "failed",
        severity: "medium",
        newValue: { error: "roleId manquant" },
      });
      return res.status(422).json({
        success: false,
        message: "roleId est requis",
      });
    }

    await UserManagementService.assignRole(req.params.userId, roleId, null, null, req.user._id);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform User",
      action: "assign_role",
      entityType: "user",
      entityId: req.params.userId,
      status: "success",
      severity: "medium",
      newValue: { roleId },
    });

    return res.status(200).json({
      success: true,
      message: "Rôle assigné avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform User",
        action: "assign_role",
        entityType: "user",
        entityId: req.params.userId,
        status: "failed",
        severity: "medium",
        newValue: { roleId, error: error.message },
      });
      return res.status(404).json({
        success: false,
        message: "Utilisateur ou rôle introuvable",
      });
    }
    if (error.name === "InvalidRoleScope") {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform User",
        action: "assign_role",
        entityType: "user",
        entityId: req.params.userId,
        status: "failed",
        severity: "high",
        newValue: { roleId, error: error.message },
      });
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const removeRole = async (req, res) => {
  try {
    await UserManagementService.removeRole(req.params.userId, req.params.roleId, req.user._id);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform User",
      action: "remove_role",
      entityType: "user",
      entityId: req.params.userId,
      status: "success",
      severity: "medium",
      newValue: { roleId: req.params.roleId },
    });

    return res.status(200).json({
      success: true,
      message: "Rôle retiré avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform User",
        action: "remove_role",
        entityType: "user",
        entityId: req.params.userId,
        status: "failed",
        severity: "medium",
        newValue: { roleId: req.params.roleId, error: error.message },
      });
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    if (error.name === "InvalidRoleScope") {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform User",
        action: "remove_role",
        entityType: "user",
        entityId: req.params.userId,
        status: "failed",
        severity: "high",
        newValue: { roleId: req.params.roleId, error: error.message },
      });
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const bulkAction = async (req, res) => {
  try {
    const { userIds, data = {} } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(422).json({
        success: false,
        message: "userIds est requis et doit être un tableau non vide",
      });
    }

    const action = req.path.replace(/^\/bulk\/?/, "").replace(/\/$/, "");

    const results = await UserManagementService.bulkAction(userIds, action, {
      ...data,
      deletedBy: req.user._id,
    });

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      return res.status(207).json({
        success: true,
        message: `Action partiellement effectué : ${failed.length} échecs`,
        data: results,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Action effectué sur tous les utilisateurs sélectionnés",
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const bulkExport = async (req, res) => {
  try {
    const { userIds, format = "csv" } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(422).json({
        success: false,
        message: "userIds est requis et doit être un tableau non vide",
      });
    }

    const result = await UserManagementService.bulkExport(userIds, format);

    const filename = `users-export-${Date.now()}.${format}`;
    res.setHeader("Content-Type", format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).json({
      success: true,
      message: `${result.count} utilisateurs exportés`,
      data: result.data,
      format: result.format,
      count: result.count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const bulkAssignRole = async (req, res) => {
  try {
    const { userIds, roleId, storeId } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(422).json({
        success: false,
        message: "userIds est requis et doit être un tableau non vide",
      });
    }

    if (!roleId) {
      return res.status(422).json({
        success: false,
        message: "roleId est requis",
      });
    }

    const result = await UserManagementService.bulkAssignRole(
      userIds,
      roleId,
      storeId,
      req.user._id
    );

    const failed = result.results.filter((r) => !r.success);
    if (failed.length > 0) {
      return res.status(207).json({
        success: true,
        affected: result.affected,
        message: `Rôle assigné  ${result.affected} utilisateur(s) : ${failed.length} échecs`,
        data: result.results,
      });
    }

    return res.status(200).json({
      success: true,
      affected: result.affected,
      message: `Rôle assigné  ${result.affected} utilisateur(s)`,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Rôle introuvable",
      });
    }
    if (error.name === "InvalidRoleScope") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const sessions = await UserManagementService.getUserSessions(req.params.userId);

    return res.status(200).json({
      success: true,
      message: "Sessions récupérés avec succès",
      data: sessions,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const logoutDevice = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await UserManagementService.logoutDevice(
      req.params.userId,
      sessionId,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Session révoqué avec succès",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = await UserManagementService.getUserActivity(req.params.userId, limit);

    return res.status(200).json({
      success: true,
      message: "Historique d'activité récupéré avec succès",
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUserPermissions = async (req, res) => {
  try {
    const codes = await UserManagementService.getEffectivePermissions(req.params.userId);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform User",
      action: "permissions.view",
      entityType: "user",
      entityId: req.params.userId,
      status: "success",
      severity: "low",
      metadata: { permissionCount: codes.length, isWildcard: codes.includes("*") },
    });

    return res.status(200).json({
      success: true,
      message: "Permissions récupérés avec succès",
      data: codes,
    });
  } catch (error) {
    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform User",
      action: "permissions.view",
      entityType: "user",
      entityId: req.params.userId,
      status: "failed",
      severity: "low",
      newValue: { error: error.message },
    });
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUserStoreRoles = async (req, res) => {
  try {
    const { userId } = req.params;
    const { storeId } = req.query;
    const roles = await UserManagementService.getUserStoreRoles(userId, storeId || null);

    return res.status(200).json({
      success: true,
      message: "Rôles magasin récupérés avec succès",
      data: roles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await UserManagementService.blockUser(req.params.userId, reason, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Utilisateur bloqué avec succès",
      data: { id: user._id, status: user.status },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    if (error.name === "Forbidden") {
      return res.status(403).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const user = await UserManagementService.unblockUser(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Utilisateur débloqué avec succès",
      data: { id: user._id, status: user.status },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    if (error.name === "ValidationError") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const archiveUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await UserManagementService.archiveUser(req.params.userId, reason, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Utilisateur archivé avec succès",
      data: { id: user._id, status: user.status },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    if (error.name === "Forbidden") {
      return res.status(403).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const unarchiveUser = async (req, res) => {
  try {
    const user = await UserManagementService.unarchiveUser(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Utilisateur désarchivé avec succès",
      data: { id: user._id, status: user.status },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    if (error.name === "ValidationError") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const impersonateUser = async (req, res) => {
  try {
    const { reason, ttl } = req.body || {};
    const result = await UserManagementService.impersonateUser(
      req.params.userId,
      reason,
      req.user._id,
      ttl ? Number(ttl) : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Jeton d'usurpation généré",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    if (error.name === "Forbidden") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const duplicateUser = async (req, res) => {
  try {
    const result = await UserManagementService.duplicateUser(req.params.userId, req.body, req.user._id);

    return res.status(201).json({
      success: true,
      message: "Utilisateur dupliqué avec succès",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const resendInvitation = async (req, res) => {
  try {
    const result = await UserManagementService.resendInvitation(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Invitation renvoyé avec succès",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    if (error.name === "ValidationError") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const forcePasswordChange = async (req, res) => {
  try {
    const { password } = req.body;
    const result = await UserManagementService.forcePasswordChange(req.params.userId, password, req.user._id);

    return res.status(200).json({
      success: true,
      message: password
        ? "Mot de passe modifié avec succès"
        : "L'utilisateur devra changer son mot de passe  la prochaine connexion",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const sendSetupEmail = async (req, res) => {
  try {
    const result = await UserManagementService.sendSetupEmail(req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Email de configuration envoyé avec succès",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getUserLoginHistory = async (req, res) => {
  try {
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };
    const filters = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const result = await UserManagementService.getUserLoginHistory(req.params.userId, filters, pagination);

    return res.status(200).json({
      success: true,
      message: "Historique de connexion récupéré avec succès",
      data: result.entries,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getAllLoginHistory = async (req, res) => {
  try {
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };
    const filters = {
      userId: req.query.userId,
      ipAddress: req.query.ipAddress,
      status: req.query.status,
      country: req.query.country,
      browser: req.query.browser,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
    };

    const result = await UserManagementService.getAllLoginHistory(filters, pagination);

    return res.status(200).json({
      success: true,
      message: "Historique de connexion récupéré avec succès",
      data: result.entries,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const dashboardStats = async (req, res) => {
  try {
    const stats = await UserManagementService.dashboardStats();

    return res.status(200).json({
      success: true,
      message: "Statistiques du tableau de bord récupérés avec succès",
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await UserManagementService.getUserById(req.params.userId);

    const LoginHistoryService = require("../service/LoginHistoryService");
    const loginStats = await LoginHistoryService.getStats();

    return res.status(200).json({
      success: true,
      message: "Profil utilisateur récupéré avec succès",
      data: { user, loginStats },
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  suspendUser,
  reactivateUser,
  resetPassword,
  reset2FA,
  logoutAllDevices,
  assignRole,
  removeRole,
  bulkAction,
  bulkExport,
  bulkAssignRole,
  getUserActivity,
  getUserSessions,
  logoutDevice,
  getUserPermissions,
  getUserStoreRoles,
  blockUser,
  unblockUser,
  archiveUser,
  unarchiveUser,
  impersonateUser,
  duplicateUser,
  resendInvitation,
  forcePasswordChange,
  sendSetupEmail,
  getUserLoginHistory,
  getAllLoginHistory,
  dashboardStats,
  getUserProfile,
};
