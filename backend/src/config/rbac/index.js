const { permissions, modules, RISK_BY_ACTION, getRiskLevel } = require("./permissions");
const { DEFAULT_ROLES, getRolePermissionCodes, resolvePermissionIds } = require("./roles");
const { MODULE_PERMISSION_PREFIXES, computeAccessibleModules } = require("./moduleAccess");

module.exports = {
  permissions,
  modules,
  RISK_BY_ACTION,
  getRiskLevel,
  DEFAULT_ROLES,
  getRolePermissionCodes,
  resolvePermissionIds,
  MODULE_PERMISSION_PREFIXES,
  computeAccessibleModules,
};
