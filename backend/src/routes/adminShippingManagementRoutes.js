const express = require('express');
const router = express.Router();
const { getCode } = require('../config/rbac/permissionCodes');
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
  requireSuperAdmin,
} = require('../middleware/auth');

const carrierProviderController = require('../controller/admin/carrierProviderController');

router.use(isAuth, loadUser, resolveAuthorizationContext);

// Carrier Providers (Super Admin CRUD for platform catalogue)
router.get(
  '/carriers/providers',
  requirePermission(getCode('Platform Carrier', 'view')),
  carrierProviderController.getCarrierProviders
);

router.post(
  '/carriers/providers',
  requirePermission(getCode('Platform Carrier', 'create')),
  carrierProviderController.createCarrierProvider
);

router.get(
  '/carriers/providers/:id',
  requirePermission(getCode('Platform Carrier', 'view')),
  carrierProviderController.getCarrierProviderById
);

router.put(
  '/carriers/providers/:id',
  requirePermission(getCode('Platform Carrier', 'update')),
  carrierProviderController.updateCarrierProvider
);

router.patch(
  '/carriers/providers/:id/toggle-active',
  requirePermission(getCode('Platform Carrier', 'update')),
  carrierProviderController.toggleCarrierActive
);

router.delete(
  '/carriers/providers/:id',
  requirePermission(getCode('Platform Carrier', 'delete')),
  carrierProviderController.deleteCarrierProvider
);

router.get(
  '/carriers/providers/:id/stats',
  requirePermission(getCode('Platform Carrier', 'stats')),
  carrierProviderController.getCarrierProviderStats
);

module.exports = router;
