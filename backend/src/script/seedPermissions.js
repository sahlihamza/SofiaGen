const Permission = require("../models/Permission");
const AuditService = require("../service/AuditService");
const { permissions, getRiskLevel } = require("../config/rbac/permissions");

const seedPermissions = async () => {
  for (const perm of permissions) {
    // Try upsert on `code` (the unique index key). If a stale doc with the
    // same `name` but a different `code` exists, fall back to updating by
    // name  this reconciles schema drift without hard-deleting rows.
    try {
      await Permission.findOneAndUpdate(
        { code: perm.code },
        {
          code: perm.code,
          name: perm.name,
          module: perm.module,
          action: perm.action,
          scope: perm.scope,
          category: perm.category,
          riskLevel: getRiskLevel(perm.action),
          description: perm.description,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key  find the conflicting doc by name and reconcile.
        await Permission.findOneAndUpdate(
          { name: perm.name },
          { $set: { code: perm.code, module: perm.module, action: perm.action, scope: perm.scope, category: perm.category, riskLevel: getRiskLevel(perm.action), description: perm.description } },
          { runValidators: true }
        );
      } else {
        throw err;
      }
    }
  }

  await AuditService.logAction({
    actorType: "system",
    module: "PermissionService",
    action: "policy_updated",
    summary: `Permission seed completed: ${permissions.length} permissions synced`,
    entityType: "Permission",
    status: "success",
    severity: "low",
    newValue: { count: permissions.length },
  });

  return Permission.find();
};

module.exports = seedPermissions;

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const logger = require("../config/logger");

  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const result = await seedPermissions();
      logger.info(` ${result.length} permissions créés/mises  jour`);
      process.exit(0);
    } catch (error) {
      logger.error("L Erreur seed permissions:", error.message);
      process.exit(1);
    }
  })();
}
