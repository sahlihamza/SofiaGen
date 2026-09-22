const express = require('express');
const router = express.Router();
const storePaymentProviderController = require('../controller/payment/StorePaymentProviderController');
const { isAuth, loadUser, requireStoreAccess, requirePermission } = require('../middleware/auth');

router.use(isAuth, loadUser);

router.get('/stores/:storeId/providers', requireStoreAccess(), storePaymentProviderController.listStorePaymentProviders);
router.get('/stores/:storeId/providers/:providerId', requireStoreAccess(), storePaymentProviderController.getStorePaymentProvider);
router.post('/stores/:storeId/providers', requireStoreAccess(), storePaymentProviderController.createStorePaymentProvider);
router.put('/stores/:storeId/providers/:providerId', requireStoreAccess(), storePaymentProviderController.updateStorePaymentProvider);
router.delete('/stores/:storeId/providers/:providerId', requireStoreAccess(), storePaymentProviderController.removeStorePaymentProvider);

router.get('/stores/:storeId/available-methods', requireStoreAccess(), storePaymentProviderController.getAvailableMethods);

router.get('/stores/:storeId/providers/:providerId/credentials', requireStoreAccess(), requirePermission('payments.configure'), storePaymentProviderController.getStorePaymentCredentials);
router.post('/stores/:storeId/providers/:providerId/test-connection', requireStoreAccess(), requirePermission('payments.configure'), storePaymentProviderController.testStoreProviderConnection);

module.exports = router;
