const express = require("express");
const router = express.Router();
const ctrl = require("../controller/noteController");
const { isAuth, loadUser, resolveAuthorizationContext } = require("../middleware/auth");

/**
 * Platform Notes  super-admin-only memos that are NOT attached to any
 * tenant resource. They live in the same `notes` collection with
 * `scope: "platform"`, so the existing NoteService is reused.
 *
 * Auth: this router is mounted under /api/platform/notes which is a
 * platform route  `resolveAuthorizationContext` sets
 * `req.authContext.scope = "platform"` and `req.authContext.storeId = null`.
 * `NoteService` then auto-detects the platform scope and switches to the
 * platform permission set (platform.notes.*).
 */

const auth = [isAuth, loadUser, resolveAuthorizationContext];

// GET    /api/platform/notes
router.get("/", auth, ctrl.list);
// POST   /api/platform/notes
router.post("/", auth, ctrl.create);
// GET    /api/platform/notes/:id
router.get("/:id", auth, ctrl.getById);
// PATCH  /api/platform/notes/:id
router.patch("/:id", auth, ctrl.update);
// DELETE /api/platform/notes/:id
router.delete("/:id", auth, ctrl.softDelete);
// PATCH  /api/platform/notes/:id/pin
router.patch("/:id/pin", auth, ctrl.setPinned);

module.exports = router;