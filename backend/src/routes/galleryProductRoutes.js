const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext } = require("../middleware/auth");
const {
  addGalleryImages,
  replaceGalleryImages,
  getGalleryByProduct,
  deleteGalleryImage,
  deleteGalleryByProduct,
} = require("../controller/galleryProductController");

// add many images to a product's gallery (admin/store only)
router.post("/:productId", isAuth, loadUser, resolveAuthorizationContext, addGalleryImages);

// replace the whole gallery of a product (admin/store only)
router.put("/:productId", isAuth, loadUser, resolveAuthorizationContext, replaceGalleryImages);

// get all images of a product (public)
router.get("/:productId", getGalleryByProduct);

// delete a single image by its id (admin/store only)
router.delete("/image/:id", isAuth, loadUser, resolveAuthorizationContext, deleteGalleryImage);

// delete the whole gallery of a product (admin/store only)
router.delete("/product/:productId", isAuth, loadUser, resolveAuthorizationContext, deleteGalleryByProduct);

module.exports = router;
