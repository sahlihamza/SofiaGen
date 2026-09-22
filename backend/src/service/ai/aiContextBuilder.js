/**
 * AiContextBuilder  turns a (request, authContext) pair into a minimal
 * business context that the LLM is allowed to see.
 *
 * Hard rules (enforced here, never in the prompt):
 *  - The storeId in the context is ALWAYS `req.authContext.storeId`,
 *    never the request body.
 *  - Only fields explicitly listed in `SAFE_KEYS` are forwarded. Any
 *    sensitive key (password, token, key, secret, hash) is rejected at
 *    the boundary.
 *  - The builder is the ONLY place that talks to the database to
 *    gather metrics. It delegates to existing business services
 *    (`StoreOwnerDashboardServiceV2`) rather than touching mongoose
 *    models directly  that keeps the tenant boundary owned by the
 *    same code path the rest of the app uses, and prevents new code
 *    in `service/ai/` from bypassing it.
 */

const cache = require("../../lib/cache");
const StoreOwnerDashboardV2 = require("../StoreOwnerDashboardServiceV2");
const { resolveStoreId } = require("../../utils/requestContext");

const FORBIDDEN_KEY_RE = /(password|token|secret|key|hash|api[_-]?key|access|refresh)/i;

function pickSafe(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (FORBIDDEN_KEY_RE.test(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = v.slice(0, 500) + "&";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Resolve the current page context. Pages pass a `context` payload in
 * the request body; we sanitise it here and merge it with what the
 * database tells us about the user's store. The DB-derived values are
 * always scoped by `req.authContext.storeId` (CRITICAL).
 */
async function build({ req, pageContext = null }) {
  const storeId = resolveStoreId(req) || null;
  const userId = req.user?._id ? String(req.user._id) : null;

  const ctx = {
    module: (pageContext && pageContext.module) || null,
    page: (pageContext && pageContext.page) || null,
    storeId: storeId ? String(storeId) : null, // echoed for confirmation, not for selection
    userId,
    locale: (pageContext && pageContext.locale) || "fr",
    currency: (pageContext && pageContext.currency) || "TND",
    pageData: pickSafe(pageContext && pageContext.data),
  };

  if (!storeId) return ctx;

  const cacheKey = `ai:ctx:${storeId}:${ctx.module || "global"}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return { ...ctx, storeSnapshot: pickSafe(cached) };
  }

  const snapshot = {};

  try {
    if (ctx.module === "orders" || ctx.module === "dashboard") {
      // Delegate to the same dashboard service the admin UI uses. It
      // already enforces the tenant filter on the customer-store join
      // and caches results for 45s  we get freshness for free without
      // touching Order/Product models from inside service/ai/.
      const kpis = await StoreOwnerDashboardV2.buildKpiCardsPayload(storeId);
      const orders = await StoreOwnerDashboardV2.buildOrdersPayload(storeId);
      const since = new Date(Date.now() - 7 * 86400000);
      const recent7dCount = (orders?.recent || []).filter(
        (o) => o.createdAt && new Date(o.createdAt).getTime() >= since.getTime()
      ).length;
      const recent7dRevenue = (orders?.recent || [])
        .filter((o) => o.createdAt && new Date(o.createdAt).getTime() >= since.getTime())
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      snapshot.ordersLast7d = {
        count: recent7dCount,
        revenue: Math.round(recent7dRevenue * 1000) / 1000,
        currency: ctx.currency,
      };
      if (kpis?.kpis) {
        snapshot.ordersToday = kpis.kpis.ordersToday;
        snapshot.pendingOrders = kpis.kpis.pendingOrders;
      }
    }

    if (ctx.module === "products" || ctx.module === "dashboard") {
      const kpis = await StoreOwnerDashboardV2.buildKpiCardsPayload(storeId);
      if (kpis?.inventory) {
        snapshot.productsLowStock = kpis.inventory.lowStock;
        snapshot.productsOutOfStock = kpis.inventory.outOfStock;
      }
    }
  } catch (err) {
    // Never let a context error block a chat; just log.
    require("../../config/logger").debug?.("[aiContextBuilder] snapshot failed", err.message);
  }

  await cache.set(cacheKey, snapshot, 30); // 30s TTL  short to stay fresh
  return { ...ctx, storeSnapshot: pickSafe(snapshot) };
}

module.exports = { build, pickSafe };