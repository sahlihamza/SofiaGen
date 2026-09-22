import requests from "./httpService";

// A ProductVariation is a concrete, buyable variation of a variable product.
// Relation: Product 1 ---- N ProductVariation, and each variation links to the
// chosen AttributeValues through its `attributes: [{ attributeId, valueId }]`.
// Backend is mounted at /api/product-variations/.
const ProductVariationServices = {
  // All variations of a product (attributes.attributeId populated)
  getVariationsByProduct: async (productId) => {
    return requests.get(`/product-variations/product/${productId}`);
  },

  // A single variation (product + attributes populated)
  getVariationById: async (id) => {
    return requests.get(`/product-variations/${id}`);
  },

  // Create a single variation
  addVariation: async (body) => {
    return requests.post(`/product-variations/add`, body);
  },

  // Update a single variation
  updateVariation: async (id, body) => {
    return requests.put(`/product-variations/${id}`, body);
  },

  // Replace the full set of variations for a product in one call
  // body: { variations: [ { sku, attributes, pricing, ... }, ... ] }
  setProductVariations: async (productId, body) => {
    return requests.put(`/product-variations/product/${productId}`, body);
  },

  // Delete a single variation
  deleteVariation: async (id) => {
    return requests.delete(`/product-variations/${id}`);
  },
};

export default ProductVariationServices;
