import requests from "./httpService";

const WishlistService = {
  getWishlist: async ({ storeId, customerId }) => {
    return requests.post("/wishlist", { storeId, customerId });
  },

  addToWishlist: async ({ storeId, customerId, productId }) => {
    return requests.post("/wishlist", { storeId, customerId, productId });
  },

  removeFromWishlist: async ({ storeId, customerId, productId }) => {
    return requests.delete("/wishlist", { storeId, customerId, productId });
  },

  toggleWishlist: async ({ storeId, customerId, productId }) => {
    return requests.post("/wishlist/toggle", { storeId, customerId, productId });
  },
};

export default WishlistService;
