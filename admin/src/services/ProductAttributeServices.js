import requests from './httpService';

// Liaison many-to-many between a Product and an Attribute.
// A document = 1 product <-> 1 attribute, with product-specific settings.
const ProductAttributeServices = {
  // Link a single attribute to a product
  addProductAttribute: async (body) => {
    return requests.post('/product-attributes/add', body);
  },

  // Replace ALL attributes of a product at once
  // body: { attributes: [ { attribute, values, isVisible, usedForVariation }, ... ] }
  updateProductAttributes: async (productId, body) => {
    return requests.put(`/product-attributes/product/${productId}`, body);
  },

  // Attributes of a product (attribute populated)
  getProductAttributes: async (productId) => {
    return requests.get(`/product-attributes/product/${productId}`);
  },

  // Products using an attribute (product populated)
  getAttributeProducts: async (attributeId) => {
    return requests.get(`/product-attributes/attribute/${attributeId}`);
  },

  getProductAttributeById: async (id) => {
    return requests.get(`/product-attributes/${id}`);
  },

  updateProductAttribute: async (id, body) => {
    return requests.put(`/product-attributes/${id}`, body);
  },

  deleteProductAttribute: async (id) => {
    return requests.delete(`/product-attributes/${id}`);
  },
};

export default ProductAttributeServices;
