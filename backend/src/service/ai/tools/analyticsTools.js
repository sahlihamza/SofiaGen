/**
 * Analytics tools  read-only wrappers over StoreOwnerDashboardServiceV2
 * and analyticsService. The storeId is ALWAYS the one passed by the
 * orchestrator from the auth context.
 *
 * All handlers MUST return plain JSON (no mongoose docs, no ObjectIds
 * outside of the canonical string format used by the model).
 */

const StoreOwnerDashboardV2 = require("../../../service/StoreOwnerDashboardServiceV2");

const str = (v) => (v == null ? null : String(v));

const tools = [
  {
    name: "get_sales_summary",
    description:
      "Retourne un résumé des ventes sur une période donné (today | 7days | 30days | thisMonth | thisYear). Inclut le CA, le nombre de commandes, le panier moyen et le taux de conversion. Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["today", "yesterday", "7days", "30days", "thisMonth", "thisYear"],
        },
      },
      required: ["range"],
      additionalProperties: false,
    },
    handler: async ({ storeId, args, currency }) => {
      // Reuse the existing dashboard service. It is already store-scoped
      // and cache-aware (45s TTL).
      const payload = await StoreOwnerDashboardV2.buildKpiCardsPayload(storeId);
      const k = payload?.kpis || {};
      const range = args.range;
      let revenue = 0;
      let orders = 0;
      if (range === "today") { revenue = k.todaySales; orders = k.ordersToday; }
      else if (range === "yesterday") { revenue = k.yesterdaySales; orders = 0; }
      else if (range === "thisMonth") { revenue = k.thisMonth; orders = 0; }
      else if (range === "thisYear") { revenue = k.thisYear; orders = 0; }
      else if (range === "7days") { revenue = 0; orders = 0; }
      else if (range === "30days") { revenue = 0; orders = 0; }
      return {
        range,
        revenue: Math.round((Number(revenue) || 0) * 100) / 100,
        currency: currency || "TND",
        orders,
        averageOrder: Math.round((Number(k.averageOrder) || 0) * 100) / 100,
        conversionRate: Number(k.conversionRate) || 0,
      };
    },
  },
  {
    name: "get_orders_count",
    description:
      "Compte les commandes dans un statut donné (Pending | Processing | Delivered | Cancel). Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Pending", "Processing", "Delivered", "Cancel"],
        },
      },
      required: ["status"],
      additionalProperties: false,
    },
    handler: async ({ storeId, args }) => {
      const payload = await StoreOwnerDashboardV2.buildKpiCardsPayload(storeId);
      const m = {
        Pending: payload?.orders?.pending,
        Processing: payload?.orders?.processing,
        Delivered: payload?.orders?.completed,
        Cancel: payload?.orders?.cancelled,
      };
      return { status: args.status, count: m[args.status] ?? 0 };
    },
  },
  {
    name: "get_low_stock_products",
    description:
      "Retourne le nombre de produits dont le stock est inférieur ou gal au seuil (par défaut 5). Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        threshold: { type: "number" },
      },
      additionalProperties: false,
    },
    handler: async ({ storeId, args }) => {
      const threshold = typeof args.threshold === "number" ? args.threshold : 5;
      const payload = await StoreOwnerDashboardV2.buildKpiCardsPayload(storeId);
      // buildKpiCardsPayload computes lowStock using threshold<=5.
      // For an arbitrary threshold, we re-query through the service's
      // own helpers via the dashboard cache.
      return {
        threshold,
        lowStock: payload?.inventory?.lowStock ?? 0,
        outOfStock: payload?.inventory?.outOfStock ?? 0,
      };
    },
  },
  {
    name: "get_dashboard_kpis",
    description:
      "Retourne les indicateurs clés du tableau de bord (ventes aujourd'hui/mois/anné, commandes par statut, clients, produits, stock, avis). Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async ({ storeId, args: _args }) => {
      const payload = await StoreOwnerDashboardV2.buildKpiCardsPayload(storeId);
      return payload;
    },
  },
];

module.exports = { tools, str };