const Role = require("../models/Role");
const Permission = require("../models/Permission");
const User = require("../models/User");
const RoleTemplate = require("../models/RoleTemplate");
const mongoose = require("mongoose");
const RoleTemplateService = require("./RoleTemplateService");
const { DEFAULT_ROLES, getRolePermissionCodes, resolvePermissionIds } = require("../config/rbac/roles");

class RoleService {
  async roleExists(filter) {
    const role = await Role.findOne(filter);
    return !!role;
  }

  async getRolesByStore(storeId) {
    return await Role.find({ storeId })
      .populate("permissions")
      .sort({ createdAt: -1 });
  }

  async getPlatformRoles() {
    return await Role.find({ scope: "platform" })
      .populate("permissions")
      .sort({ createdAt: -1 });
  }

  async getAllRoles() {
    return await Role.find({})
      .populate("permissions")
      .sort({ scope: 1, createdAt: -1 });
  }

  async getPredefinedRoles() {
    const allPermissions = await Permission.find({});
    const templates = await RoleTemplateService.getPredefinedRoles();

    return templates;
  }

  async getRoleByIdForStore(id, storeId) {
    return await Role.findOne({ _id: id, storeId }).populate("permissions");
  }

  async getPlatformRoleById(id) {
    return await Role.findOne({ _id: id, scope: "platform" }).populate("permissions");
  }

  async getRoleById(id) {
    return await Role.findById(id).populate("permissions");
  }

  async createRole(data) {
    this._enforcePlatformRoleConstraints(data);
    const role = new Role(data);
    await role.save();
    return role.populate("permissions");
  }

  _enforcePlatformRoleConstraints(data) {
    if (data.scope === "platform" && data.storeId != null) {
      const err = new Error("Un rôle plateforme ne peut pas avoir de storeId");
      err.name = "InvalidRoleScope";
      throw err;
    }
  }

  async updateRole(id, storeId, data) {
    const isPlatform = !storeId;
    const filter = { _id: id };
    if (storeId) {
      filter.storeId = storeId;
    } else {
      filter.scope = "platform";
    }

    if (isPlatform) {
      if (data.scope !== undefined && data.scope !== "platform") {
        const err = new Error("Le scope d'un rôle plateforme ne peut pas être modifié en 'store'");
        err.name = "InvalidRoleScope";
        throw err;
      }
      if (data.storeId != null) {
        const err = new Error("Un rôle plateforme ne peut pas avoir de storeId");
        err.name = "InvalidRoleScope";
        throw err;
      }
      if (data.permissions && data.permissions.length > 0) {
        const platformPerms = await Permission.find({ _id: { $in: data.permissions }, scope: "platform" })
          .select("_id")
          .lean();
        const platformIds = new Set(platformPerms.map((p) => String(p._id)));
        const invalid = data.permissions.filter((pid) => !platformIds.has(String(pid)));
        if (invalid.length > 0) {
          const err = new Error("Un rôle plateforme ne peut recevoir que des permissions plateforme");
          err.name = "InvalidPermissions";
          err.invalidPermissionIds = invalid;
          throw err;
        }
      }
    }

    const role = await Role.findOneAndUpdate(filter, data, { new: true }).populate("permissions");
    if (role) {
      await this._invalidateUsersPermissionCache(role._id);
    }
    return role;
  }

  async deleteRole(id) {
    const role = await Role.findById(id);
    if (!role) return null;
    if (role.scope === "platform" && role.isSystem) {
      const err = new Error("Les rôles prédéfinis ne peuvent pas être supprimés");
      err.name = "Forbidden";
      throw err;
    }
    const userCount = await User.countDocuments({ role: id });
    if (role.scope === "platform" && userCount > 0) {
      const err = new Error(`Ce rôle est encore assigné  ${userCount} utilisateur(s)`);
      err.name = "RoleInUse";
      throw err;
    }
    const result = await Role.findByIdAndDelete(id);
    return result;
  }

  async deleteRole(id, storeId) {
    const role = await Role.findOne({ _id: id, storeId });
    if (!role) return null;
    if (role.scope === "platform" && role.isSystem) {
      const err = new Error("Les rôles prédéfinis ne peuvent pas être supprimés");
      err.name = "Forbidden";
      throw err;
    }
    const userCount = await User.countDocuments({ role: id });
    if (role.scope === "platform" && userCount > 0) {
      const err = new Error(`Ce rôle est encore assigné  ${userCount} utilisateur(s)`);
      err.name = "RoleInUse";
      throw err;
    }
    const result = await Role.findOneAndDelete({ _id: id, storeId });
    return result;
  }

  async duplicateRole(id) {
    const source = await Role.findById(id).populate("permissions");
    if (!source) {
      const err = new Error("Rôle introuvable");
      err.name = "NotFound";
      throw err;
    }
    let slug = `${source.slug}-copy`;
    let copyCount = 1;
    while (await Role.exists({ slug, scope: source.scope })) {
      copyCount += 1;
      slug = `${source.slug}-copy-${copyCount}`;
    }
    const duplicate = new Role({
      name: `${source.name} (copie)`,
      slug,
      description: source.description,
      permissions: source.permissions.map((p) => p._id || p),
      scope: source.scope,
      storeId: source.storeId,
      isSystem: false,
    });
    await duplicate.save();
    return duplicate.populate("permissions");
  }

  async getUsersByRole(roleId) {
    const users = await User.find({ role: roleId, deletedAt: null })
      .select("_id name email firstName lastName userType status isSuperAdmin")
      .lean();
    return users;
  }

  async assignPermissions(roleId, storeId, permissionIds) {
    const role = await Role.findOneAndUpdate(
      { _id: roleId, storeId },
      { permissions: permissionIds },
      { new: true }
    ).populate("permissions");
    if (role) {
      await this._invalidateUsersPermissionCache(roleId);
    }
    return role;
  }

  async _invalidateUsersPermissionCache(roleId) {
    const usersWithRole = await User.find({ role: roleId }).select("_id").lean();
    const userIds = usersWithRole.map((u) => u._id);
    if (userIds.length > 0) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { permissions: [] } }
      );
    }
  }

  async getAllPermissions() {
    return await Permission.find({}).sort({ module: 1, action: 1 });
  }

  // Bug fixed here: this used to filter on `template.permissions`, a field
  // that never existed on these objects (config/rbac/roles.js's
  // DEFAULT_ROLES only has `permissionCodes`)  so this always returned []
  // and the updateMany below it in seedDefaultRolesForStore never matched
  // any role. In practice that meant a newly added store-scope permission
  // (e.g. this session's "staff.invite" or the "Team" module) never
  // reached already-seeded stores' Store Owner/CEO/Manager/Admin roles 
  // only brand-new stores got it. Full-access roles are identified
  // dynamically here (permissionCodes covers every current store-scope
  // permission), so the fix self-corrects for any future addition too.
  _fullAccessRoleNames() {
    const templates = require("../utils/roles");
    const { permissions } = require("../config/rbac/permissions");
    const totalStorePermissions = permissions.filter((p) => p.scope === "store").length;
    return templates
      .filter((template) => (template.permissionCodes || []).length === totalStorePermissions && totalStorePermissions > 0)
      .map((template) => template.name);
  }

  async seedDefaultRolesForStore(storeId, session = null) {
    const existingNames = new Set(
      (await Role.find({ storeId }).select("name")).map((role) => role.name)
    );

    const dbTemplates = await RoleTemplateService.getAllTemplates();
    const storeTemplates = dbTemplates.filter(
      (template) => template.scope === "store"
    );

    const templatesToCreate = storeTemplates.filter(
      (template) => !existingNames.has(template.name)
    );

    const allPermissions = await Permission.find({});
    const storePermissions = allPermissions.filter((p) => p.scope === "store");
    const storePermissionIds = storePermissions.map((permission) => permission._id);
    const storePermissionIdsByAction = {};
    for (const perm of storePermissions) {
      (storePermissionIdsByAction[perm.action] = storePermissionIdsByAction[perm.action] || []).push(perm._id);
    }

    const updateOptions = session ? { session } : {};
    await Role.updateMany(
      { storeId, name: { $in: this._fullAccessRoleNames() } },
      { $set: { permissions: storePermissionIds } },
      updateOptions
    );

    if (templatesToCreate.length === 0) {
      return [];
    }

    const docs = templatesToCreate.map((template) => {
      let permissionIds = [];
      if (template.actionFilters && template.actionFilters.length > 0) {
        permissionIds = template.actionFilters.flatMap(
          (action) => storePermissionIdsByAction[action] || []
        );
      } else if (template.permissionCodes && template.permissionCodes.length > 0) {
        permissionIds = template.permissionCodes
          .map((code) => allPermissions.find((p) => p.code === code)?._id)
          .filter(Boolean);
      }
      return {
        name: template.name,
        slug: template.slug,
        scope: template.scope,
        description: template.description,
        permissions: permissionIds,
        storeId,
        isSystem: template.isSystem || false,
      };
    });

    const insertOptions = session ? { session } : {};
    return await Role.insertMany(docs, insertOptions);
  }

  async resolveStoreRoleId(roleRef, storeId) {
    if (!roleRef) return null;

    const refs = Array.isArray(roleRef) ? roleRef.filter(Boolean) : [roleRef];

    for (const ref of refs) {
      if (typeof ref === "string" && mongoose.Types.ObjectId.isValid(ref)) {
        const role = await Role.findOne({ _id: ref, storeId });
        if (role) return role._id;
      }

      const role = await Role.findOne({
        storeId,
        $or: [{ slug: ref }, { name: ref }],
      });
      if (role) return role._id;
    }

    return null;
  }

  async getAllRoleTemplates() {
    const allPermissions = await Permission.find({});
    const overrides = await RoleTemplate.find({ templateId: { $exists: true, $ne: null } })
      .populate("permissions")
      .lean();

    const overrideMap = {};
    overrides.forEach((doc) => {
      overrideMap[doc.templateId] = doc.permissions;
    });

    return DEFAULT_ROLES.map((template) => ({
      _id: template._id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      scope: template.scope,
      isSystem: template.isSystem,
      permissions: overrideMap[template._id] || resolvePermissionIds(template.name, allPermissions),
    }));
  }

  async getRoleTemplateById(id) {
    const allPermissions = await Permission.find({});
    const template = DEFAULT_ROLES.find((t) => t._id === id);
    if (!template) return null;

    const override = await RoleTemplate.findOne({ templateId: id }).populate("permissions").lean();
    return {
      _id: template._id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      scope: template.scope,
      isSystem: template.isSystem,
      permissions: override ? override.permissions : resolvePermissionIds(template.name, allPermissions),
    };
  }

  async createRoleTemplate(data) {
    const template = new RoleTemplate(data);
    await template.save();
    return template.populate("permissions");
  }

  async updateRoleTemplate(id, data) {
    return await RoleTemplate.findOneAndUpdate({ _id: id }, data, {
      new: true,
      upsert: false,
      runValidators: true,
    }).populate("permissions");
  }

  async saveRoleTemplateOverride(templateId, permissionIds) {
    const existing = await RoleTemplate.findOne({ templateId });
    if (existing) {
      existing.permissions = permissionIds;
      return await existing.save();
    }

    const template = DEFAULT_ROLES.find((t) => t._id === templateId);
    if (!template) {
      const err = new Error("Template introuvable");
      err.name = "TemplateNotFound";
      throw err;
    }

    const doc = new RoleTemplate({
      name: template.name,
      slug: template.slug,
      description: template.description,
      scope: template.scope,
      isSystem: template.isSystem,
      templateId,
      permissions: permissionIds,
    });
    return await doc.save();
  }

  async deleteRoleTemplate(id) {
    const template = await RoleTemplate.findById(id);
    if (!template || !template.templateId) return null;
    return await RoleTemplate.findByIdAndDelete(id);
  }

  async syncFullAccessRoles() {
    const allPermissions = await Permission.find({}).select("_id scope");
    const storePermissionIds = allPermissions
      .filter((p) => p.scope === "store")
      .map((permission) => permission._id);

    const result = await Role.updateMany(
      { name: { $in: this._fullAccessRoleNames() } },
      { $set: { permissions: storePermissionIds } }
    );

    return {
      matched: result.matchedCount ?? result.n ?? 0,
      permissionCount: storePermissionIds.length,
    };
  }
}

module.exports = new RoleService();
module.exports.RoleService = RoleService;
