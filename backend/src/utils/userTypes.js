/**
 * Single source of truth for the `userType` values on the User model.
 *
 * Used by:
 *  - models/User.js (schema enum/default)
 *  - middleware/auth.js (authorization gates such as `isAdmin`)
 *
 * Add new user types here first  both the DB schema and the access-control
 * logic will pick them up automatically.
 */
const USER_TYPES = {
  SUPER_ADMIN: "superadmin",
  PLATFORM_ADMIN: "platform_admin",
  STORE_ADMIN: "store_admin",
  STAFF: "staff",
  CUSTOMER: "customer",
  DRIVER: "driver",
};

const USER_TYPE_VALUES = Object.values(USER_TYPES);

/**
 * User types considered "admin" for generic admin-gated endpoints
 * (menus, sections, forms, testimonials, asset folders, saved blocks, etc.).
 */
const ADMIN_USER_TYPES = [
  USER_TYPES.SUPER_ADMIN,
  USER_TYPES.PLATFORM_ADMIN,
  USER_TYPES.STORE_ADMIN,
];

module.exports = {
  USER_TYPES,
  USER_TYPE_VALUES,
  ADMIN_USER_TYPES,
};
