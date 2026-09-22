const PERMISSION_CODE_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const validatePermissionCode = (code) => {
  if (typeof code !== "string") return false;
  return PERMISSION_CODE_REGEX.test(code.trim().toLowerCase());
};

module.exports = { validatePermissionCode, PERMISSION_CODE_REGEX };
