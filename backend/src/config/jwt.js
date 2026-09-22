
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const ensureJwtConfig = () => {
  if (!accessSecret || !refreshSecret) {
    throw new Error(
      "JWT configuration is missing. Set JWT_SECRET or both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET."
    );
  }
};

const normalizeRoleIds = (roleValue) => {
  if (Array.isArray(roleValue)) {
    return roleValue
      .map((role) => {
        if (!role) return null;
        if (typeof role === "string") return role;
        if (role._id) return role._id.toString();
        if (role.id) return role.id.toString();
        return null;
      })
      .filter(Boolean);
  }

  if (typeof roleValue === "string") return [roleValue];
  if (roleValue?._id) return [roleValue._id.toString()];
  if (roleValue?.id) return [roleValue.id.toString()];
  return [];
};

const generateAccessToken = (user) => {
  ensureJwtConfig();

  const userId = user._id?.toString ? user._id.toString() : user._id;
  const roleIds = normalizeRoleIds(user.role);
  const storeId = user.currentStoreId
    ? String(user.currentStoreId)
    : user.storeIds?.[0]
    ? String(user.storeIds[0])
    : null;

  return jwt.sign(
    {
      id: userId,
      userId,
      roleIds,
      storeId,
      sessionId: randomBytes(16).toString("hex"),
    },
    accessSecret,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "7d" }
  );
};

const generateRefreshToken = (user) => {
  ensureJwtConfig();
  return jwt.sign(
    { _id: user._id },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );
};

// Customer-facing session token. Kept separate from generateAccessToken
// because the storefront reads these claims straight off the decoded token.
const signInToken = (user) => {
  ensureJwtConfig();
  return jwt.sign(
    {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      image: user.image,
    },
    accessSecret,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d" }
  );
};

// Short-lived token that carries the sign-up payload through the email
// verification link. registerCustomer verifies it with JWT_SECRET_FOR_VERIFY,
// so the secret is read at call time to stay in sync with it.
const tokenForVerify = (user) => {
  const verifySecret = process.env.JWT_SECRET_FOR_VERIFY;
  if (!verifySecret) {
    throw new Error(
      "JWT configuration is missing. Set JWT_SECRET_FOR_VERIFY to send verification emails."
    );
  }
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      password: user.password,
    },
    verifySecret,
    { expiresIn: "15m" }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  signInToken,
  tokenForVerify,
};