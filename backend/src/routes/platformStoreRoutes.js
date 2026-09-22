const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const mongoose = require("mongoose");
const router = express.Router();
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");
const PlatformStoreService = require("../service/PlatformStoreService");

const toObjectId = (value) => {
  if (value instanceof mongoose.Schema.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Schema.Types.ObjectId(value);
  }
  return null;
};

router.get(
  "/",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "view")),
  async (req, res) => {
    try {
      const result = await PlatformStoreService.listStores(req.query, req.query);
      return res.status(200).json({
        success: true,
        data: result.stores,
        pagination: result.pagination,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get(
  "/:id",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "view")),
  async (req, res) => {
    try {
      const data = await PlatformStoreService.getStoreDetails(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, message: err.message });
      if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, message: err.message });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.put(
  "/:id",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "update")),
  async (req, res) => {
    try {
      const updated = await PlatformStoreService.updateStore(req.params.id, req.body, req.user._id);
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, message: err.message });
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.post(
  "/:id/transfer-ownership",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "transfer")),
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { newOwnerId } = req.body;
      if (!newOwnerId) {
        return res.status(400).json({ success: false, message: "newOwnerId is required" });
      }
      if (!mongoose.Types.ObjectId.isValid(newOwnerId)) {
        return res.status(400).json({ success: false, message: "Invalid newOwnerId" });
      }

      const result = await PlatformStoreService.transferStoreOwnership(req.params.id, newOwnerId, req.user._id);

      return res.status(200).json({
        success: true,
        message: "Store ownership transferred successfully",
        data: result,
      });
    } catch (err) {
      if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, message: err.message });
      if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, message: err.message });
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

const lifecycleError = (res, err) => {
  if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, message: err.message });
  if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, message: err.message });
  if (err.code === "CONFLICT") return res.status(409).json({ success: false, message: err.message });
  return res.status(500).json({ success: false, message: err.message });
};

router.post(
  "/:id/suspend",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "suspend")),
  async (req, res) => {
    try {
      const store = await PlatformStoreService.suspendStore(req.params.id, {
        reason: req.body?.reason,
        actorId: req.user._id,
      });
      return res.status(200).json({ success: true, message: "Store suspendu", data: store });
    } catch (err) {
      return lifecycleError(res, err);
    }
  }
);

router.post(
  "/:id/activate",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "activate")),
  async (req, res) => {
    try {
      const store = await PlatformStoreService.activateStore(req.params.id, {
        actorId: req.user._id,
        reason: req.body?.reason,
      });
      return res.status(200).json({ success: true, message: "Store activé", data: store });
    } catch (err) {
      return lifecycleError(res, err);
    }
  }
);

router.post(
  "/:id/restore",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "restore")),
  async (req, res) => {
    try {
      const store = await PlatformStoreService.restoreStore(req.params.id, {
        actorId: req.user._id,
        reason: req.body?.reason,
      });
      return res.status(200).json({ success: true, message: "Store restauré", data: store });
    } catch (err) {
      return lifecycleError(res, err);
    }
  }
);

router.delete(
  "/:id",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Store", "delete")),
  async (req, res) => {
    try {
      const result = await PlatformStoreService.softDeleteStore(req.params.id, {
        reason: req.body?.reason,
        actorId: req.user._id,
      });
      return res.status(200).json({ success: true, message: "Store supprimé", data: result });
    } catch (err) {
      return lifecycleError(res, err);
    }
  }
);

module.exports = router;
