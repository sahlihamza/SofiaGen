const express = require('express');
const router = express.Router({ mergeParams: true });
const { getCode } = require('../config/rbac/permissionCodes');
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
} = require('../middleware/auth');

const storeCarrierProviderController = require('../controller/storeCarrierProviderController');

router.use(isAuth, loadUser, resolveAuthorizationContext);

// Get all carrier providers for a store (with connection status)
router.get(
  '/',
  requirePermission(getCode('Carrier', 'view')),
  storeCarrierProviderController.getStoreCarriers
);

// Connect a carrier to a store
router.post(
  '/:carrierProviderId/connect',
  requirePermission(getCode('Carrier', 'create')),
  storeCarrierProviderController.connectCarrier
);

// Disconnect a carrier from a store
router.delete(
  '/:carrierProviderId',
  requirePermission(getCode('Carrier', 'delete')),
  storeCarrierProviderController.disconnectCarrier
);

// Update carrier capabilities
router.patch(
  '/:carrierProviderId/capabilities',
  requirePermission(getCode('Carrier', 'update')),
  storeCarrierProviderController.updateCarrierCapabilities
);

module.exports = router;
