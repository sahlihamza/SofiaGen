const mongoose = require("mongoose");

const Wishlist = require("../models/Wishlist");
const WishlistItem = require("../models/WishlistItem");
const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const GalleryProduct = require("../models/GalleryProduct");
const GeneralSettings = require("../models/GeneralSettings");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const ProductCategory = require("../models/ProductCategory");
const Attribute = require("../models/Attribute");
const AttributeValue = require("../models/AttributeValue");
const {
  productUnitPrice,
  variationUnitPrice,
  productStock,
  variationStock,
  isSaleRunning,
  round2,
} = require("./checkoutCartService");

// The wishlist, server-side. Every endpoint answers with the whole recomputed
// wishlist, so the storefront can replace its state with the response and never
// has to re-fetch.
//
// Prices come from the catalogue through the same helpers the cart and the
// checkout use (checkoutCartService), so what the wishlist displays is what the
// shopper would actually pay today. What each line *stored* when it was saved
// (priceSnapshot) is returned next to it, which is what lets the storefront
// flag a price drop.

class WishlistError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

// A wishlist line is a wish, not an order line: it is never checked against the
// stock. It still gets a ceiling, so a malformed client cannot store 1e9.
const MAX_QUANTITY = 999;

// Built fresh on each call: a shared literal would hand every caller the same
// `items` array to hold on to.
const emptySnapshot = (wishlist = null) => ({
  _id: wishlist?._id || null,
  storeId: wishlist ? String(wishlist.storeId) : null,
  items: [],
  itemCount: 0,
  totalQuantity: 0,
  subtotal: 0,
  currency: "",
  // The list the shopper is looking at, once the search and the filters have
  // been applied. Equal to itemCount when nothing is filtered.
  filteredCount: 0,
  page: 1,
  limit: 0,
  totalPages: 0,
  // What the filter controls can offer, read off the saved lines themselves so
  // the shopper is never shown a brand or a category that would return nothing.
  facets: { brands: [], categories: [] },
});

// --------------------------------------------------------------------------
// Owner
// --------------------------------------------------------------------------

/**
 * Who this wishlist belongs to. `customer` comes from the verified storefront
 * token (never from the request body): a client-supplied customerId would let
 * anyone read anyone else's wishlist. Guests are identified by the session id
 * their browser minted.
 */
const resolveOwner = ({ storeId, customer, sessionId }) => {
  if (!isObjectId(storeId)) {
    throw new WishlistError(400, "STORE_REQUIRED", "La boutique de la liste d'envies est manquante.");
  }

  const cleanSession =
    typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : null;

  if (customer?._id) {
    return {
      storeId: String(storeId),
      customerId: String(customer._id),
      sessionId: null,
      customer,
    };
  }

  if (!cleanSession) {
    throw new WishlistError(400, "OWNER_REQUIRED", "Impossible d'identifier votre liste d'envies.");
  }

  return {
    storeId: String(storeId),
    customerId: null,
    sessionId: cleanSession,
    customer: null,
  };
};

const ownerFilter = (owner) =>
  owner.customerId
    ? { storeId: owner.storeId, customerId: owner.customerId }
    : { storeId: owner.storeId, sessionId: owner.sessionId };

const findWishlist = (owner) => Wishlist.findOne(ownerFilter(owner));

const getOrCreateWishlist = async (owner) => {
  const existing = await findWishlist(owner);
  if (existing) return existing;

  try {
    return await Wishlist.create(ownerFilter(owner));
  } catch (error) {
    // Two tabs saving their first product at the same time race on the unique
    // index; the loser simply takes the wishlist the winner created.
    if (error.code === 11000) return findWishlist(owner);
    throw error;
  }
};

// The lines live in their own collection, so nothing about the wishlist
// document itself changes when one is added or removed. Stamped by hand here so
// `updatedAt` keeps meaning "last change to this list", lines included.
const touchWishlist = (wishlistId) =>
  Wishlist.updateOne({ _id: wishlistId }, { $currentDate: { updatedAt: true } });

// --------------------------------------------------------------------------
// Currency
// --------------------------------------------------------------------------

/**
 * Currency to stamp on a new line. Resolved exactly the way the checkout
 * snapshots it onto an order (checkoutService), so a wishlist snapshot and an
 * order total can be read in the same unit; the store's own currency is the
 * fallback when the general settings carry no currency yet.
 */
const resolveCurrency = async (storeId) => {
  const settings = await GeneralSettings.findOne({ storeId }).populate("currencyId");
  const fromSettings = settings?.currencyId?.name || settings?.currencyId?.symbol || "";

  if (fromSettings) return fromSettings;

  const store = await Store.findById(storeId);
  return store?.currency || "";
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

// Variation prices are Decimal128, product prices plain numbers.
const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * The two prices a saved line shows side by side: what the product normally
 * costs and what it costs today if a sale is running. `salePrice` is null
 * outside the sale window rather than the stored amount  a promotion that is
 * over must not keep being advertised on the list.
 */
const pricesOf = (regular, sale, saleStart, saleEnd, unitPrice) => {
  const onSale = isSaleRunning({ salePrice: sale, saleStart, saleEnd });

  return {
    regularPrice: round2(regular || 0),
    salePrice: onSale ? round2(sale) : null,
    onSale,
    unitPrice: round2(unitPrice),
  };
};

const productPricing = (product) =>
  pricesOf(
    toNumber(product.regularPrice),
    toNumber(product.salePrice),
    product.saleStart,
    product.saleEnd,
    productUnitPrice(product)
  );

const variationPricing = (variation) =>
  pricesOf(
    toNumber(variation.pricing?.regularPrice),
    toNumber(variation.pricing?.salePrice),
    variation.pricing?.saleStart,
    variation.pricing?.saleEnd,
    variationUnitPrice(variation)
  );

/**
 * Why a line cannot be bought today, or `in_stock` when it can.
 *
 * A product pulled from the catalogue is deleted from the list outright
 * (priceWishlist), so what is left here is the shopper-facing distinction: a
 * product the shop unpublished, a variation it disabled, and a product simply
 * out of stock are three different messages and only the last one is worth
 * waiting for.
 */
const availabilityOf = (product, variation, stock) => {
  if (!isPurchasable(product)) return "unavailable";
  if (variation && !variation.enabled) return "variation_unavailable";
  if (stock === 0) return "out_of_stock";

  return "in_stock";
};

// { attributeId, valueId } pairs turned into the labels the shopper picked 
// "Couleur: Rouge", "Taille: M". Unknown ids are dropped rather than rendered
// as raw object ids.
const describeAttributes = (variation, attributeById, valueById) =>
  (variation?.attributes || [])
    .map(({ attributeId, valueId }) => {
      const attribute = attributeById.get(String(attributeId));
      const value = valueById.get(String(valueId));

      if (!attribute || !value) return null;

      return {
        attributeId: String(attributeId),
        attributeName: attribute.name,
        valueId: String(valueId),
        // `label` is the one the catalogue requires and displays ("Rouge");
        // `value` next to it is an optional machine-side code and is blank on
        // most values. The slug is the last resort  an option with no label at
        // all would render as an empty button nobody can choose.
        valueLabel: value.label || value.value || value.slug || "",
      };
    })
    .filter(Boolean);

// --------------------------------------------------------------------------
// Search, filters, sort, pagination
// --------------------------------------------------------------------------

// Applied in memory, on the lines priceWishlist has just rebuilt, rather than
// pushed down into the query. A wishlist is a shopper-sized list, and the
// fields worth searching and sorting on  the price of the day, whether the
// product can still be bought  are not in the wishlist_items documents: they
// were just computed against the catalogue. Filtering in the database would
// mean either storing stale copies of them or reading everything back anyway.

const normalize = (value) => String(value || "").trim().toLowerCase();

const asNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

// A filter arrives either repeated (?brand=a&brand=b) or comma-joined.
const asList = (value) =>
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((entry) => String(entry).trim())
    .filter(Boolean);

// One search box over everything printed on the line, so "rouge" finds the red
// variation and "nike" the brand without the shopper picking a field first.
const matchesSearch = (item, term) => {
  if (!term) return true;

  return [
    item.title,
    item.sku,
    item.brand?.name,
    ...item.categories.map((category) => category.name),
    ...item.variationAttributes.map((attribute) => attribute.valueLabel),
  ].some((entry) => normalize(entry).includes(term));
};

const SORTS = {
  recent: (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
  oldest: (a, b) => new Date(a.addedAt) - new Date(b.addedAt),
  "name-asc": (a, b) => a.title.localeCompare(b.title),
  "name-desc": (a, b) => b.title.localeCompare(a.title),
  "price-asc": (a, b) => a.unitPrice - b.unitPrice,
  "price-desc": (a, b) => b.unitPrice - a.unitPrice,
  // What can be bought first: the rest is waiting on the shop, not the shopper.
  availability: (a, b) => Number(b.available) - Number(a.available),
};

const applyQuery = (items, query) => {
  const term = normalize(query.search);
  const brands = asList(query.brand);
  const categories = asList(query.category);
  const availability = asList(query.availability);
  const onSaleOnly = String(query.onSale) === "true";
  const priceMin = asNumber(query.priceMin);
  const priceMax = asNumber(query.priceMax);

  const filtered = items.filter((item) => {
    if (!matchesSearch(item, term)) return false;
    if (brands.length && !brands.includes(String(item.brand?._id))) return false;
    if (
      categories.length &&
      !item.categories.some((category) => categories.includes(category._id))
    ) {
      return false;
    }
    if (availability.length && !availability.includes(item.availability)) return false;
    if (onSaleOnly && !item.onSale) return false;
    if (priceMin !== null && item.unitPrice < priceMin) return false;
    if (priceMax !== null && item.unitPrice > priceMax) return false;

    return true;
  });

  filtered.sort(SORTS[query.sort] || SORTS.recent);

  // No limit asked for means the whole list  that is what every mutation
  // answers with, and what the storefront keeps in state.
  const limit = Math.max(0, Math.floor(asNumber(query.limit) || 0));
  const totalPages = limit ? Math.ceil(filtered.length / limit) : filtered.length ? 1 : 0;
  // A page past the end would show nothing at all; the last one is shown
  // instead, which is what a shopper deleting the last line of page 3 expects.
  const page = Math.min(Math.max(1, Math.floor(asNumber(query.page) || 1)), totalPages || 1);
  const paged = limit ? filtered.slice((page - 1) * limit, page * limit) : filtered;

  return { paged, filteredCount: filtered.length, page, limit, totalPages };
};

// Only the brands and categories actually saved, so the filter controls can
// never offer a choice that returns an empty list.
const buildFacets = (items) => {
  const brands = new Map();
  const categories = new Map();

  for (const item of items) {
    if (item.brand) brands.set(item.brand._id, item.brand);
    for (const category of item.categories) categories.set(category._id, category);
  }

  const byName = (a, b) => a.name.localeCompare(b.name);

  return {
    brands: [...brands.values()].sort(byName),
    categories: [...categories.values()].sort(byName),
  };
};

/**
 * Rebuilds the whole wishlist from what is stored, repricing every line.
 *
 * Lines whose product or variation no longer exists are deleted for good:
 * there is nothing left to show for them. Everything else is kept and merely
 * flagged  a product out of stock, unpublished or hidden stays in the list
 * with `available: false`, because waiting for exactly that to change is what a
 * shopper keeps a wishlist for. This is the opposite of the cart, which drops
 * what could not be ordered.
 *
 * `query` only narrows what `items` carries  the counters and the subtotal
 * always describe the whole list, since that is what the header badge shows.
 */
const priceWishlist = async (wishlist, query = {}) => {
  if (!wishlist) return emptySnapshot();

  const stored = await WishlistItem.find({ wishlistId: wishlist._id }).sort({ addedAt: -1 });

  if (!stored.length) return emptySnapshot(wishlist);

  const productIds = [...new Set(stored.map((item) => String(item.productId)))].filter(isObjectId);
  const savedVariationIds = [
    ...new Set(stored.map((item) => item.variationId).filter(Boolean).map(String)),
  ].filter(isObjectId);

  const [products, gallery] = await Promise.all([
    productIds.length ? Product.find({ _id: { $in: productIds } }) : [],
    productIds.length
      ? GalleryProduct.find({ product: { $in: productIds } }).sort({ isPrimary: -1, order: 1 })
      : [],
  ]);

  // Every variation of every saved variable product, not only the ones saved:
  // the list has to offer the whole choice so a variation can be picked or
  // changed before the line goes to the cart. The variations the lines point at
  // are loaded alongside, since one of them may since have been unlinked from
  // its product and would otherwise not come back at all.
  const variableProductIds = products
    .filter((product) => product.productType === "variable")
    .map((product) => String(product._id));

  const variations =
    variableProductIds.length || savedVariationIds.length
      ? await ProductVariation.find({
          $or: [
            ...(variableProductIds.length ? [{ productId: { $in: variableProductIds } }] : []),
            ...(savedVariationIds.length ? [{ _id: { $in: savedVariationIds } }] : []),
          ],
        })
      : [];

  const brandIds = [...new Set(products.map((p) => p.brand).filter(Boolean).map(String))];
  const categoryIds = [
    ...new Set(
      products
        .flatMap((p) => [p.productCategory, ...(p.productCategories || [])])
        .filter(Boolean)
        .map(String)
    ),
  ];
  const variationAttributes = variations.flatMap((v) => v.attributes || []);
  const attributeIds = [...new Set(variationAttributes.map((a) => String(a.attributeId)))];
  const valueIds = [...new Set(variationAttributes.map((a) => String(a.valueId)))];

  const [brands, categories, attributes, attributeValues] = await Promise.all([
    brandIds.length ? Brand.find({ _id: { $in: brandIds } }) : [],
    categoryIds.length ? ProductCategory.find({ _id: { $in: categoryIds } }) : [],
    attributeIds.length ? Attribute.find({ _id: { $in: attributeIds } }) : [],
    valueIds.length ? AttributeValue.find({ _id: { $in: valueIds } }) : [],
  ]);

  const productById = new Map(products.map((p) => [String(p._id), p]));
  const variationById = new Map(variations.map((v) => [String(v._id), v]));
  const brandById = new Map(brands.map((b) => [String(b._id), b]));
  const categoryById = new Map(categories.map((c) => [String(c._id), c]));
  const attributeById = new Map(attributes.map((a) => [String(a._id), a]));
  const valueById = new Map(attributeValues.map((v) => [String(v._id), v]));
  const imageByProduct = primaryImages(gallery);

  const variationsByProduct = new Map();
  for (const variation of variations) {
    const key = String(variation.productId);
    if (!variationsByProduct.has(key)) variationsByProduct.set(key, []);
    variationsByProduct.get(key).push(variation);
  }

  // One choice offered by the variation picker: what it is, what it costs and
  // whether it can be bought.
  const describeVariation = (variation) => {
    const stock = variationStock(variation);

    return {
      _id: String(variation._id),
      sku: variation.sku || "",
      image: variation.images?.[0] || null,
      attributes: describeAttributes(variation, attributeById, valueById),
      ...variationPricing(variation),
      availableStock: stock,
      available: Boolean(variation.enabled) && stock !== 0,
    };
  };

  const items = [];
  const staleIds = [];

  for (const line of stored) {
    const product = productById.get(String(line.productId));

    if (!product) {
      staleIds.push(line._id);
      continue;
    }

    const variation = line.variationId ? variationById.get(String(line.variationId)) : null;

    if (line.variationId && (!variation || String(variation.productId) !== String(product._id))) {
      staleIds.push(line._id);
      continue;
    }

    const stock = variation ? variationStock(variation) : productStock(product);
    const pricing = variation ? variationPricing(variation) : productPricing(product);
    const snapshot = line.priceSnapshot === null ? null : round2(line.priceSnapshot);
    const image = variation?.images?.[0] || imageByProduct.get(String(product._id)) || null;
    const availability = availabilityOf(product, variation, stock);
    const isVariable = product.productType === "variable";

    const productCategories = [
      ...new Set(
        [product.productCategory, ...(product.productCategories || [])]
          .filter(Boolean)
          .map(String)
      ),
    ]
      .map((id) => categoryById.get(id))
      .filter(Boolean)
      .map((category) => ({
        _id: String(category._id),
        name: category.name,
        slug: category.slug || "",
      }));

    const brand = product.brand ? brandById.get(String(product.brand)) : null;

    items.push({
      _id: line._id,
      productId: String(product._id),
      variationId: variation ? String(variation._id) : null,
      title: product.productName,
      // The catalogue has no product slug; the id is what the product page
      // resolves on, same as everywhere else in the storefront.
      slug: String(product._id),
      sku: variation?.sku || product.sku || "",
      image,
      brand: brand
        ? { _id: String(brand._id), name: brand.name, slug: brand.slug || "" }
        : null,
      categories: productCategories,
      quantity: line.quantity,
      // unitPrice is what the shopper would pay today; regularPrice and
      // salePrice are the two amounts the line prints side by side.
      ...pricing,
      totalPrice: round2(pricing.unitPrice * line.quantity),
      // What the line cost when it was saved, and how it compares now. Only
      // comparable when both are known and expressed in today's currency.
      priceSnapshot: snapshot,
      priceDifference: snapshot === null ? null : round2(pricing.unitPrice - snapshot),
      priceDropped: snapshot !== null && pricing.unitPrice < snapshot,
      currency: line.currency || "",
      // null means the stock is not tracked, i.e. no ceiling.
      availableStock: stock,
      // Out of stock counts as unavailable: the shopper cannot buy it today,
      // which is exactly what the badge on the line has to say. `availability`
      // carries the reason, so the badge can word it.
      available: availability === "in_stock",
      availability,
      productType: product.productType,
      isVariable,
      variationAttributes: describeAttributes(variation, attributeById, valueById),
      // The whole choice, so the line can be switched to another variation
      // before it goes to the cart. Empty for a simple product.
      variations: isVariable
        ? (variationsByProduct.get(String(product._id)) || []).map(describeVariation)
        : [],
      addedAt: line.addedAt,
    });
  }

  // Lines that no longer point at anything are cleaned out, so the shopper does
  // not have to see them disappear twice.
  if (staleIds.length) {
    await WishlistItem.deleteMany({ _id: { $in: staleIds } });
  }

  const { paged, filteredCount, page, limit, totalPages } = applyQuery(items, query);

  return {
    _id: wishlist._id,
    storeId: String(wishlist.storeId),
    items: paged,
    // itemCount is how many lines the list holds (what the header badge shows),
    // totalQuantity the sum of the quantities asked for across them. Both count
    // the whole list, never just the page on screen.
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    // What the list would cost today, counting only what can be bought.
    subtotal: round2(
      items.reduce((sum, item) => (item.available ? sum + item.totalPrice : sum), 0)
    ),
    currency: items.find((item) => item.currency)?.currency || "",
    filteredCount,
    page,
    limit,
    totalPages,
    facets: buildFacets(items),
  };
};

// --------------------------------------------------------------------------
// Reads
// --------------------------------------------------------------------------

// `query` carries the search, the filters, the sort and the page the shopper is
// on. Absent  every mutation, and the load the header badge relies on  the
// whole list comes back.
const getCurrentWishlist = async (owner, query = {}) =>
  priceWishlist(await findWishlist(owner), query);

// --------------------------------------------------------------------------
// Item mutations
// --------------------------------------------------------------------------

// An absent quantity is not a quantity of 0: `Number("")` is 0, and letting
// that through would turn a blank input into "remove this line".
const omitted = (quantity) => quantity === undefined || quantity === null || quantity === "";

const asQuantity = (quantity) => (omitted(quantity) ? NaN : Math.floor(Number(quantity)));

const cleanQuantity = (quantity) => {
  const wanted = asQuantity(quantity);

  if (!Number.isFinite(wanted) || wanted < 1 || wanted > MAX_QUANTITY) {
    throw new WishlistError(400, "INVALID_QUANTITY", "La quantité demandé est invalide.");
  }

  return wanted;
};

// A product can only be saved from the storefront, which never offers anything
// but a published one  so an unpublished product is refused here, while a line
// already saved survives the product being unpublished later (priceWishlist).
const assertSavable = async ({ productId, variationId }) => {
  if (!isObjectId(productId)) {
    throw new WishlistError(400, "PRODUCT_REQUIRED", "Le produit demandé est invalide.");
  }

  const product = await Product.findById(productId);

  if (!product || !isPurchasable(product)) {
    throw new WishlistError(404, "PRODUCT_NOT_FOUND", "Ce produit n'est plus disponible.");
  }

  let variation = null;

  if (variationId) {
    if (!isObjectId(variationId)) {
      throw new WishlistError(400, "VARIATION_NOT_FOUND", "La déclinaison choisie est invalide.");
    }

    variation = await ProductVariation.findById(variationId);

    if (!variation || String(variation.productId) !== String(product._id)) {
      throw new WishlistError(
        404,
        "VARIATION_NOT_FOUND",
        `La déclinaison choisie pour  ${product.productName}  n'existe plus.`
      );
    }
  }

  return { product, variation };
};

/**
 * Saves a product  or one precise variation of it  to the wishlist.
 *
 * Saving what is already saved does not stack: the heart clicked twice must not
 * leave a quantity of 2. The line is only touched when the caller asked for a
 * precise quantity, and then it is *set* to it, not incremented. `priceSnapshot`
 * and `addedAt` of an existing line are left alone  they record when the
 * shopper first saved it, and rewriting them would erase the price drop the
 * list exists to show.
 */
const addItem = async (owner, { productId, variationId = null, quantity }) => {
  // No quantity means "just save it"; anything else is an explicit quantity and
  // is validated as one.
  const wanted = omitted(quantity) ? null : cleanQuantity(quantity);

  const { product, variation } = await assertSavable({ productId, variationId });

  const wishlist = await getOrCreateWishlist(owner);
  const lineFilter = {
    wishlistId: wishlist._id,
    productId: product._id,
    variationId: variation ? variation._id : null,
  };

  const existing = await WishlistItem.findOne(lineFilter);

  if (existing) {
    if (wanted !== null && wanted !== existing.quantity) {
      existing.quantity = wanted;
      await existing.save();
      await touchWishlist(wishlist._id);
    }

    return priceWishlist(wishlist);
  }

  const unitPrice = round2(variation ? variationUnitPrice(variation) : productUnitPrice(product));

  try {
    await WishlistItem.create({
      ...lineFilter,
      storeId: wishlist.storeId,
      quantity: wanted === null ? 1 : wanted,
      addedAt: new Date(),
      // A catalogue with no usable price stores none, rather than a false 0
      // that would later read as a price rise.
      priceSnapshot: unitPrice > 0 ? unitPrice : null,
      currency: await resolveCurrency(wishlist.storeId),
    });
  } catch (error) {
    // Two tabs saving the same product at once race on the unique line index;
    // the loser keeps the line the winner wrote, which holds the same product.
    if (error.code !== 11000) throw error;
  }

  await touchWishlist(wishlist._id);

  return priceWishlist(wishlist);
};

/**
 * Sets a line to an exact quantity. 0 removes it  that is the "minus" button
 * reaching zero, same as in the cart.
 */
const updateItemQuantity = async (owner, itemId, quantity) => {
  // Validated before the lookup, so a bad quantity never reports as a missing
  // item. Only an explicit 0 is the documented "remove", and it skips the range
  // check; a blank quantity is rejected instead of emptying the line.
  const removing = asQuantity(quantity) === 0;
  const wanted = removing ? 0 : cleanQuantity(quantity);

  const wishlist = await findWishlist(owner);

  if (!wishlist) {
    throw new WishlistError(404, "WISHLIST_NOT_FOUND", "Votre liste d'envies est introuvable.");
  }

  if (!isObjectId(itemId)) {
    throw new WishlistError(404, "ITEM_NOT_FOUND", "Cet article n'est plus dans votre liste d'envies.");
  }

  // Always scoped to the owner's own wishlist: looked up by _id alone, an item
  // id guessed by anyone would reach into someone else's list.
  const item = await WishlistItem.findOne({ _id: itemId, wishlistId: wishlist._id });

  if (!item) {
    throw new WishlistError(404, "ITEM_NOT_FOUND", "Cet article n'est plus dans votre liste d'envies.");
  }

  if (removing) {
    await item.deleteOne();
  } else {
    item.quantity = wanted;
    await item.save();
  }

  await touchWishlist(wishlist._id);

  return priceWishlist(wishlist);
};

const removeItem = async (owner, itemId) => {
  const wishlist = await findWishlist(owner);

  if (!wishlist) {
    throw new WishlistError(404, "WISHLIST_NOT_FOUND", "Votre liste d'envies est introuvable.");
  }

  if (!isObjectId(itemId)) {
    throw new WishlistError(404, "ITEM_NOT_FOUND", "Cet article n'est plus dans votre liste d'envies.");
  }

  const { deletedCount } = await WishlistItem.deleteOne({
    _id: itemId,
    wishlistId: wishlist._id,
  });

  if (!deletedCount) {
    throw new WishlistError(404, "ITEM_NOT_FOUND", "Cet article n'est plus dans votre liste d'envies.");
  }

  await touchWishlist(wishlist._id);

  return priceWishlist(wishlist);
};

// Emptying a wishlist that does not exist is not an error: the shopper wanted an
// empty list and that is what they get.
const clearWishlist = async (owner) => {
  const wishlist = await findWishlist(owner);

  if (!wishlist) return emptySnapshot();

  await WishlistItem.deleteMany({ wishlistId: wishlist._id });
  await touchWishlist(wishlist._id);

  return priceWishlist(wishlist);
};

// --------------------------------------------------------------------------
// Merge
// --------------------------------------------------------------------------

/**
 * Folds the guest wishlist of this browser into the customer's own, once, right
 * after a login. A product saved on both sides keeps the customer's line  and
 * with it the earlier of the two prices they were shown; the guest wishlist is
 * then deleted so it can never be merged twice.
 *
 * With no guest wishlist to fold in, this is just a read of the customer's own,
 * which is what the storefront relies on to load a wishlist after a login.
 */
const mergeWishlists = async ({ storeId, sessionId, customer }) => {
  const owner = resolveOwner({ storeId, customer, sessionId });

  if (!owner.customerId) {
    // No usable token: nothing to merge into, hand back the guest wishlist.
    return getCurrentWishlist(owner);
  }

  const guestSession =
    typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : null;
  const guestWishlist = guestSession
    ? await Wishlist.findOne({ storeId: owner.storeId, sessionId: guestSession })
    : null;

  if (!guestWishlist) return getCurrentWishlist(owner);

  const guestItems = await WishlistItem.find({ wishlistId: guestWishlist._id });
  const wishlist = guestItems.length
    ? await getOrCreateWishlist(owner)
    : await findWishlist(owner);

  for (const guestItem of guestItems) {
    // Moved line by line rather than in one updateMany: the unique index would
    // reject the whole batch over a single product saved on both sides.
    await WishlistItem.updateOne(
      {
        wishlistId: wishlist._id,
        productId: guestItem.productId,
        variationId: guestItem.variationId || null,
      },
      {
        $setOnInsert: {
          wishlistId: wishlist._id,
          storeId: wishlist.storeId,
          productId: guestItem.productId,
          variationId: guestItem.variationId || null,
          quantity: guestItem.quantity,
          addedAt: guestItem.addedAt,
          priceSnapshot: guestItem.priceSnapshot,
          currency: guestItem.currency,
        },
      },
      { upsert: true }
    );
  }

  await WishlistItem.deleteMany({ wishlistId: guestWishlist._id });
  await guestWishlist.deleteOne();

  if (guestItems.length) await touchWishlist(wishlist._id);

  return priceWishlist(wishlist);
};

module.exports = {
  WishlistError,
  resolveOwner,
  getCurrentWishlist,
  addItem,
  updateItemQuantity,
  removeItem,
  clearWishlist,
  mergeWishlists,
};
