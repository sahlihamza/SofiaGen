const { permissions } = require("./permissions");

const PERMISSION_BY_CODE = {};
for (const perm of permissions) {
  PERMISSION_BY_CODE[perm.code] = perm;
}

const DEFAULT_ROLES = [
  {
    _id: "64a000000000000000000001",
    name: "Super Admin",
    slug: "super-admin",
    description: "Full access to every part of the dashboard.",
    scope: "platform",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "platform")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000002",
    name: "Platform Admin",
    slug: "platform-admin",
    description: "Administrateur de la plateforme avec accès aux paramètres et gestion utilisateurs",
    scope: "platform",
    isSystem: true,
    permissionCodes: [
      ...permissions
        .filter((p) => p.module === "Platform User" && ["view", "create", "update", "suspend", "activate", "sessions"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Plan" && ["view", "create", "update"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Role" && ["view", "create", "update"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Audit" && ["view", "export"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Analytics" && ["view", "export"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Dashboard" && p.action === "view")
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Settings" && ["view", "update"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Store" && ["view", "update"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Invitation" && ["view", "create", "resend", "revoke"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Team" && ["view", "create", "update", "delete", "members_manage"].includes(p.action))
        .map((p) => p.code),
    ],
  },
  {
    _id: "64a000000000000000000014",
    name: "Platform User Manager",
    slug: "platform-user-manager",
    description:
      "Gestionnaire des utilisateurs plateforme : peut consulter, crér, modifier, suspendre, réactiver, révoquer des sessions et exporter des utilisateurs sans être Super Admin. N'a pas les droits de suppression ou d'usurpation.",
    scope: "platform",
    isSystem: true,
    permissionCodes: [
      ...permissions
        .filter((p) => p.module === "Platform User" && ["view", "create", "update", "suspend", "activate", "sessions", "export"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Role" && ["view"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Audit" && ["view"].includes(p.action))
        .map((p) => p.code),
    ],
  },
  {
    _id: "64a000000000000000000012",
    name: "Store Owner",
    slug: "store-owner",
    description: "Propriétaire de store avec accès complet  son store",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000003",
    name: "CEO",
    slug: "ceo",
    description: "Executive overview access.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000004",
    name: "Manager",
    slug: "manager",
    description: "Manage day-to-day store operations.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000005",
    name: "Accountant",
    slug: "accountant",
    description: "Access to finance and order data.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store" && ["view", "create", "update"].includes(p.action))
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000006",
    name: "Cashier",
    slug: "cashier",
    description: "Handle orders and customers.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store" && ["view", "create", "update"].includes(p.action))
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000007",
    name: "Security Guard",
    slug: "security-guard",
    description: "Limited operational access.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store" && p.action === "view")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000008",
    name: "Driver",
    slug: "driver",
    description: "Delivery and order fulfilment access.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store" && p.action === "view")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000009",
    name: "Admin",
    slug: "admin",
    description: "Manage store data, catalog and staff.",
    scope: "store",
    isSystem: true,
    permissionCodes: permissions
      .filter((p) => p.scope === "store")
      .map((p) => p.code),
  },
  {
    _id: "64a000000000000000000013",
    name: "Staff Manager",
    slug: "staff-manager",
    description: "Manage platform staff users.",
    scope: "platform",
    isSystem: true,
    permissionCodes: [
      ...permissions
        .filter((p) => p.module === "Platform User" && ["view", "create", "update", "suspend", "activate"].includes(p.action))
        .map((p) => p.code),
      ...permissions
        .filter((p) => p.module === "Platform Team" && ["members_manage"].includes(p.action))
        .map((p) => p.code),
    ],
  },
];

const allPermissionCodes = new Set(permissions.map((p) => p.code));

for (const role of DEFAULT_ROLES) {
  for (const code of role.permissionCodes) {
    if (!allPermissionCodes.has(code)) {
      throw new Error(
        `[RBAC] Code de permission invalide "${code}" référenc dans le rôle "${role.name}" (config/rbac/roles.js)  aucune Permission correspondante dans permissions.js.`
      );
    }
  }
}

const getRolePermissionCodes = (roleName, allPermissionCodes = []) => {
  const role = DEFAULT_ROLES.find((r) => r.name === roleName);
  if (!role) return [];
  return role.permissionCodes.filter((code) => allPermissionCodes.includes(code));
};

const resolvePermissionIds = (roleName, allPermissions = []) => {
  const codes = getRolePermissionCodes(roleName, allPermissions.map((p) => p.code));
  const byCode = {};
  for (const perm of allPermissions) {
    byCode[perm.code] = perm._id;
  }
  return codes.map((code) => byCode[code]).filter(Boolean);
};

module.exports = {
  DEFAULT_ROLES,
  getRolePermissionCodes,
  resolvePermissionIds,
};
