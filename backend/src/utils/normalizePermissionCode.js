const normalizePermissionCode = (code) => {
  if (typeof code !== "string") return "";
  return code.trim().toLowerCase().replace(/[\s_]+/g, ".").replace(/\.+/g, ".");
};

module.exports = { normalizePermissionCode };
