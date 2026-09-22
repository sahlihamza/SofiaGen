/**
 * Orders tools  read-only wrappers over OrderQueryService and
 * StoreOwnerDashboardServiceV2. Store-scoped by construction.
 *
 * The tool layer never touches the Order / Customer mongoose models
 * directly: that boundary is owned by OrderQueryService so we have a
 * single place to enforce tenant isolation for AI consumers.
 */

const StoreOwnerDashboardV2 = require("../../../service/StoreOwnerDashboardServiceV2");
const OrderQueryService = require("../../../service/OrderQueryService");

const tools = [
  {
    name: "search_orders",
    description:
      "Recherche les commandes par statut (Pending | Processing | Delivered | Cancel | OnHold | Refunded | Failed). Retourne les N plus récentes avec id, client, total, statut, méthode de paiement. Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Pending", "Processing", "Delivered", "Cancel", "OnHold", "Refunded", "Failed"],
        },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
    handler: async ({ storeId, args, currency }) => {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
      const orders = await OrderQueryService.listRecentOrders({
        storeId,
        status: args.status || null,
        limit,
      });
      return {
        status: args.status || null,
        count: orders.length,
        currency: currency || "TND",
        items: orders.map((o) => ({
          id: String(o._id),
          invoice: o.invoice || "",
          customerName: o.customerName || "",
          total: Number(o.total) || 0,
          status: o.status || "",
          paymentMethod: o.paymentMethod || "",
          createdAt: o.createdAt,
        })),
      };
    },
  },
  {
    name: "get_order",
    description:
      "Retourne le détail d'une commande par son identifiant. Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
      },
      required: ["orderId"],
      additionalProperties: false,
    },
    handler: async ({ storeId, args }) => {
      const o = await OrderQueryService.getOrderForStore({
        storeId,
        orderId: args.orderId,
      });
      if (!o) return { notFound: true };
      return {
        id: String(o._id),
        invoice: o.invoice || "",
        status: o.status || "",
        paymentStatus: o.paymentStatus || "",
        paymentMethod: o.paymentMethod || "",
        total: Number(o.total) || 0,
        subTotal: Number(o.subTotal) || 0,
        shippingCost: Number(o.shippingCost) || 0,
        discount: Number(o.discount) || 0,
        createdAt: o.createdAt,
      };
    },
  },
  {
    name: "get_pending_orders",
    description:
      "Retourne le nombre de commandes par statut (pending, processing, delivered, cancelled, etc.). Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async ({ storeId }) => {
      const payload = await StoreOwnerDashboardV2.buildOrdersPayload(storeId);
      return { counts: payload?.counts || {} };
    },
  },
];

module.exports = { tools };