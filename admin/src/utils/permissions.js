/**
 * Retourne true si l'utilisateur courant est un superadmin.
 * @param {object} adminInfo - objet renvoyé par AdminContext.state.adminInfo
 */
export const isSuperAdmin = (adminInfo) =>
  Boolean(adminInfo?.isSuperAdmin) ||
  adminInfo?.userType === "superadmin" ||
  adminInfo?.accountType === "superadmin" ||
  adminInfo?.role === "Super Admin" ||
  (typeof adminInfo?.role === "object" && adminInfo?.role?.name === "Super Admin");

/**
 * Retourne true si l'utilisateur courant est un admin plateforme (superadmin ou platform_admin).
 */
export const isPlatformAdmin = (adminInfo) =>
  isSuperAdmin(adminInfo) || adminInfo?.userType === "platform_admin" || adminInfo?.accountType === "platform_admin";

const permissionModuleToRouteKeys = {
  dashboard: ["dashboard"],
  analytics: ["analytics"],
  products: ["products", "product"],
  categories: ["categories"],
  attributes: ["attributes"],
  coupons: ["coupons"],
  "platform-coupons": ["platform-coupons"],
  plans: ["plans", "plan-detail"],
  features: ["features"],
  "quota-types": ["quota-types", "quotatypes"],
  subscriptions: ["subscriptions"],
  invoices: ["invoices"],
  payments: ["payments"],
  "usage-tracking": ["usage-tracking"],
  customers: ["customers", "customer-order"],
  orders: ["orders", "order"],
  staff: ["our-staff"],
  riders: ["riders"],
  reviews: ["product-reviews"],
  posts: ["posts", "post-categories", "post-tags", "post-comments", "post"],
  settings: ["settings", "edit-profile", "roles", "permissions"],
  "online-store": ["store", "customization", "themes", "store-settings"],
  notifications: ["notifications"],
  pages: ["404", "coming-soon", "currencies"],
  "platform-user": ["users", "platform-users"],
  "platform-role": ["roles", "platform-roles"],
  audit: ["audit", "platform-audit", "platform-audit-logs"],
  "platform-notification": ["notifications", "platform-notifications"],
};

const normalizeRouteKey = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "-")
    : "";

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const extractAccessFromPermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];

  return permissions.flatMap((permission) => {
    if (typeof permission === "string") {
      const parts = permission.split(/[._]/).filter(Boolean);
      if (parts.length <= 1) return [];
      const moduleKey = normalizeRouteKey(parts.slice(0, -1).join(" "));
      if (!moduleKey) return [];
      return permissionModuleToRouteKeys[moduleKey] || [moduleKey];
    }

    const moduleKey = normalizeRouteKey(permission?.module || permission?.name);
    if (!moduleKey) return [];

    return permissionModuleToRouteKeys[moduleKey] || [moduleKey];
  });
};

/**
 * Extrait les accès sidebar depuis les permissions d'un rôle.
 */
export const getSidebarAccessFromPermissions = (roleValue) => {
  const roles = Array.isArray(roleValue) ? roleValue : roleValue ? [roleValue] : [];

  const permissions = roles.flatMap((roleItem) => {
    if (typeof roleItem === "string") return [];
    if (Array.isArray(roleItem?.permissions)) return roleItem.permissions;
    if (roleItem?.permissions && typeof roleItem.permissions === "object") {
      return [roleItem.permissions];
    }
    return [];
  });

  return dedupe(extractAccessFromPermissions(permissions));
};

/**
 * Fournit un fallback d'accès sidebar pour les comptes de store admin.
 * Lorsque le backend ne fournit pas de access_list explicite, on attribue un
 * sous-ensemble de routes de base pour les comptes adminstore/store_admin.
 */
export const getSidebarAccessFallbackForAdmin = (adminInfo) => {
  if (!adminInfo) return [];

  const roleNames = Array.isArray(adminInfo?.role)
    ? adminInfo.role
        .map((item) => (typeof item === "string" ? item : item?.name || item?.slug || ""))
        .filter(Boolean)
    : [adminInfo?.role].filter(Boolean);

  const normalizedRoleNames = roleNames.map((value) => String(value).trim().toLowerCase());
  const isStoreAdmin =
    adminInfo?.userType === "store_admin" ||
    adminInfo?.accountType === "store_admin" ||
    normalizedRoleNames.includes("adminstore") ||
    normalizedRoleNames.includes("store owner") ||
    normalizedRoleNames.includes("store-owner");

  if (!isStoreAdmin) return [];

  return ["dashboard", "products", "categories", "attributes", "product-tags", "brands", "orders", "customers", "coupons", "our-staff", "store-settings"];
};

/**
 * Résout les accès sidebar pour un admin en combinant permissions du rôle et fallback store admin.
 */
export const resolveSidebarAccess = (adminInfo) => {
  const fromPermissions = getSidebarAccessFromPermissions(adminInfo?.role);
  if (fromPermissions.length > 0) return fromPermissions;
  return getSidebarAccessFallbackForAdmin(adminInfo);
};

/**
 * Filtre récursivement une liste d'entrés de menu selon les priviléges.
 *
 * Chaque entré peut porter un champ `requiresSuperAdmin: true` ou
 * `requiresPlatformAdmin: true`  champ ajouté par nos soins dans sidebar.js.
 *
 * @param {Array} items     liste d'entrés du sidebar (éventuellement imbriqués via `routes`)
 * @param {object} adminInfo
 * @returns {Array} nouvelle liste, filtré
 */
export const filterSidebarByPrivileges = (
  items,
  adminInfo,
  parentRequiresSuperAdmin = false,
  parentRequiresPlatformAdmin = false
) => {
  if (!Array.isArray(items)) return [];

  const sa = isSuperAdmin(adminInfo);
  const pa = isPlatformAdmin(adminInfo);

  return items
    .filter((item) => {
      if (!item) return false;
      
      const requiresSA = item.requiresSuperAdmin || parentRequiresSuperAdmin;
      const requiresPA = item.requiresPlatformAdmin || parentRequiresPlatformAdmin;

      if (item.requiresSuperAdmin && !sa) return false;
      if (item.requiresPlatformAdmin && !pa) return false;
      
      // Les superadmins ne doivent voir que les onglets dédiés  la plateforme
      if (sa && !requiresSA && !requiresPA) return false;

      return true;
    })
    .map((item) => {
      if (Array.isArray(item.routes)) {
        return {
          ...item,
          routes: filterSidebarByPrivileges(
            item.routes,
            adminInfo,
            item.requiresSuperAdmin || parentRequiresSuperAdmin,
            item.requiresPlatformAdmin || parentRequiresPlatformAdmin
          ),
        };
      }
      return item;
    })
    .filter((item) => {
      if (!Array.isArray(item.routes)) return true;
      if (!item.path && item.routes.length === 0) return false;
      return true;
    });
};
