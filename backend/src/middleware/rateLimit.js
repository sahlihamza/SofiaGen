const buildKey = (req, keyBy) => {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  if (keyBy === "ip") return ip;

  const storeId =
    req.params?.storeId ||
    req.body?.storeId ||
    req.query?.storeId ||
    req.currentStoreId ||
    req.get?.("company") ||
    "no-store";

  return keyBy === "store" ? `store:${storeId}` : `${ip}:${storeId}`;
};

const createRateLimiter = ({ max = 100, windowMinutes = 15, keyBy = "ip", message } = {}) => {
  const hits = new Map();
  const windowMs = windowMinutes * 60 * 1000;

  return (req, res, next) => {
    const key = buildKey(req, keyBy);
    const now = Date.now();

    const record = hits.get(key);
    if (record && now - record.windowStart < windowMs) {
      if (record.count >= max) {
        const retryAfterSec = Math.ceil((record.windowStart + windowMs - now) / 1000);
        res.setHeader("Retry-After", String(retryAfterSec));
        return res.status(429).json({
          success: false,
          code: "RATE_LIMITED",
          message: message || "Trop de requêtes, veuillez réssayer plus tard.",
        });
      }
      record.count += 1;
    } else {
      hits.set(key, { count: 1, windowStart: now });
    }

    // Sweep stale entries opportunistically instead of a separate timer 
    // this map is unbounded otherwise on a long-running process.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now - v.windowStart >= windowMs) hits.delete(k);
      }
    }

    next();
  };
};

module.exports = { createRateLimiter };
