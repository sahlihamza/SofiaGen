import requests from "./httpService";

// Junction between a Product and a ProductTag (many-to-many).
// A document = 1 product <-> 1 tag. Backend mounted at
// /api/product-tag-relations/.
const ProductTagRelationServices = {
  // Link a single tag to a product. body: { productId, tagId }
  linkTag: async (body) => {
    return requests.post("/product-tag-relations/add", body);
  },

  // Replace the WHOLE set of tags of a product at once.
  // body: { tags: [tagId, ...] } -> { data, message }
  setProductTags: async (productId, tagIds = []) => {
    return requests.put(`/product-tag-relations/product/${productId}`, {
      tags: tagIds,
    });
  },

  // Tags linked to a product (tagId populated with the ProductTag document).
  getTagsByProduct: async (productId) => {
    return requests.get(`/product-tag-relations/product/${productId}`);
  },

  // Products that use a given tag (productId populated).
  getProductsByTag: async (tagId) => {
    return requests.get(`/product-tag-relations/tag/${tagId}`);
  },

  getLinkById: async (id) => {
    return requests.get(`/product-tag-relations/${id}`);
  },

  deleteLink: async (id) => {
    return requests.delete(`/product-tag-relations/${id}`);
  },
};

export default ProductTagRelationServices;
