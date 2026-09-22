const crypto = require("crypto");

const DEFAULT_DEV_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
const ENCRYPTION_KEY =
  process.env.PAYMENT_ENCRYPTION_KEY ||
  process.env.ENCRYPTION_SECRET ||
  (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_ENCRYPTION_KEY : undefined);

if (!ENCRYPTION_KEY || String(ENCRYPTION_KEY).length < 32) {
  throw new Error(
    "PAYMENT_ENCRYPTION_KEY environment variable is required and must be at least 32 characters long"
  );
}

if (!process.env.PAYMENT_ENCRYPTION_KEY && process.env.NODE_ENV !== "production") {
  console.warn(
    " PAYMENT_ENCRYPTION_KEY is not set. Using a development default encryption key. Do not use this in production."
  );
}

const KEY = crypto.createHash("sha256").update(String(ENCRYPTION_KEY)).digest();
const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";

const isEncrypted = (value) =>
  typeof value === "string" && /^[0-9a-f]{32}:[0-9a-f]+$/.test(value);

const encrypt = (plainText) => {
  if (plainText === undefined || plainText === null || plainText === "") {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(String(plainText), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== "string" || !cipherText.includes(":")) {
    return cipherText;
  }

  const [ivHex, encrypted] = cipherText.split(":");
  if (!encrypted) {
    return cipherText;
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
};
