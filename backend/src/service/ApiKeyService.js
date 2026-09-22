const crypto = require("crypto");
const { ApiKey, API_KEY_SCOPES } = require("../models/ApiKey");
const AuditService = require("./AuditService");

/**
 * ApiKeyService
 *
 * Secrets are generated server-side, shown to the admin exactly once, and only
 * a SHA-256 hash is stored. Listing never returns the hash.
 */

const generateSecret = () => {
  const raw = crypto.randomBytes(24).toString("hex");
  const prefix = `sk_${raw.slice(0, 8)}`;
  const secret = `${prefix}_${raw.slice(8)}`;
  return { prefix, secret };
};

const hashSecret = (secret) => crypto.createHash("sha256").update(secret).digest("hex");

const sanitize = (doc) => {
  const json = doc.toJSON ? doc.toJSON() : doc;
  delete json.secretHash;
  return json;
};

async function create(storeId, data = {}, actorId = null) {
  const name = String(data.name || "").trim();
  if (!name) {
    const error = new Error("API key name is required");
    error.name = "ValidationError";
    throw error;
  }

  const requestedScopes = Array.isArray(data.scopes) ? data.scopes : [];
  const scopes = API_KEY_SCOPES.filter((scope) => requestedScopes.includes(scope));
  if (scopes.length === 0) {
    const error = new Error("At least one valid scope is required");
    error.name = "ValidationError";
    throw error;
  }

  let expiresAt = null;
  if (data.expiresAt) {
    const parsed = new Date(data.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      const error = new Error("Invalid expiration date");
      error.name = "ValidationError";
      throw error;
    }
    expiresAt = parsed;
  }

  const { prefix, secret } = generateSecret();
  const key = await ApiKey.create({
    storeId,
    name,
    prefix,
    secretHash: hashSecret(secret),
    scopes,
    expiresAt,
    createdBy: actorId,
  });

  AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "store",
    action: "api_key.created",
    summary: `API key "${name}" created`,
    entityType: "api_key",
    entityId: key._id,
    storeId,
    severity: "high",
    metadata: { scopes },
  }).catch(() => {});

  return { ...sanitize(key), secret };
}

async function list(storeId) {
  return ApiKey.find({ storeId }).select("-secretHash").sort({ createdAt: -1 }).lean();
}

async function rotate(storeId, keyId, actorId = null) {
  const key = await ApiKey.findOne({ _id: keyId, storeId });
  if (!key) {
    const error = new Error("API key not found");
    error.name = "NotFound";
    throw error;
  }
  if (key.status === "revoked") {
    const error = new Error("Cannot rotate a revoked API key");
    error.name = "ValidationError";
    throw error;
  }

  const { prefix, secret } = generateSecret();
  key.prefix = prefix;
  key.secretHash = hashSecret(secret);
  await key.save();

  AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "store",
    action: "api_key.rotated",
    summary: `API key "${key.name}" rotated`,
    entityType: "api_key",
    entityId: key._id,
    storeId,
    severity: "critical",
  }).catch(() => {});

  return { ...sanitize(key), secret };
}

async function revoke(storeId, keyId, actorId = null) {
  const key = await ApiKey.findOneAndUpdate(
    { _id: keyId, storeId },
    { $set: { status: "revoked", revokedAt: new Date() } },
    { new: true }
  ).select("-secretHash");
  if (!key) {
    const error = new Error("API key not found");
    error.name = "NotFound";
    throw error;
  }

  AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "store",
    action: "api_key.revoked",
    summary: `API key "${key.name}" revoked`,
    entityType: "api_key",
    entityId: key._id,
    storeId,
    severity: "high",
  }).catch(() => {});

  return key;
}

async function setExpiry(storeId, keyId, expiresAt, actorId = null) {
  let parsed = null;
  if (expiresAt) {
    parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      const error = new Error("Invalid expiration date");
      error.name = "ValidationError";
      throw error;
    }
  }

  const key = await ApiKey.findOneAndUpdate(
    { _id: keyId, storeId },
    { $set: { expiresAt: parsed } },
    { new: true }
  ).select("-secretHash");
  if (!key) {
    const error = new Error("API key not found");
    error.name = "NotFound";
    throw error;
  }

  AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "store",
    action: "api_key.expiry_set",
    summary: `Expiration ${parsed ? `set to ${parsed.toISOString()}` : "cleared"} for API key "${key.name}"`,
    entityType: "api_key",
    entityId: key._id,
    storeId,
    severity: "medium",
  }).catch(() => {});

  return key;
}

/**
 * Verify a raw bearer-style key for future auth middleware: resolves by hash,
 * enforces status/expiry and touches lastUsedAt.
 */
async function verify(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;
  const key = await ApiKey.findOne({ secretHash: hashSecret(rawKey.trim()) });
  if (!key) return null;
  if (key.status !== "active") return null;
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null;
  await ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } });
  return key;
}

module.exports = { create, list, rotate, revoke, setExpiry, verify, API_KEY_SCOPES };
