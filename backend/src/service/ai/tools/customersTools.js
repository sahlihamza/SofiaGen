/**
 * Customers tools  read-only wrappers over OrderQueryService and the
 * existing dashboard service. Store-scoped by construction.
 */

const StoreOwnerDashboardV2 = require("../../../service/StoreOwnerDashboardServiceV2");
const OrderQueryService = require("../../../service/OrderQueryService");

const tools = [
  {
    name: "search_customers",
    description:
      "Recherche des clients par nom, prénom ou email. Retourne jusqu'é 20 résultats. Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    handler: async ({ storeId, args }) => {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
      const customers = await OrderQueryService.searchCustomers({
        storeId,
        query: args.query,
        limit,
      });
      return {
        query: args.query,
        count: customers.length,
        items: customers.map((c) => ({
          id: String(c._id),
          name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.email || "",
          createdAt: c.createdAt,
        })),
      };
    },
  },
  {
    name: "get_customer_summary",
    description:
      "Retourne un résumé des clients de la boutique (total, nouveaux aujourd'hui, recurrents). Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async ({ storeId }) => {
      const payload = await StoreOwnerDashboardV2.buildCustomersPayload(storeId);
      return {
        total: payload?.total ?? 0,
        new: payload?.new ?? 0,
        returning: payload?.returning ?? 0,
      };
    },
  },
];

module.exports = { tools };