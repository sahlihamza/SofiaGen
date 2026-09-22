const express = require('express');
const router = express.Router();
const {
  isAuth,
  loadUser,
  requirePermission,
} = require('../middleware/auth');

const platformPaymentProviderController = require('../controller/admin/platformPaymentProviderController');

router.get('/', requirePermission('payments.view'), platformPaymentProviderController.getPaymentProviders);
router.post('/', requirePermission('payments.create'), platformPaymentProviderController.createPaymentProvider);
router.get('/:id', requirePermission('payments.view'), platformPaymentProviderController.getPaymentProviderById);
router.put('/:id', requirePermission('payments.update'), platformPaymentProviderController.updatePaymentProvider);
router.delete('/:id', requirePermission('payments.delete'), platformPaymentProviderController.deletePaymentProvider);

router.post('/:id/enable', requirePermission('payments.enable'), async (req, res) => {
  try {
    const PaymentProviderService = require('../service/payment/PaymentProviderService');
    const provider = await PaymentProviderService.setEnabled(req.params.id, true, req.user?._id);
    return res.status(200).json({ success: true, message: 'Provider enabled', data: provider });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(422).json({ success: false, message: 'Donnés invalides', errors: Object.values(error.errors || {}).map((err) => ({ field: err.path, message: err.message })) });
    }
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.post('/:id/disable', requirePermission('payments.disable'), async (req, res) => {
  try {
    const PaymentProviderService = require('../service/payment/PaymentProviderService');
    const provider = await PaymentProviderService.setEnabled(req.params.id, false, req.user?._id);
    return res.status(200).json({ success: true, message: 'Provider disabled', data: provider });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(422).json({ success: false, message: 'Donnés invalides', errors: Object.values(error.errors || {}).map((err) => ({ field: err.path, message: err.message })) });
    }
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.put('/:id/config', requirePermission('payments.configure'), async (req, res) => {
  try {
    const PaymentProviderService = require('../service/payment/PaymentProviderService');
    const provider = await PaymentProviderService.updateConfig(req.params.id, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Provider configuration updated', data: provider });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(422).json({ success: false, message: 'Donnés invalides', errors: Object.values(error.errors || {}).map((err) => ({ field: err.path, message: err.message })) });
    }
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.get('/available', requirePermission('payments.view'), async (req, res) => {
  try {
    const PaymentProviderService = require('../service/payment/PaymentProviderService');
    const providers = await PaymentProviderService.getAvailable({
      country: req.query.country || null,
      currency: req.query.currency || null,
    });

    return res.status(200).json({ success: true, data: providers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.get('/available/store/:storeId', requirePermission('payments.view'), async (req, res) => {
  try {
    const Store = require('../models/Store');
    const store = await Store.findById(req.params.storeId).lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const PaymentProviderService = require('../service/payment/PaymentProviderService');
    const providers = await PaymentProviderService.getAvailable({
      country: store.country || null,
      currency: store.currency || null,
    });

    return res.status(200).json({ success: true, data: providers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
