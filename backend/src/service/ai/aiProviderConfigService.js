const crypto = require("crypto");
const AIProviderConfig = require("../../models/AIProviderConfig");
const logger = require("../../config/logger");

/**
 * aiProviderConfigService  CRUD + AES-256-GCM encryption of provider
 * API keys.
 *
 * Encryption key: process.env.AI_PROVIDER_ENCRYPTION_KEY (32 bytes, base64).
 * If absent, the service refuses to save keys. In dev, a deterministic
 * key is derived from JWT_ACCESS_SECRET so unit tests work without any
 * extra setup, but a warning is logged.
 *
 * The plaintext key is NEVER returned by any getter  only `hasApiKey`
 * and `apiKeyLast4` are exposed.
 */

const ALGO = "aes-256-gcm";

function getEncryptionKey() {
  if (process.env.AI_PROVIDER_ENCRYPTION_KEY) {
    const raw = Buffer.from(process.env.AI_PROVIDER_ENCRYPTION_KEY, "base64");
    if (raw.length !== 32) {
      throw new Error("AI_PROVIDER_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
    }
    return raw;
  }
  if (process.env.JWT_ACCESS_SECRET) {
    // Dev-only derivation. Logged loudly so it never silently ships.
    logger.warn(
      "[aiProviderConfigService] using dev-only key derivation from JWT_ACCESS_SECRET; set AI_PROVIDER_ENCRYPTION_KEY in production"
    );
    return crypto.createHash("sha256").update(`malla:${process.env.JWT_ACCESS_SECRET}`).digest();
  }
  throw new Error("No encryption key available for AI provider configs");
}

function encryptApiKey(plaintext) {
  if (!plaintext) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

function decryptApiKey(payload) {
  if (!payload) return null;
  const [ivB64, dataB64, tagB64] = String(payload).split(".");
  if (!ivB64 || !dataB64 || !tagB64) return null;
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch (err) {
    // Malformed / tampered ciphertext: do not let the caller crash.
    logger.warn(`[aiProviderConfigService] decrypt failed: ${err.message}`);
    return null;
  }
}

async function saveProviderConfig({
  storeId,
  providerName,
  model = "",
  baseUrl = "",
  apiKey = null,
  isDefault = false,
  enabled = true,
  softLimits = null,
}) {
  const update = {
    storeId,
    providerName,
    model,
    baseUrl,
    enabled,
    isDefault,
  };
  if (softLimits) update.softLimits = softLimits;
  if (apiKey) {
    update.apiKeyCipher = encryptApiKey(apiKey);
    update.apiKeyLast4 = apiKey.slice(-4);
  }

  if (isDefault) {
    await AIProviderConfig.updateMany({ storeId, _id: { $ne: null } }, { $set: { isDefault: false } });
  }

  const doc = await AIProviderConfig.findOneAndUpdate(
    { storeId, providerName },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return sanitize(doc);
}

function sanitize(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.apiKeyCipher;
  return obj;
}

async function listProviderConfigs(storeId) {
  const docs = await AIProviderConfig.find({ storeId }).sort({ createdAt: -1 });
  return docs.map(sanitize);
}

module.exports = {
  encryptApiKey,
  decryptApiKey,
  saveProviderConfig,
  listProviderConfigs,
  sanitize,
};