/**
 * cache.js
 *
 * Lightweight, dependency-free caching layer for the dashboard aggregation.
 *
 * Strategy:
 *  - If `REDIS_URL` is set AND a Redis client is available (ioredis), use it.
 *  - Otherwise fall back to an in-memory LRU-style cache scoped to one process.
 *
 * This keeps the code production-safe even when Redis is not installed or
 * not running: every write is wrapped in try/catch and never throws upstream.
 */
const { createClient } = (() => {
  try {
    // ioredis is used when present; it's optional and never required.
    return { createClient: require("ioredis").default };
  } catch {
    return { createClient: null };
  }
})();

const DEFAULT_TTL_SECONDS = 45;

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.timers = new Map(); // For automatic cleanup of expired entries.
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.clearTimer(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    // Clear any existing timer for this key.
    this.clearTimer(key);

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });

    // Schedule automatic cleanup so expired entries are proactively removed.
    const timer = setTimeout(() => {
      const entry = this.store.get(key);
      if (entry && entry.expiresAt && entry.expiresAt <= Date.now()) {
        this.store.delete(key);
      }
      this.timers.delete(key);
    }, ttlSeconds * 1000);
    this.timers.set(key, timer);

    // Eviction guard: prevent unbounded growth.
    if (this.store.size > 500) {
      const oldest = this.store.keys().next().value;
      if (oldest) {
        this.store.delete(oldest);
        this.clearTimer(oldest);
      }
    }
    return true;
  }

  clearTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async del(key) {
    this.store.delete(key);
    this.clearTimer(key);
    return true;
  }

  /**
   * Removes all keys matching a glob-like pattern (e.g. "dashboard:store:123:*").
   * Useful for invalidating an entire tenant's cache slice.
   */
  async delPattern(pattern) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.clearTimer(key);
      }
    }
    return true;
  }

  async delPattern(pattern) {
    const regex = new RegExp(`^${pattern.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count += 1;
      }
    }
    return count;
  }

  async flush() {
    this.store.clear();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    return true;
  }
}

class Cache {
  constructor() {
    this.enabled = !!process.env.REDIS_URL;
    this.client = null;
    this.memory = new MemoryCache();
    this._connectPromise = null;
  }

  /** Lazily connect to Redis only when REDIS_URL is configured. */
  _connect() {
    if (!this.enabled || !createClient) return null;
    if (this.client) return Promise.resolve(this.client);
    if (this._connectPromise) return this._connectPromise;

    this._connectPromise = (async () => {
      try {
        const client = createClient({ url: process.env.REDIS_URL });
        client.on("error", () => {
          // Redis error must never crash the request path.
          this.client = null;
        });
        await client.connect();
        this.client = client;
        return client;
      } catch {
        this.client = null;
        this._connectPromise = null; // Allow retry on next call.
        return null;
      }
    })();

    return this._connectPromise;
  }

  async get(key) {
    const redis = await this._connect();
    if (redis) {
      try {
        const raw = await redis.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        /* fall through to memory */
      }
    }
    return this.memory.get(key);
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const payload = JSON.stringify(value);
    const redis = await this._connect();
    if (redis) {
      try {
        await redis.set(key, payload, "EX", ttlSeconds);
        return true;
      } catch {
        /* fall through to memory */
      }
    }
    return this.memory.set(key, value, ttlSeconds);
  }

  async del(key) {
    const redis = await this._connect();
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        /* ignore */
      }
    }
    return this.memory.del(key);
  }

  /**
   * Invalidates all keys matching a pattern.
   * Useful to invalidate the cache for an entire store / user.
   * Example: cache.delPattern("dashboard:store:123:*")
   */
  async delPattern(pattern) {
    if (!pattern) return false;
    const redis = await this._connect();
    if (redis) {
      try {
        // Use SCAN to avoid blocking Redis.
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keys = [];
        for await (const batch of stream) {
          keys.push(...batch);
        }
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        return true;
      } catch {
        /* fall through to memory */
      }
    }
    return this.memory.delPattern(pattern);
  }

  async flush() {
    const redis = await this._connect();
    if (redis) {
      try {
        await redis.flushDb();
      } catch {
        /* ignore */
      }
    }
    return this.memory.flush();
  }

  /**
   * Builds a tenant-scoped cache key with sanitized segments to prevent
   * key injection / collisions across tenants.
   * Example: Cache.buildKey("dashboard", storeId, userId, "sales")
   *   => "dashboard:123:456:sales"
   */
  static buildKey(tenant, ...parts) {
    const sanitized = parts
      .filter(Boolean)
      .map((p) => String(p).replace(/[:#*?]/g, "_"))
      .join(":");
    return `${tenant}:${sanitized}`;
  }
}

module.exports = new Cache();
module.exports.MemoryCache = MemoryCache;
module.exports.Cache = Cache;
module.exports.DEFAULT_TTL_SECONDS = DEFAULT_TTL_SECONDS;
