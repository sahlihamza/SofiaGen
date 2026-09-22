import requests from "./httpService";

const ProductImageServices = {
  // get all images of a product (sorted by displayOrder)
  getImagesByProduct: async (productId) => {
    return requests.get(`/product-images/product/${productId}`);
  },

  addProductImage: async (body) => {
    return requests.post("/product-images/add", body);
  },

  updateProductImage: async (id, body) => {
    return requests.patch(`/product-images/${id}`, body);
  },

  deleteProductImage: async (id) => {
    return requests.delete(`/product-images/${id}`);
  },

  deleteImagesByProduct: async (productId) => {
    return requests.delete(`/product-images/product/${productId}`);
  },
};

export default ProductImageServices;
