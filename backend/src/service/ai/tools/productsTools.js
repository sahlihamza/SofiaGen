/**
 * Products tools  read-only wrappers over ProductService. Store-scoped
 * by construction.
 */

const ProductService = require("../../../service/ProductService");

const tools = [
  {
    name: "search_products",
    description:
      "Recherche des produits par nom ou mot-clé (limite max 20). Retourne nom, prix, statut, stock, URL produit publique. Toujours filtré pour la boutique de l'utilisateur.",
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
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
      const products = await ProductService.searchProducts({
        storeId,
        productName: String(args.query || "").trim(),
      });
      const list = Array.isArray(products) ? products : await products; // tolerate thenable
      return {
        query: args.query,
        count: list.length,
        items: list.slice(0, limit).map((p) => ({
          id: String(p._id),
          name: p.productName || "",
          sku: p.sku || "",
          status: p.status || "",
          stockStatus: p.stockStatus || "",
          regularPrice: p.regularPrice,
          salePrice: p.salePrice,
        })),
      };
    },
  },
  {
    name: "get_product",
    description:
      "Retourne les détails d'un produit par son identifiant. Toujours filtré pour la boutique de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
      },
      required: ["productId"],
      additionalProperties: false,
    },
    handler: async ({ storeId, args }) => {
      const p = await ProductService.getProductById(args.productId, storeId);
      if (!p) return { notFound: true };
      return {
        id: String(p._id),
        name: p.productName || "",
        description: p.description || "",
        status: p.status || "",
        stockStatus: p.stockStatus || "",
        sku: p.sku || "",
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        stockQuantity: p.stockQuantity ?? null,
      };
    },
  },
];

module.exports = { tools };