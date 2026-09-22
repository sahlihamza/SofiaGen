const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = [
  "password",
  "newpassword",
  "oldpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secretkey",
  "secret",
  "clientsecret",
  "webhooksecret",
  "privatekey",
  "authorization",
  "cardnumber",
  "cardnum",
  "cvv",
  "cvc",
  "pin",
  "iban",
  "smtppassword",
  "signature",
  "ssn",
  "creditcard",
  "sessionid",
  "twofactorsecret",
  "passwordresettoken",
];

const isSensitiveKey = (key) => {
  const normalized = String(key).toLowerCase().replace(/[_\-\s]/g, "");
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
};

const sanitizeAuditPayload = (payload, { maxDepth = 8 } = {}) => {
  const seen = new WeakSet();

  const walk = (value, depth) => {
    if (value === null || value === undefined) return value;
    if (depth > maxDepth) return "[MAX_DEPTH]";

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, depth + 1));
    }

    if (value instanceof Date) return value;
    if (typeof value === "object") {
      if (typeof value.toHexString === "function") return value;
      if (seen.has(value)) return "[CIRCULAR]";
      seen.add(value);

      const source = typeof value.toObject === "function" ? value.toObject() : value;
      const out = {};
      for (const [key, val] of Object.entries(source)) {
        out[key] = isSensitiveKey(key) ? REDACTED : walk(val, depth + 1);
      }
      return out;
    }

    return value;
  };

  return walk(payload, 0);
};

module.exports = { sanitizeAuditPayload, SENSITIVE_KEYS, REDACTED, isSensitiveKey };
