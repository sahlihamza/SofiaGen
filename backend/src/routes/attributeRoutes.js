const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { isAuth, loadUser, resolveAuthorizationContext } = require("../middleware/auth");
const router = express.Router();

const {
  addAttribute,
  addAllAttributes,
  getAllAttributes,
  getShowingAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  deleteManyAttributes,
} = require("../controller/attributeController");

// SFG-80: was gated by a blanket isAuth at the mount in routes.js, which
// also blocked /show  the public storefront's attribute list (product
// variant options like size/color), called with no login at all.
const adminAuth = [isAuth, loadUser, resolveAuthorizationContext];

// add attribute
router.post("/add", ...adminAuth, addAttribute);

// add all attributes
router.post("/add/all", ...adminAuth, addAllAttributes);

// get all attributes
router.get("/", ...adminAuth, getAllAttributes);

// --- Public storefront browsing ---

// get showing attributes in store
router.get("/show", getShowingAttributes);

// --- Back to admin-only ---

// delete many attributes
router.patch("/delete/many", ...adminAuth, deleteManyAttributes);

// get attribute by id
router.get("/:id", ...adminAuth, getAttributeById);

// update attribute
router.put("/:id", ...adminAuth, updateAttribute);

// delete attribute
router.delete("/:id", ...adminAuth, deleteAttribute);

module.exports = router;
