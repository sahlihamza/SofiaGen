const express = require("express");
const router = express.Router();
const ctrl = require("../controller/noteController");
const { isAuth, loadUser, resolveAuthorizationContext } = require("../middleware/auth");
const { requirePermission } = require("../middleware/auth");

// All note routes are store-scoped and require authentication. The
// `resolveAuthorizationContext` middleware populates `req.authContext` with
// the active store + the user's permission set for that store.
const auth = [isAuth, loadUser, resolveAuthorizationContext];

// GET    /api/notes                  list with filters + pagination
// POST   /api/notes                  create one
// GET    /api/notes/:id              fetch one
// PATCH  /api/notes/:id              update content / pinned
// DELETE /api/notes/:id              soft-delete
// PATCH  /api/notes/:id/pin          toggle pinned

router.get("/", auth, requirePermission("notes.view"), ctrl.list);
router.post("/", auth, requirePermission("notes.create"), ctrl.create);
router.get("/:id", auth, requirePermission("notes.view"), ctrl.getById);
router.patch("/:id", auth, requirePermission("notes.update"), ctrl.update);
router.delete("/:id", auth, requirePermission("notes.delete"), ctrl.softDelete);
router.patch("/:id/pin", auth, requirePermission("notes.pin"), ctrl.setPinned);

module.exports = router;
