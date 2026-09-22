const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const ProductTagRelation = require("../models/ProductTagRelation");
const GalleryProduct = require("../models/GalleryProduct");
const couponValidationService = require("./couponValidationService");
const couponCalculationService = require("./couponCalculationService");
const {
  productUnitPrice,
  variationUnitPrice,
  productStock,
  variationStock,
  round2,
} = require("./checkoutCartService");

// The shopping cart, server-side. Every endpoint answers with the whole
// recomputed cart so the storefront never sums anything itself.
//
// Prices and stock are always read back from the catalogue through the same
// helpers the checkout uses (checkoutCartService), which is what guarantees
// the amounts shown in the cart are the ones the checkout will charge.

class CartError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const EMPTY_TOTALS = {
  items: [],
  coupons: [],
  totalItems: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  total: 0,
};

// --------------------------------------------------------------------------
// Owner
// --------------------------------------------------------------------------

/**
 * Who this cart belongs to. `customer` comes from the verified storefront
 * token (never from the request body): a client-supplied customerId would let
 * anyone read anyone else's cart. Guests are identified by the session id
 * their browser minted.
 */
const resolveOwner = ({ storeId, customer, sessionId }) => {
  if (!isObjectId(storeId)) {
    throw new CartError(400, "STORE_REQUIRED", "La boutique du panier est manquante.");
  }

  const cleanSession = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : null;

  if (customer?._id) {
    return { storeId: String(storeId), customerId: String(customer._id), sessionId: null, customer };
  }

  if (!cleanSession) {
    throw new CartError(400, "OWNER_REQUIRED", "Impossible d'identifier votre panier.");
  }

  return { storeId: String(storeId), customerId: null, sessionId: cleanSession, customer: null };
};

const ownerFilter = (owner) =>
  owner.customerId
    ? { storeId: owner.storeId, customerId: owner.customerId }
    : { storeId: owner.storeId, sessionId: owner.sessionId };

const findCart = (owner) => Cart.findOne(ownerFilter(owner));

const getOrCreateCart = async (owner) => {
  const existing = await findCart(owner);
  if (existing) return existing;

  try {
    return await Cart.create({ ...ownerFilter(owner), items: [], coupons: [] });
  } catch (error) {
    // Two tabs adding their first item at the same time race on the unique
    // index; the loser simply takes the cart the winner created.
    if (error.code === 11000) return findCart(owner);
    throw error;
  }
};

// --------------------------------------------------------------------------
// Snapshot
// --------------------------------------------------------------------------

const primaryImages = (galleryDocs) => {
  const byProduct = new Map();

  // Sorted primary-first then by order, so the first one seen per product wins.
  for (const doc of galleryDocs) {
    const key = String(doc.product);
    if (!byProduct.has(key)) byProduct.set(key, doc.image);
  }

  return byProduct;
};

const isPurchasable = (product) =>
  product.status === "published" && product.visibility === "public";

// How many units of this line the shopper may hold. null = no ceiling.
const lineMaxQuantity = (product, stock) => {
  if (product.soldIndividually) return 1;
  return stock;
};

/**
 * Rebuilds the full cart from what is stored, repricing every line.
 *
 * Lines whose product or variation no longer exists  or is no longer on sale
 *  are dropped from the cart for good: they could never be ordered. Lines
 * that are merely out of stock are kept, with availableStock at 0, so the
 * shopper can see them and wait for a restock.
 */
const priceCart = async (cart) => {
  if (!cart) {
    return { snapshot: { _id: null, ...EMPTY_TOTALS }, couponItems: [], appliedCoupons: [] };
  }

  const productIds = [...new Set(cart.items.map((i) => String(i.productId)))].filter(isObjectId);
  const variationIds = [
    ...new Set(cart.items.map((i) => i.variationId).filter(Boolean).map(String)),
  ].filter(isObjectId);

  const [products, variations, gallery, tagRelations] = await Promise.all([
    productIds.length ? Product.find({ _id: { $in: productIds } }) : [],
    variationIds.length ? ProductVariation.find({ _id: { $in: variationIds } }) : [],
    productIds.length
      ? GalleryProduct.find({ product: { $in: productIds } }).sort({ isPrimary: -1, order: 1 })
      : [],
    productIds.length ? ProductTagRelation.find({ productId: { $in: productIds } }) : [],
  ]);

  const productById = new Map(products.map((p) => [String(p._id), p]));
  const variationById = new Map(variations.map((v) => [String(v._id), v]));
  const imageByProduct = primaryImages(gallery);
  const tagsByProduct = tagRelations.reduce((acc, relation) => {
    const key = String(relation.productId);
    acc.set(key, [...(acc.get(key) || []), String(relation.tagId)]);
    return acc;
  }, new Map());

  const items = [];
  const keptDocs = [];
  // Same shape the coupon engine documents for its `cartItems` context.
  const couponItems = [];

  for (const stored of cart.items) {
    const product = productById.get(String(stored.productId));
    if (!product || !isPurchasable(product)) continue;

    const variation = stored.variationId ? variationById.get(String(stored.variationId)) : null;
    if (stored.variationId && (!variation || String(variation.productId) !== String(product._id))) {
      continue;
    }

    const stock = variation ? variationStock(variation) : productStock(product);
    const unitPrice = round2(variation ? variationUnitPrice(variation) : productUnitPrice(product));
    const image = variation?.images?.[0] || imageByProduct.get(String(product._id)) || null;

    keptDocs.push(stored);

    items.push({
      _id: stored._id,
      productId: String(product._id),
      variationId: variation ? String(variation._id) : null,
      title: product.productName,
      sku: variation?.sku || product.sku || "",
      image,
      unitPrice,
      quantity: stored.quantity,
      totalPrice: round2(unitPrice * stored.quantity),
      // null means the stock is not tracked, i.e. no ceiling.
      availableStock: stock,
      maxQuantity: lineMaxQuantity(product, stock),
    });

    couponItems.push({
      productId: String(product._id),
      categoryId: product.productCategory ? String(product.productCategory) : null,
      brandId: product.brand ? String(product.brand) : null,
      tagIds: tagsByProduct.get(String(product._id)) || [],
      quantity: stored.quantity,
      price: unitPrice,
    });
  }

  const subtotal = round2(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const { coupons, discount, freeShipping, droppedCoupons, appliedCoupons } = await priceCoupons(
    cart,
    { couponItems, subtotal }
  );

  // Lines and coupons that no longer hold are cleaned out of the stored cart,
  // so the shopper does not have to see them disappear twice.
  if (keptDocs.length !== cart.items.length || droppedCoupons.length) {
    cart.items = keptDocs;
    cart.coupons = cart.coupons.filter(
      (c) => !droppedCoupons.some((dropped) => String(dropped) === String(c.couponId))
    );
    await cart.save();
  }

  // No tax engine exists in this project yet (same TODO as
  // couponCalculationService), and shipping is only known once a delivery
  // method is picked at checkout  both stay at 0 here on purpose.
  const tax = 0;
  const shipping = 0;

  return {
    snapshot: {
      _id: cart._id,
      items,
      coupons,
      totalItems,
      subtotal,
      discount,
      tax,
      shipping,
      freeShipping,
      total: round2(Math.max(0, subtotal - discount + tax + shipping)),
    },
    // Kept for whoever has to judge one more coupon against this cart:
    // validateCoupon reads `stackable` off the applied Coupon documents, so
    // the formatted ones in the snapshot would not do.
    couponItems,
    appliedCoupons,
  };
};

const buildSnapshot = async (cart) => (await priceCart(cart)).snapshot;

/**
 * Revalidates every coupon held by the cart and adds up what they take off.
 *
 * A coupon that no longer applies  the cart fell under its minimum, its
 * products left the cart, it expired  is dropped rather than kept at zero,
 * which is the behaviour shoppers know from other shops. Geo restrictions
 * cannot be judged here (the cart has no address yet); those coupons are
 * settled at checkout.
 */
const priceCoupons = async (cart, { couponItems, subtotal }) => {
  const coupons = [];
  const droppedCoupons = [];
  const appliedCoupons = [];
  let discount = 0;
  let freeShipping = false;

  for (const stored of cart.coupons) {
    const context = {
      storeId: cart.storeId,
      customerId: cart.customerId || undefined,
      isGuest: !cart.customerId,
      cartItems: couponItems,
      cartSubtotal: subtotal,
      appliedCoupons,
    };

    const validation = await couponValidationService.validateCoupon(stored.code, context);

    if (!validation.valid) {
      droppedCoupons.push(stored.couponId);
      continue;
    }

    const calculation = await couponCalculationService.calculateDiscount(
      validation.coupon,
      couponItems,
      subtotal
    );

    appliedCoupons.push(validation.coupon);
    discount = round2(discount + calculation.discount);
    // null from the calculator means "waive the shipping fee", computed by
    // whoever knows the fee  the checkout.
    if (calculation.shippingDiscount === null) freeShipping = true;

    coupons.push({
      _id: validation.coupon._id,
      couponId: validation.coupon._id,
      code: validation.coupon.code,
      discountAmount: calculation.discount,
      freeShipping: calculation.shippingDiscount === null,
    });
  }

  return {
    coupons,
    discount: round2(Math.min(discount, subtotal)),
    freeShipping,
    droppedCoupons,
    appliedCoupons,
  };
};

// --------------------------------------------------------------------------
// Reads
// --------------------------------------------------------------------------

const getCurrentCart = async (owner) => buildSnapshot(await findCart(owner));

// --------------------------------------------------------------------------
// Item mutations
// --------------------------------------------------------------------------

// Checks a wanted quantity against the catalogue before it is stored, so the
// cart can never hold more than could be ordered.
const assertQuantityAllowed = async ({ productId, variationId, quantity }) => {
  if (!isObjectId(productId)) {
    throw new CartError(400, "PRODUCT_REQUIRED", "Le produit demandé est invalide.");
  }

  const product = await Product.findById(productId);

  if (!product || !isPurchasable(product)) {
    throw new CartError(404, "PRODUCT_NOT_FOUND", "Ce produit n'est plus disponible  la vente.");
  }

  let variation = null;

  if (variationId) {
    if (!isObjectId(variationId)) {
      throw new CartError(400, "VARIATION_NOT_FOUND", "La déclinaison choisie est invalide.");
    }

    variation = await ProductVariation.findById(variationId);

    if (!variation || String(variation.productId) !== String(product._id)) {
      throw new CartError(
        404,
        "VARIATION_NOT_FOUND",
        `La déclinaison choisie pour  ${product.productName}  n'existe plus.`
      );
    }
  }

  if (product.soldIndividually && quantity > 1) {
    throw new CartError(
      400,
      "SOLD_INDIVIDUALLY",
      ` ${product.productName}  ne peut être commandé qu'en un seul exemplaire.`
    );
  }

  const stock = variation ? variationStock(variation) : productStock(product);

  if (stock !== null && stock < quantity) {
    throw new CartError(
      400,
      stock === 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
      stock === 0
        ? ` ${product.productName}  est en rupture de stock.`
        : `Il ne reste que ${stock} unité(s) de  ${product.productName} .`
    );
  }

  return { product, variation };
};

const sameLine = (item, productId, variationId) =>
  String(item.productId) === String(productId) &&
  String(item.variationId || "") === String(variationId || "");

/**
 * Adds a product  or one precise variation of it  to the cart. Adding what
 * is already there raises that line instead of opening a second one, and the
 * total quantity is what gets checked against the stock.
 */
const addItem = async (owner, { productId, variationId = null, quantity = 1 }) => {
  const wanted = Math.floor(Number(quantity) || 0);

  if (wanted < 1) {
    throw new CartError(400, "INVALID_QUANTITY", "La quantité demandé est invalide.");
  }

  const cart = await getOrCreateCart(owner);
  const existing = cart.items.find((item) => sameLine(item, productId, variationId));
  const total = (existing?.quantity || 0) + wanted;

  await assertQuantityAllowed({ productId, variationId, quantity: total });

  if (existing) {
    existing.quantity = total;
  } else {
    cart.items.push({ productId, variationId: variationId || null, quantity: wanted });
  }

  await cart.save();

  return buildSnapshot(cart);
};

// Sets a line to an exact quantity. 0 removes it  that is the "minus" button
// reaching zero.
const updateItemQuantity = async (owner, itemId, quantity) => {
  const wanted = Math.floor(Number(quantity));

  if (!Number.isFinite(wanted) || wanted < 0) {
    throw new CartError(400, "INVALID_QUANTITY", "La quantité demandé est invalide.");
  }

  const cart = await findCart(owner);

  if (!cart) throw new CartError(404, "CART_NOT_FOUND", "Votre panier est introuvable.");

  const item = cart.items.id(itemId);

  if (!item) throw new CartError(404, "ITEM_NOT_FOUND", "Cet article n'est plus dans votre panier.");

  if (wanted === 0) {
    item.remove();
  } else {
    await assertQuantityAllowed({
      productId: item.productId,
      variationId: item.variationId,
      quantity: wanted,
    });
    item.quantity = wanted;
  }

  await cart.save();

  return buildSnapshot(cart);
};

const removeItem = async (owner, itemId) => {
  const cart = await findCart(owner);

  if (!cart) throw new CartError(404, "CART_NOT_FOUND", "Votre panier est introuvable.");

  const item = cart.items.id(itemId);

  if (!item) throw new CartError(404, "ITEM_NOT_FOUND", "Cet article n'est plus dans votre panier.");

  item.remove();
  await cart.save();

  return buildSnapshot(cart);
};

// Emptying a cart that does not exist is not an error: the shopper wanted an
// empty cart and that is what they get.
const clearCart = async (owner) => {
  const cart = await findCart(owner);

  if (!cart) return buildSnapshot(null);

  cart.items = [];
  cart.coupons = [];
  await cart.save();

  return buildSnapshot(cart);
};

// --------------------------------------------------------------------------
// Coupons
// --------------------------------------------------------------------------

const applyCoupon = async (owner, code) => {
  const clean = String(code || "").trim();

  if (!clean) throw new CartError(400, "COUPON_REQUIRED", "Saisissez un code promo.");

  const cart = await getOrCreateCart(owner);

  if (!cart.items.length) {
    throw new CartError(400, "CART_EMPTY", "Votre panier est vide.");
  }

  if (cart.coupons.some((c) => c.code.toUpperCase() === clean.toUpperCase())) {
    throw new CartError(400, "COUPON_ALREADY_APPLIED", "Ce code promo est déjà appliqué.");
  }

  // Priced first, so the coupon is judged against the cart as it stands 
  // subtotal, quantities and products all matter to the rules.
  const { snapshot, couponItems, appliedCoupons } = await priceCart(cart);

  const validation = await couponValidationService.validateCoupon(clean, {
    storeId: cart.storeId,
    customerId: cart.customerId || undefined,
    isGuest: !cart.customerId,
    cartItems: couponItems,
    cartSubtotal: snapshot.subtotal,
    appliedCoupons,
  });

  if (!validation.valid) {
    throw new CartError(400, validation.code, validation.message);
  }

  cart.coupons.push({ couponId: validation.coupon._id, code: validation.coupon.code });
  await cart.save();

  return buildSnapshot(cart);
};

const removeCoupon = async (owner, couponId) => {
  const cart = await findCart(owner);

  if (!cart) throw new CartError(404, "CART_NOT_FOUND", "Votre panier est introuvable.");

  const before = cart.coupons.length;
  cart.coupons = cart.coupons.filter((c) => String(c.couponId) !== String(couponId));

  if (cart.coupons.length === before) {
    throw new CartError(404, "COUPON_NOT_FOUND", "Ce code promo n'est pas appliqué à votre panier.");
  }

  await cart.save();

  return buildSnapshot(cart);
};

// --------------------------------------------------------------------------
// Merge
// --------------------------------------------------------------------------

/**
 * Folds the guest cart of this browser into the customer's own cart, once,
 * right after a login. Quantities add up on lines both carts hold, capped by
 * whatever the catalogue still allows; the guest cart is then deleted so it
 * can never be merged twice.
 *
 * With no guest cart to fold in, this is just a read of the customer's cart 
 * which is what the storefront relies on to load a cart after a login.
 */
const mergeCarts = async ({ storeId, customerId, sessionId, customer }) => {
  const owner = resolveOwner({ storeId, customer, sessionId });

  if (!owner.customerId) {
    // No usable token: nothing to merge into, hand back the guest cart.
    return getCurrentCart(owner);
  }

  const guestSession = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : null;
  const guestCart = guestSession
    ? await Cart.findOne({ storeId: owner.storeId, sessionId: guestSession })
    : null;

  if (!guestCart || !guestCart.items.length) {
    if (guestCart) await guestCart.deleteOne();
    return getCurrentCart(owner);
  }

  const cart = await getOrCreateCart(owner);

  for (const guestItem of guestCart.items) {
    const existing = cart.items.find((item) =>
      sameLine(item, guestItem.productId, guestItem.variationId)
    );
    const wanted = (existing?.quantity || 0) + guestItem.quantity;

    let allowed = wanted;

    try {
      await assertQuantityAllowed({
        productId: guestItem.productId,
        variationId: guestItem.variationId,
        quantity: wanted,
      });
    } catch (error) {
      // A merge must never fail as a whole: a line the catalogue no longer
      // allows in full is capped, and dropped when nothing can be kept.
      allowed = await largestAllowedQuantity(guestItem, wanted);
      if (allowed < 1) continue;
    }

    if (existing) {
      existing.quantity = allowed;
    } else {
      cart.items.push({
        productId: guestItem.productId,
        variationId: guestItem.variationId || null,
        quantity: allowed,
      });
    }
  }

  // Coupons the guest had are carried over; buildSnapshot drops any that no
  // longer hold for the merged cart.
  for (const coupon of guestCart.coupons) {
    if (!cart.coupons.some((c) => String(c.couponId) === String(coupon.couponId))) {
      cart.coupons.push({ couponId: coupon.couponId, code: coupon.code });
    }
  }

  await cart.save();
  await guestCart.deleteOne();

  return buildSnapshot(cart);
};

// What is left of a wanted quantity once the catalogue has its say. Used only
// by the merge, where refusing the whole operation would lose the cart.
const largestAllowedQuantity = async (item, wanted) => {
  const product = await Product.findById(item.productId);

  if (!product || !isPurchasable(product)) return 0;
  if (product.soldIndividually) return 1;

  const variation = item.variationId ? await ProductVariation.findById(item.variationId) : null;

  if (item.variationId && !variation) return 0;

  const stock = variation ? variationStock(variation) : productStock(product);

  return stock === null ? wanted : Math.min(wanted, stock);
};

module.exports = {
  CartError,
  resolveOwner,
  getCurrentCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeCarts,
};
