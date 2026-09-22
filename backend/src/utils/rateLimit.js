const cache = require("../lib/cache");
const logger = require("../config/logger");

const DEFAULT_CONFIG = {
  email: { max: 10, window: 60 * 1000, name: "emails" },
  login: { max: 5, window: 15 * 60 * 1000, name: "logins" },
  api: { max: 100, window: 60 * 1000, name: "api_calls" },
  password_reset: { max: 3, window: 60 * 60 * 1000, name: "password_resets" },
  webhook: { max: 1000, window: 60 * 1000, name: "webhooks" },
  store_create: { max: 3, window: 60 * 60 * 1000, name: "store_creation" },
  auth_register: { max: 5, window: 60 * 60 * 1000, name: "registration" },
};

class RateLimit {
  constructor() {
    this.localStore = new Map();
  }

  async check(key, options = {}) {
    const { max, window } = options;
    if (!max || !window) {
      throw new Error("RateLimit.check: max and window are required");
    }

    const now = Date.now();
    const cacheKey = `ratelimit:${key}`;

    let history = await cache.get(cacheKey);
    if (!history) history = [];

    history = history.filter((timestamp) => now - timestamp < window);

    if (history.length >= max) {
      const oldestEntry = Math.min(...history);
      const retryAfter = Math.ceil((window - (now - oldestEntry)) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        limit: max,
      };
    }

    history.push(now);
    const ttlSeconds = Math.ceil(window / 1000);
    await cache.set(cacheKey, history, ttlSeconds);

    return {
      allowed: true,
      remaining: max - history.length,
      retryAfter: 0,
      limit: max,
    };
  }

  async reset(key) {
    await cache.del(`ratelimit:${key}`);
  }

  middleware(type = "api", getKey = (req) => req.ip) {
    const config = DEFAULT_CONFIG[type] || DEFAULT_CONFIG.api;

    return async (req, res, next) => {
      try {
        const key = getKey(req);
        const result = await this.check(key, config);

        res.setHeader("X-RateLimit-Limit", config.max);
        res.setHeader("X-RateLimit-Remaining", result.remaining);

        if (!result.allowed) {
          res.setHeader("Retry-After", result.retryAfter);
          logger.warn(`Rate limit exceeded: ${key} (${type})`);
          return res.status(429).json({
            success: false,
            message: "Trop de requêtes",
            code: "RATE_LIMITED",
            retryAfter: result.retryAfter,
          });
        }

        next();
      } catch (err) {
        logger.error(`RateLimit middleware failed: ${err.message}`);
        next();
      }
    };
  }
}

module.exports = new RateLimit();
module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
