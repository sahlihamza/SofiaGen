const RoleService = require("../service/RoleService");
const PermissionService = require("../service/PermissionService");
const AuditService = require("../service/AuditService");
const Permission = require("../models/Permission");
const mongoose = require("mongoose");

const getAllPlatformRoles = async (req, res) => {
  try {
    const roles = await RoleService.getPlatformRoles();
    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "list",
      entityType: "role",
      status: "success",
      severity: "low",
      metadata: { count: roles.length },
    });
    return res.status(200).json({
      success: true,
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

const getPlatformRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await RoleService.getPlatformRoleById(id);

    if (!role) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "view",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "low",
        newValue: { error: "Rôle introuvable" },
      });
      return res.status(404).json({
        success: false,
        message: "Rôle introuvable",
      });
    }

    const users = await RoleService.getUsersByRole(role._id);
    const groupedPermissions = {};
    for (const perm of role.permissions || []) {
      const mod = perm.module || "General";
      if (!groupedPermissions[mod]) groupedPermissions[mod] = [];
      groupedPermissions[mod].push(perm);
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "view",
      entityType: "role",
      entityId: role._id,
      status: "success",
      severity: "low",
      metadata: { name: role.name, slug: role.slug, userCount: users.length },
    });

    return res.status(200).json({
      success: true,
      data: {
        ...role.toObject ? role.toObject() : role,
        userCount: users.length,
        usersPreview: users.slice(0, 20),
        groupedPermissions,
      },
    });
  } catch (error) {
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

const createPlatformRole = async (req, res) => {
  try {
    const { name, slug, description, permissions } = req.body;

    if (!name) {
      return res.status(422).json({
        success: false,
        message: "Le nom du rôle est requis",
      });
    }

    const roleSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const exists = await RoleService.roleExists({ slug: roleSlug, scope: "platform" });
    if (exists) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "create",
        entityType: "role",
        status: "failed",
        severity: "medium",
        newValue: { name, slug: roleSlug, error: "Rôle existe déjà" },
      });
      return res.status(409).json({
        success: false,
        message: "Ce rôle existe déjà",
      });
    }

    let validatedPermIds = permissions || [];
    if (validatedPermIds.length > 0) {
      const platformPerms = await Permission.find({ _id: { $in: validatedPermIds }, scope: "platform" })
        .select("_id")
        .lean();
      const platformIds = new Set(platformPerms.map((p) => String(p._id)));
      const invalid = validatedPermIds.filter((pid) => !platformIds.has(String(pid)));
      if (invalid.length > 0) {
        await AuditService.logAction({
          actorType: "platform_admin",
          actorId: req.user?._id,
          module: "Platform Role",
          action: "create",
          entityType: "role",
          status: "failed",
          severity: "medium",
          newValue: { name, slug: roleSlug, error: "Permissions invalides", invalidPermissionIds: invalid },
        });
        return res.status(422).json({
          success: false,
          message: "Un rôle plateforme ne peut recevoir que des permissions plateforme",
          invalidPermissionIds: invalid,
        });
      }
    }

    const role = await RoleService.createRole({
      name,
      slug: roleSlug,
      description,
      permissions: validatedPermIds,
      scope: "platform",
      storeId: null,
      isSystem: false,
    });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "create",
      entityType: "role",
      entityId: role._id,
      status: "success",
      severity: "high",
      newValue: { name: role.name, slug: role.slug, scope: role.scope },
    });

    return res.status(201).json({
      success: true,
      message: "Rôle créé avec succès",
      data: role,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors,
      });
    }
    if (error.name === "InvalidPermissions") {
      return res.status(422).json({
        success: false,
        message: error.message,
        invalidPermissionIds: error.invalidPermissionIds,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updatePlatformRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, permissions } = req.body;

    const role = await RoleService.getPlatformRoleById(id);
    if (!role) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "update",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "medium",
        newValue: { error: "Rôle introuvable" },
      });
      return res.status(404).json({
        success: false,
        message: "Rôle introuvable",
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        await AuditService.logAction({
          actorType: "platform_admin",
          actorId: req.user?._id,
          module: "Platform Role",
          action: "update",
          entityType: "role",
          entityId: id,
          status: "failed",
          severity: "medium",
          newValue: { error: "permissions doit être un tableau d'identifiants" },
        });
        return res.status(422).json({
          success: false,
          message: "permissions doit être un tableau d'identifiants",
        });
      }
      const platformPerms = await Permission.find({ _id: { $in: permissions }, scope: "platform" })
        .select("_id")
        .lean();
      const platformIds = new Set(platformPerms.map((p) => String(p._id)));
      const invalid = permissions.filter((pid) => !platformIds.has(String(pid)));
      if (invalid.length > 0) {
        await AuditService.logAction({
          actorType: "platform_admin",
          actorId: req.user?._id,
          module: "Platform Role",
          action: "update",
          entityType: "role",
          entityId: id,
          status: "failed",
          severity: "medium",
          newValue: { error: "Permissions invalides", invalidPermissionIds: invalid },
        });
        return res.status(422).json({
          success: false,
          message: "Un rôle plateforme ne peut recevoir que des permissions plateforme",
          invalidPermissionIds: invalid,
        });
      }
      updates.permissions = permissions;
    }

    if (role.isSystem && (name !== undefined || slug !== undefined)) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "update",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "high",
        newValue: { name, slug, error: "Tentative de modification d'un rôle système" },
      });
      return res.status(403).json({
        success: false,
        message: "Les rôles prédéfinis ne peuvent pas être renommés",
      });
    }

    const updated = await RoleService.updateRole(id, null, updates);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "update",
      entityType: "role",
      entityId: id,
      status: "success",
      severity: "medium",
      changes: updates,
    });

    return res.status(200).json({
      success: true,
      message: "Rôle mis à jour avec succès",
      data: updated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Donnés invalides",
        errors,
      });
    }
    if (error.name === "InvalidPermissions") {
      return res.status(422).json({
        success: false,
        message: error.message,
        invalidPermissionIds: error.invalidPermissionIds,
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

const deletePlatformRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await RoleService.getPlatformRoleById(id);

    if (!role) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "delete",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "medium",
        newValue: { error: "Rôle introuvable" },
      });
      return res.status(404).json({
        success: false,
        message: "Rôle introuvable",
      });
    }

    if (role.isSystem) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "delete",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "high",
        newValue: { name: role.name, slug: role.slug, error: "Tentative de suppression d'un rôle système" },
      });
      return res.status(403).json({
        success: false,
        message: "Les rôles prédéfinis ne peuvent pas être supprimés",
      });
    }

    await RoleService.deleteRole(id);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "delete",
      entityType: "role",
      entityId: id,
      status: "success",
      severity: "critical",
      changes: { name: role.name, slug: role.slug },
    });

    return res.status(200).json({
      success: true,
      message: "Rôle supprimé avec succès",
    });
  } catch (error) {
    if (error.name === "RoleInUse") {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "delete",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "high",
        newValue: { error: error.message },
      });
      return res.status(409).json({
        success: false,
        message: error.message,
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

const duplicatePlatformRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await RoleService.getPlatformRoleById(id);

    if (!role) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "duplicate",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "medium",
        newValue: { error: "Rôle introuvable" },
      });
      return res.status(404).json({
        success: false,
        message: "Rôle introuvable",
      });
    }

    const duplicated = await RoleService.duplicateRole(id);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "duplicate",
      entityType: "role",
      entityId: duplicated._id,
      status: "success",
      severity: "medium",
      newValue: { name: duplicated.name, slug: duplicated.slug, sourceRoleId: id },
    });

    return res.status(201).json({
      success: true,
      message: "Rôle dupliqué avec succès",
      data: duplicated,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "duplicate",
      entityType: "role",
      entityId: id,
      status: "failed",
      severity: "medium",
      newValue: { error: error.message },
    });
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await RoleService.getPlatformRoleById(id);

    if (!role) {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "users.list",
        entityType: "role",
        entityId: id,
        status: "failed",
        severity: "low",
        newValue: { error: "Rôle introuvable" },
      });
      return res.status(404).json({
        success: false,
        message: "Rôle introuvable",
      });
    }

    const users = await RoleService.getUsersByRole(id);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "users.list",
      entityType: "role",
      entityId: role._id,
      status: "success",
      severity: "medium",
      metadata: { roleName: role.name, userCount: users.length },
    });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
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

const getAllPermissions = async (req, res) => {
  try {
    console.log("[getAllPermissions] query:", req.query, "user:", req.user?._id, "isSuperAdmin:", req.user?.isSuperAdmin);
    const { scope, category, module, riskLevel, search, page = "1", limit = "50" } = req.query;

    if (scope && scope !== "platform") {
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId: req.user?._id,
        module: "Platform Role",
        action: "permissions.list",
        entityType: "permission",
        status: "failed",
        severity: "low",
        newValue: { error: "Scope invalide", scope },
      });
      return res.status(422).json({
        success: false,
        message: "Ce endpoint ne retourne que les permissions plateforme (scope=platform)",
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const effectiveScope = scope || "platform";
    if (effectiveScope !== "platform") {
      return res.status(422).json({
        success: false,
        message: "Ce endpoint ne retourne que les permissions plateforme (scope=platform)",
      });
    }

    let query = { scope: "platform" };
    if (category) query.category = category;
    if (module) query.module = module;
    if (riskLevel) query.riskLevel = riskLevel;
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Permission.find(query).sort({ module: 1, action: 1 }).skip(skip).limit(limitNum).lean(),
      Permission.countDocuments(query),
    ]);

    const byCategory = {};
    const byModule = {};
    for (const perm of items) {
      const cat = perm.category || "General";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(perm);

      const mod = perm.module || "General";
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(perm);
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "permissions.list",
      entityType: "permission",
      status: "success",
      severity: "low",
      metadata: { count: items.length, total, filters: { scope: effectiveScope, category, module, riskLevel, search } },
    });

    return res.status(200).json({
      success: true,
      data: items,
      grouped: byCategory,
      groupedByModule: byModule,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("[getAllPermissions] error:", error);
    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: req.user?._id,
      module: "Platform Role",
      action: "permissions.list",
      entityType: "permission",
      status: "failed",
      severity: "medium",
      newValue: { error: error.message },
    });
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  getAllPlatformRoles,
  getPlatformRoleById,
  createPlatformRole,
  updatePlatformRole,
  deletePlatformRole,
  duplicatePlatformRole,
  getUsersByRole,
  getAllPermissions,
};
