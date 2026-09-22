const { DEFAULT_ROLES } = require("../config/rbac/roles");

const roles = DEFAULT_ROLES.map((role) => ({
  ...role,
  permissionCodes: role.permissionCodes || [],
}));

module.exports = roles;
