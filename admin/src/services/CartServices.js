import requests from "./httpService.js";

const CART_SESSION_STORAGE_KEY = "sofigen_cart_session_id";

const getOrCreateSessionId = () => {
  if (typeof window === "undefined") {
    return "guest-session";
  }

  let sessionId = window.localStorage.getItem(CART_SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
};

const CartServices = {
  getSessionId: () => getOrCreateSessionId(),

  getCart: async (sessionId) => {
    return requests.get(`/cart/${sessionId || getOrCreateSessionId()}`);
  },

  addItem: async ({ productId, variantId, quantity = 1, price = 0, storeId }) => {
    const sessionId = getOrCreateSessionId();

    return requests.post(`/cart/${sessionId}/items`, {
      productId,
      variantId,
      quantity,
      price,
      storeId,
    });
  },

  updateItem: async (itemId, payload) => {
    const sessionId = getOrCreateSessionId();
    return requests.put(`/cart/${sessionId}/items/${itemId}`, payload);
  },

  deleteItem: async (itemId) => {
    const sessionId = getOrCreateSessionId();
    return requests.delete(`/cart/${sessionId}/items/${itemId}`);
  },
};

export default CartServices;
