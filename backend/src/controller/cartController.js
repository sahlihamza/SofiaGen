const cartService = require("../service/cartService");
const logger = require("../config/logger");

// Every endpoint answers with the whole recomputed cart, so the storefront can
// replace its state with the response and never has to re-fetch.
//
// The owner travels in the query string on GET and DELETE  a DELETE body is
// not reliably forwarded  and in the body otherwise. The customer half of it
// is taken from the verified token only, never from what the client sent.

const ownerFromRequest = (req) => {
  const source = req.method === "GET" || req.method === "DELETE" ? req.query : req.body;

  // SO-09: a logged-in customer's storeId comes from their own account, never
  // from whatever the client sent  otherwise a customer of store A could
  // pass storeId=B and manipulate a cart, and store B's coupons, under store
  // B's namespace. Guests have no verified identity to derive it from, so
  // their storeId still comes from the request (the storefront sets it from
  // its own domain/subdomain, same as everywhere else unauthenticated).
  const storeId = req.customer ? req.customer.storeId : source?.storeId;

  return cartService.resolveOwner({
    storeId,
    sessionId: source?.sessionId,
    customer: req.customer,
  });
};

// A rule the shopper broke comes back with its code and a message they can
// read; anything else is ours and stays generic.
const handle = (action) => async (req, res) => {
  try {
    return res.json(await action(req));
  } catch (error) {
    if (error instanceof cartService.CartError) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    logger.error(`Erreur panier (${req.method} ${req.originalUrl}): ${error.message}`);

    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

const getCurrentCart = handle((req) => cartService.getCurrentCart(ownerFromRequest(req)));

const addItem = handle((req) =>
  cartService.addItem(ownerFromRequest(req), {
    productId: req.body?.productId,
    variationId: req.body?.variationId || null,
    quantity: req.body?.quantity,
  })
);

const updateItemQuantity = handle((req) =>
  cartService.updateItemQuantity(ownerFromRequest(req), req.params.itemId, req.body?.quantity)
);

const removeItem = handle((req) =>
  cartService.removeItem(ownerFromRequest(req), req.params.itemId)
);

const clearCart = handle((req) => cartService.clearCart(ownerFromRequest(req)));

const applyCoupon = handle((req) =>
  cartService.applyCoupon(ownerFromRequest(req), req.body?.code)
);

const removeCoupon = handle((req) =>
  cartService.removeCoupon(ownerFromRequest(req), req.params.couponId)
);

// Called once after a login. Resolves its own owner: the guest session it
// merges from is exactly the half resolveOwner drops for a logged-in shopper.
const mergeCart = handle((req) =>
  cartService.mergeCarts({
    // SO-09: same rule as ownerFromRequest  trust the account's own store,
    // not the body, once a customer is verified.
    storeId: req.customer ? req.customer.storeId : req.body?.storeId,
    sessionId: req.body?.sessionId,
    customer: req.customer,
  })
);

module.exports = {
  getCurrentCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeCart,
};
