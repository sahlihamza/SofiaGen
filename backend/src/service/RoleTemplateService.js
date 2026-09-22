const RoleTemplate = require("../models/RoleTemplate");
const Permission = require("../models/Permission");
const { permissions } = require("../config/rbac/permissions");
const { validatePermissionCode } = require("../utils/validatePermissionCode");
const { DEFAULT_ROLES } = require("../config/rbac/roles");

class RoleTemplateService {
  async getAllTemplates() {
    return await RoleTemplate.find({}).sort({ scope: 1, name: 1 });
  }

  async getTemplateById(id) {
    return await RoleTemplate.findById(id);
  }

  async getTemplateBySlug(slug) {
    return await RoleTemplate.findOne({ slug });
  }

  async createTemplate(data) {
    const template = new RoleTemplate(data);
    await template.save();
    return template;
  }

  async updateTemplate(id, data) {
    const template = await RoleTemplate.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return template;
  }

  async deleteTemplate(id) {
    return await RoleTemplate.findByIdAndDelete(id);
  }

  async getPredefinedRoles() {
    const allPermissions = await Permission.find({});
    const permissionById = {};
    for (const perm of allPermissions) {
      permissionById[perm._id] = perm;
    }

    const templates = await RoleTemplate.find({}).sort({ scope: 1, name: 1 });

    const storePredefined = templates
      .filter((t) => t.scope === "store")
      .map((template) => {
        const permissionCodes = template.permissionCodes || [];
        const actionFilters = template.actionFilters || [];
        const permissions = allPermissions
          .filter((p) => {
            if (permissionCodes.length > 0) {
              return permissionCodes.includes(p.code);
            }
            return actionFilters.includes(p.action);
          })
          .map((p) => p._id);
        return {
          _id: template._id,
          name: template.name,
          slug: template.slug,
          description: template.description,
          scope: template.scope,
          isPredefined: template.isPredefined,
          permissions,
        };
      });

    const platformPredefined = templates
      .filter((t) => t.scope === "platform")
      .map((template) => {
        const permissionCodes = template.permissionCodes || [];
        const permissions = allPermissions
          .filter((p) => permissionCodes.includes(p.code))
          .map((p) => p._id);
        return {
          _id: template._id,
          name: template.name,
          slug: template.slug,
          description: template.description,
          scope: template.scope,
          isPredefined: template.isPredefined,
          permissions,
        };
      });

    return [...storePredefined, ...platformPredefined];
  }

  async seedDefaultTemplates() {
    const allPermissions = await Permission.find({});
    const permissionById = {};
    for (const perm of allPermissions) {
      permissionById[perm._id] = perm;
    }

    const canonicalPermissionCodes = new Set(permissions.map((p) => p.code));

    const templates = DEFAULT_ROLES.map((role) => {
      const template = {
        _id: role._id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        scope: role.scope,
        isPredefined: true,
        permissionCodes: role.permissionCodes || [],
      };

      const invalid = template.permissionCodes.filter((c) => !canonicalPermissionCodes.has(c));
      if (invalid.length > 0) {
        throw new Error(
          `[RoleTemplateService] Codes de permission invalides pour le template "${role.name}" : ${invalid.join(
            ", "
          )}. Codes valides dans config/rbac/permissions.js.`
        );
      }

      return template;
    });

    templates.push({
      _id: "64a000000000000000000009",
      name: "adminstore",
      slug: "adminstore-store",
      description: "Store owner with dedicated store management permissions.",
      scope: "store",
      isPredefined: true,
      permissionCodes: permissions
        .filter((p) => p.scope === "store" && ["view", "create", "update", "delete", "duplicate", "publish", "archive"].includes(p.action))
        .map((p) => p.code),
    });

    for (const template of templates) {
      // Upsert par _id OU slug : une base peut contenir un template hérité avec
      // le même slug mais un _id différent (ex: ObjectId généré) ; un upsert
      // strictement par _id tenterait alors un INSERT qui viole l'index unique
      // sur slug et ferait échouer tout le seeding.
      const { _id, ...templateData } = { ...template, isPredefined: true };
      const existing = await RoleTemplate.findOne({
        $or: [{ _id: template._id }, { slug: template.slug }],
      }).select("_id");

      if (existing) {
        await RoleTemplate.updateOne({ _id: existing._id }, { $set: templateData });
      } else {
        await RoleTemplate.create(template);
      }
    }

    return await this.getAllTemplates();
  }
}

module.exports = new RoleTemplateService();
module.exports.RoleTemplateService = RoleTemplateService;
