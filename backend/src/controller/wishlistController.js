const wishlistService = require("../service/wishlistService");
const logger = require("../config/logger");

// Every endpoint answers with the whole recomputed wishlist, so the storefront
// can replace its state with the response and never has to re-fetch.
//
// The owner travels in the query string on GET and DELETE  a DELETE body is
// not reliably forwarded  and in the body otherwise. The customer half of it
// is taken from the verified token only, never from what the client sent.

const ownerFromRequest = (req) => {
  const source = req.method === "GET" || req.method === "DELETE" ? req.query : req.body;

  // SO-09 (same fix as cartController): a logged-in customer's storeId comes
  // from their own account, never from the request  otherwise a customer of
  // store A could pass storeId=B and read/manipulate a wishlist under store
  // B's namespace. Guests have no verified identity to derive it from.
  const storeId = req.customer ? req.customer.storeId : source?.storeId;

  return wishlistService.resolveOwner({
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
    if (error instanceof wishlistService.WishlistError) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    logger.error(
      `Erreur liste d'envies (${req.method} ${req.originalUrl}): ${error.message}`
    );

    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

// The search, the filters, the sort and the page ride along in the query
// string next to the owner. They are handed over as they came: the service
// reads the keys it knows and ignores the rest, the owner ones included.
const getCurrentWishlist = handle((req) =>
  wishlistService.getCurrentWishlist(ownerFromRequest(req), req.query)
);

const addItem = handle((req) =>
  wishlistService.addItem(ownerFromRequest(req), {
    productId: req.body?.productId,
    variationId: req.body?.variationId || null,
    // Left as sent: the service tells an absent quantity (save it as it is)
    // from an explicit one (set the line to it).
    quantity: req.body?.quantity,
  })
);

const updateItemQuantity = handle((req) =>
  wishlistService.updateItemQuantity(
    ownerFromRequest(req),
    req.params.itemId,
    req.body?.quantity
  )
);

const removeItem = handle((req) =>
  wishlistService.removeItem(ownerFromRequest(req), req.params.itemId)
);

const clearWishlist = handle((req) =>
  wishlistService.clearWishlist(ownerFromRequest(req))
);

// Called once after a login. Resolves its own owner: the guest session it
// merges from is exactly the half resolveOwner drops for a logged-in shopper.
const mergeWishlist = handle((req) =>
  wishlistService.mergeWishlists({
    storeId: req.customer ? req.customer.storeId : req.body?.storeId,
    sessionId: req.body?.sessionId,
    customer: req.customer,
  })
);

module.exports = {
  getCurrentWishlist,
  addItem,
  updateItemQuantity,
  removeItem,
  clearWishlist,
  mergeWishlist,
};
