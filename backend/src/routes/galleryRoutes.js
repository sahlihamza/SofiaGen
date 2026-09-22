const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getGalleries,
  getGalleryById,
  getGalleriesByCategory,
  createGallery,
  updateGallery,
  deleteGallery,
  addImage,
  removeImage,
  reorderImages,
} = require("../controller/galleryController");
const { isAuth, loadUser, requirePermission } = require("../middleware/auth");

// Public endpoints
router.get("/", getGalleries);
router.get("/:id", getGalleryById);
router.get("/category/:storeId/:category", getGalleriesByCategory);

// Admin endpoints (media permission)
router.post("/", isAuth, loadUser, requirePermission(getCode("Media", "create")), createGallery);
router.put("/:id", isAuth, loadUser, requirePermission(getCode("Media", "update")), updateGallery);
router.delete("/:id", isAuth, loadUser, requirePermission(getCode("Media", "delete")), deleteGallery);
router.post("/:id/images", isAuth, loadUser, requirePermission(getCode("Media", "upload")), addImage);
router.delete("/:id/images/:imageId", isAuth, loadUser, requirePermission(getCode("Media", "delete")), removeImage);
router.patch("/:id/reorder", isAuth, loadUser, requirePermission(getCode("Media", "update")), reorderImages);

module.exports = router;
