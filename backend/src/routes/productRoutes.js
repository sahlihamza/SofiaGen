const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { isAuth, loadUser, resolveAuthorizationContext } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const resolveStorefrontStore = require("../middleware/resolveStorefrontStore");
const router = express.Router();
const publicCatalogLimiter = createRateLimiter({ max: 300, windowMinutes: 5, keyBy: "ip+store" });
const {
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProducts,
  getProductById,
  getProductsByIds,
  getRelatedProducts,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  searchProducts,
  getShowingStoreProducts,
} = require("../controller/productController");

//add a product
router.post("/add", isAuth, loadUser, resolveAuthorizationContext, addProduct);

//import products from a file (upsert by SKU, never deletes)
router.post("/import", isAuth, loadUser, resolveAuthorizationContext, addAllProducts);

//legacy alias for the import endpoint
router.post("/all", isAuth, loadUser, resolveAuthorizationContext, addAllProducts);

//get a product (admin edit-page fallback  see admin ProductServices.getProductById)
router.post("/:id", isAuth, loadUser, resolveAuthorizationContext, getProductById);

// --- Public storefront browsing  no login, an anonymous shopper calls these ---

// SO-19: resolveStorefrontStore sets req.currentStoreId from the request's
// own domain  a real per-tenant default instead of the ?storeId= query
// param stopgap these routes previously depended on entirely. An explicit
// ?storeId= (the admin preview flow, e.g.) still wins in the controller's
// own fallback order  this only fills in when the caller didn't pass one.

//get showing products only
router.get("/show", publicCatalogLimiter, resolveStorefrontStore, getShowingProducts);

//get showing products in store
router.get("/store", publicCatalogLimiter, resolveStorefrontStore, getShowingStoreProducts);

//get products by ids (for recently viewed, etc.)
router.get("/by-ids", publicCatalogLimiter, resolveStorefrontStore, getProductsByIds);

//get related products
router.get("/related", publicCatalogLimiter, resolveStorefrontStore, getRelatedProducts);

//search products by productName, productCategory and status
router.get("/search", publicCatalogLimiter, resolveStorefrontStore, searchProducts);

// --- Back to admin-only ---

//get all products (admin listing)
router.get("/", isAuth, loadUser, resolveAuthorizationContext, getAllProducts);

//update a product
router.patch("/:id", isAuth, loadUser, resolveAuthorizationContext, updateProduct);

//update many products
router.patch("/update/many", isAuth, loadUser, resolveAuthorizationContext, updateManyProducts);

//update a product status
router.put("/status/:id", isAuth, loadUser, resolveAuthorizationContext, updateStatus);

//delete a product
router.delete("/:id", isAuth, loadUser, resolveAuthorizationContext, deleteProduct);

//delete many product
router.patch("/delete/many", isAuth, loadUser, resolveAuthorizationContext, deleteManyProducts);

module.exports = router;
