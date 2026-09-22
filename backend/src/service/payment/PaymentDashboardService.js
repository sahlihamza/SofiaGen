const Payment = require('../../models/Payment');
const PaymentRefund = require('../../models/payment/PaymentRefund');
const PaymentWebhook = require('../../models/payment/PaymentWebhook');
const PaymentProvider = require('../../models/payment/PaymentProvider');
const dayjs = require('dayjs');

class PaymentDashboardService {
  async getDashboardStats(filters = {}) {
    const matchStage = this._buildMatchStage(filters);

    const [totalResult, succeededResult, failedResult, refundResult] = await Promise.all([
      Payment.aggregate([
        { $match: matchStage },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { ...matchStage, status: 'failed' } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      PaymentRefund.aggregate([
        { $match: { status: 'completed', ...(filters.startDate ? { createdAt: { $gte: new Date(filters.startDate) } } : {}) } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      totalTransactions: totalResult[0]?.count || 0,
      totalAmount: succeededResult[0]?.amount || 0,
      successfulPayments: succeededResult[0]?.count || 0,
      failedPayments: failedResult[0]?.count || 0,
      refunds: {
        count: refundResult[0]?.count || 0,
        amount: refundResult[0]?.amount || 0,
      },
    };
  }

  async getVolumeByProvider(filters = {}) {
    const matchStage = this._buildMatchStage(filters);
    const result = await Payment.aggregate([
      { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
      {
        $group: {
          _id: '$providerId',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const providers = await PaymentProvider.find({}).select('code name logo').lean();
    const providerMap = providers.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {});

    return result.map((r) => ({
      provider: providerMap[r._id.toString()] || { code: 'unknown', name: 'Unknown' },
      count: r.count,
      amount: r.amount,
    }));
  }

  async getVolumeByCountry(filters = {}) {
    const matchStage = this._buildMatchStage(filters);
    const result = await Payment.aggregate([
      { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $group: {
          _id: '$store.country',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    return result.map((r) => ({
      country: r._id || 'unknown',
      count: r.count,
      amount: r.amount,
    }));
  }

  async getVolumeByCurrency(filters = {}) {
    const matchStage = this._buildMatchStage(filters);
    const result = await Payment.aggregate([
      { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    return result.map((r) => ({
      currency: r._id || 'unknown',
      count: r.count,
      amount: r.amount,
    }));
  }

  async getRevenueByMonth(filters = {}) {
    const matchStage = this._buildMatchStage(filters);
    const result = await Payment.aggregate([
      { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return result.map((r) => ({
      year: r._id.year,
      month: r._id.month,
      label: dayjs(`${r._id.year}-${r._id.month}`).format('MMM YYYY'),
      count: r.count,
      amount: r.amount,
    }));
  }

  async getTopProviders(filters = {}, limit = 10) {
    const matchStage = this._buildMatchStage(filters);
    const result = await Payment.aggregate([
      { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
      {
        $group: {
          _id: '$providerId',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: limit },
    ]);

    const providers = await PaymentProvider.find({}).select('code name logo').lean();
    const providerMap = providers.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {});

    return result.map((r) => ({
      provider: providerMap[r._id.toString()] || { code: 'unknown', name: 'Unknown' },
      count: r.count,
      amount: r.amount,
    }));
  }

  async getAlerts(filters = {}) {
    const alerts = [];

    const failedWebhooks = await PaymentWebhook.countDocuments({
      status: 'failed',
      ...(filters.startDate ? { createdAt: { $gte: new Date(filters.startDate) } } : {}),
    });

    if (failedWebhooks > 0) {
      alerts.push({
        id: 'failed_webhooks',
        type: 'error',
        message: `${failedWebhooks} webhook(s) failed`,
        count: failedWebhooks,
      });
    }

    const pendingRefunds = await PaymentRefund.countDocuments({ status: 'pending' });
    if (pendingRefunds > 0) {
      alerts.push({
        id: 'pending_refunds',
        type: 'warning',
        message: `${pendingRefunds} refund(s) pending approval`,
        count: pendingRefunds,
      });
    }

    const maintenanceProviders = await PaymentProvider.countDocuments({ status: 'maintenance' });
    if (maintenanceProviders > 0) {
      alerts.push({
        id: 'maintenance_providers',
        type: 'warning',
        message: `${maintenanceProviders} provider(s) in maintenance`,
        count: maintenanceProviders,
      });
    }

    return alerts;
  }

  _buildMatchStage(filters) {
    const match = {};
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) match.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters.providerId) match.providerId = filters.providerId;
    if (filters.storeId) match.storeId = filters.storeId;
    if (filters.currency) match.currency = filters.currency;
    if (filters.status) match.status = filters.status;
    return match;
  }
}

module.exports = new PaymentDashboardService();
