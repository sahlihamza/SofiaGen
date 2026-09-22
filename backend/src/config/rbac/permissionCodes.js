const { permissions } = require("./permissions");

const BY_MODULE = {};
for (const perm of permissions) {
  const mod = perm.module;
  if (!BY_MODULE[mod]) BY_MODULE[mod] = {};
  BY_MODULE[mod][perm.action] = perm.code;
}

const CODES = BY_MODULE;

module.exports = {
  CODES,
  BY_MODULE,
  getCode: (moduleName, action) => {
    const mod = BY_MODULE[moduleName];
    return mod ? mod[action] : undefined;
  },
  getCodes: (moduleName, actions) => {
    const mod = BY_MODULE[moduleName];
    if (!mod) return [];
    return actions.map((action) => mod[action]).filter(Boolean);
  },
};
