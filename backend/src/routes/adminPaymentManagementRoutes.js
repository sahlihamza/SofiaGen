const express = require('express');
const router = express.Router();
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
} = require('../middleware/auth')

const paymentDashboardController = require('../controller/admin/paymentDashboardController');
const paymentMethodController = require('../controller/admin/paymentMethodController');
const paymentProviderController = require('../controller/admin/paymentProviderController');
const paymentProviderConfigurationController = require('../controller/admin/paymentProviderConfigurationController');
const paymentRuleController = require('../controller/admin/paymentRuleController');
const paymentTransactionController = require('../controller/admin/paymentTransactionController');
const paymentRefundController = require('../controller/admin/paymentRefundController');
const paymentWebhookController = require('../controller/admin/paymentWebhookController');
const paymentLogController = require('../controller/admin/paymentLogController');
const paymentSettingsController = require('../controller/admin/paymentSettingsController');

router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get('/dashboard/stats', requirePermission('payments.view'), paymentDashboardController.getDashboardStats);
router.get('/dashboard/volume-by-provider', requirePermission('payments.view'), paymentDashboardController.getVolumeByProvider);
router.get('/dashboard/volume-by-country', requirePermission('payments.view'), paymentDashboardController.getVolumeByCountry);
router.get('/dashboard/volume-by-currency', requirePermission('payments.view'), paymentDashboardController.getVolumeByCurrency);
router.get('/dashboard/revenue-by-month', requirePermission('payments.view'), paymentDashboardController.getRevenueByMonth);
router.get('/dashboard/top-providers', requirePermission('payments.view'), paymentDashboardController.getTopProviders);
router.get('/dashboard/alerts', requirePermission('payments.view'), paymentDashboardController.getAlerts);

router.get('/methods', requirePermission('payments.view'), paymentMethodController.getPaymentMethods);
router.post('/methods', requirePermission('payments.create'), paymentMethodController.createPaymentMethod);
router.get('/methods/:id', requirePermission('payments.view'), paymentMethodController.getPaymentMethodById);
router.put('/methods/:id', requirePermission('payments.update'), paymentMethodController.updatePaymentMethod);
router.delete('/methods/:id', requirePermission('payments.delete'), paymentMethodController.deletePaymentMethod);

router.get('/providers', requirePermission('payments.view'), paymentProviderController.getPaymentProviders);
router.post('/providers', requirePermission('payments.create'), paymentProviderController.createPaymentProvider);
router.get('/providers/:id', requirePermission('payments.view'), paymentProviderController.getPaymentProviderById);
router.put('/providers/:id', requirePermission('payments.update'), paymentProviderController.updatePaymentProvider);
router.delete('/providers/:id', requirePermission('payments.delete'), paymentProviderController.deletePaymentProvider);
router.patch('/providers/:id/status', requirePermission('payments.update'), paymentProviderController.toggleProviderStatus);
router.post('/providers/:id/test-connection', requirePermission('payments.update'), paymentProviderController.testProviderConnection);

router.get('/providers/:providerId/configuration', requirePermission('payments.view'), paymentProviderConfigurationController.getConfigurationByProvider);
router.get('/configurations/:id', requirePermission('payments.view'), paymentProviderConfigurationController.getConfiguration);
router.post('/configurations', requirePermission('payments.create'), paymentProviderConfigurationController.createConfiguration);
router.put('/configurations/:id', requirePermission('payments.update'), paymentProviderConfigurationController.updateConfiguration);
router.post('/configurations/:id/rotate-keys', requirePermission('payments.update'), paymentProviderConfigurationController.rotateKeys);
router.post('/configurations/:id/test', requirePermission('payments.update'), paymentProviderConfigurationController.testConfiguration);

router.get('/rules', requirePermission('payments.view'), paymentRuleController.getPaymentRules);
router.post('/rules', requirePermission('payments.create'), paymentRuleController.createPaymentRule);
router.get('/rules/:id', requirePermission('payments.view'), paymentRuleController.getPaymentRuleById);
router.put('/rules/:id', requirePermission('payments.update'), paymentRuleController.updatePaymentRule);
router.delete('/rules/:id', requirePermission('payments.delete'), paymentRuleController.deletePaymentRule);

router.get('/transactions', requirePermission('payments.view'), paymentTransactionController.getTransactions);
router.get('/transactions/:id', requirePermission('payments.view'), paymentTransactionController.getTransactionById);
router.patch('/transactions/:id/status', requirePermission('payments.update'), paymentTransactionController.updateTransactionStatus);
router.post('/transactions/:id/retry', requirePermission('payments.update'), paymentTransactionController.retryTransaction);
router.get('/transactions/stats', requirePermission('payments.view'), paymentTransactionController.getTransactionStats);
router.get('/transactions/export', requirePermission('payments.view'), paymentTransactionController.exportTransactions);

router.get('/refunds', requirePermission('payments.view'), paymentRefundController.getRefunds);
router.get('/refunds/:id', requirePermission('payments.view'), paymentRefundController.getRefundById);
router.post('/refunds', requirePermission('payments.create'), paymentRefundController.createRefund);
router.post('/refunds/:id/approve', requirePermission('payments.update'), paymentRefundController.approveRefund);
router.post('/refunds/:id/reject', requirePermission('payments.update'), paymentRefundController.rejectRefund);
router.get('/refunds/history', requirePermission('payments.view'), paymentRefundController.getRefundHistory);

router.get('/webhooks', requirePermission('payments.view'), paymentWebhookController.getWebhooks);
router.get('/webhooks/:id', requirePermission('payments.view'), paymentWebhookController.getWebhookById);
router.post('/webhooks/:id/retry', requirePermission('payments.update'), paymentWebhookController.retryWebhook);
router.get('/webhooks/logs', requirePermission('payments.view'), paymentWebhookController.getWebhookLogs);

router.get('/logs', requirePermission('payments.view'), paymentLogController.getLogs);
router.get('/logs/module/:module', requirePermission('payments.view'), paymentLogController.getLogsByModule);
router.post('/logs/clear', requirePermission('payments.delete'), paymentLogController.clearOldLogs);

router.get('/settings', requirePermission('payments.view'), paymentSettingsController.getSettings);
router.get('/settings/category/:category', requirePermission('payments.view'), paymentSettingsController.getSettingsByCategory);
router.put('/settings/:key', requirePermission('payments.update'), paymentSettingsController.updateSetting);
router.put('/settings', requirePermission('payments.update'), paymentSettingsController.updateSettings);

module.exports = router;
