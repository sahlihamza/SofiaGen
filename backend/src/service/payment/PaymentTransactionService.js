const Payment = require('../../models/Payment');
const PaymentRefund = require('../../models/payment/PaymentRefund');
const PaymentWebhook = require('../../models/payment/PaymentWebhook');
const PaymentLog = require('../../models/payment/PaymentLog');
const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const dayjs = require('dayjs');
const { emitEvent } = require('../../lib/eventBus');

class PaymentTransactionService {
  async create(data) {
    const transaction = new Payment(data);
    await transaction.save();

    await PaymentLog.log({
      module: 'transactions',
      action: 'create',
      message: `Transaction created: ${transaction.transactionId || transaction._id}`,
      details: { transactionId: transaction._id, amount: transaction.amount, currency: transaction.currency, status: transaction.status },
      storeId: transaction.storeId,
      providerId: transaction.providerId,
      transactionId: transaction._id,
    });

    // STORE-DASHBOARD-01: the Payments/Financial/KPI widgets read Payment
    // directly, so a payment that lands mid-TTL would show stale numbers
    // for up to CACHE_TTL seconds otherwise.
    if (transaction.storeId) {
      emitEvent('payment.updated', { storeId: transaction.storeId, entityId: transaction._id });
    }

    return transaction;
  }

  async getById(id) {
    return Payment.findById(id)
      .populate('storeId', 'name')
      .populate('providerId', 'code name')
      .populate('customerId', 'name email')
      .populate('orderId', 'orderNumber')
      .populate('subscriptionId', 'status billingCycle')
      .populate('invoiceId', 'invoiceNumber status total currency');
  }

  async getAll(filters = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.storeId) query.storeId = filters.storeId;
    if (filters.providerId) query.providerId = filters.providerId;
    if (filters.gateway) query.gateway = filters.gateway;
    if (filters.method) query.method = filters.method;
    if (filters.currency) query.currency = filters.currency;
    if (filters.customerId) query.customerId = filters.customerId;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.$or = [
        { transactionId: { $regex: filters.search, $options: 'i' } },
        { method: { $regex: filters.search, $options: 'i' } },
        { gateway: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = ((filters.page || 1) - 1) * (filters.limit || 20);
    const total = await Payment.countDocuments(query);
    const data = await Payment.find(query)
      .populate('storeId', 'name')
      .populate('providerId', 'code name')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(filters.limit || 20, 10));

    return {
      data,
      pagination: {
        total,
        page: parseInt(filters.page || 1, 10),
        limit: parseInt(filters.limit || 20, 10),
        pages: Math.ceil(total / (filters.limit || 20)),
      },
    };
  }

  async updateStatus(id, status, metadata = {}, actor) {
    const transaction = await Payment.findById(id);
    if (!transaction) throw new Error('Transaction not found');

    const oldStatus = transaction.status;
    transaction.status = status;
    if (metadata.paidAt) transaction.paidAt = metadata.paidAt;
    if (metadata.failureReason) transaction.failureReason = metadata.failureReason;
    if (metadata.gatewayTransactionId) transaction.gatewayTransactionId = metadata.gatewayTransactionId;
    if (metadata.refundedAmount !== undefined) transaction.refundedAmount = metadata.refundedAmount;

    await transaction.save();

    if (status === 'paid' || status === 'succeeded') {
      if (transaction.invoiceId) {
        await Invoice.findByIdAndUpdate(transaction.invoiceId, {
          status: 'paid',
          paidAt: new Date(),
          paymentId: transaction._id,
        });
      }
      if (transaction.subscriptionId) {
        const subscription = await Subscription.findById(transaction.subscriptionId);
        if (subscription) {
          subscription.status = 'active';
          subscription.chargeFailures = 0;
          await subscription.save();
        }
      }
    }

    await PaymentLog.log({
      module: 'transactions',
      action: 'update_status',
      message: `Transaction status updated from ${oldStatus} to ${status}`,
      details: { transactionId: transaction._id, oldStatus, newStatus: status, metadata },
      actorId: actor,
      storeId: transaction.storeId,
      providerId: transaction.providerId,
      transactionId: transaction._id,
    });

    return transaction;
  }

  async retryPayment(id, actor) {
    const transaction = await Payment.findById(id);
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.status !== 'failed') throw new Error('Only failed transactions can be retried');

    transaction.status = 'pending';
    transaction.attemptCount = (transaction.attemptCount || 0) + 1;
    transaction.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
    await transaction.save();

    await PaymentLog.log({
      module: 'transactions',
      action: 'retry',
      message: `Payment retry scheduled for transaction ${transaction.transactionId || transaction._id}`,
      details: { transactionId: transaction._id, attemptCount: transaction.attemptCount },
      actorId: actor,
      storeId: transaction.storeId,
      providerId: transaction.providerId,
      transactionId: transaction._id,
      level: 'warn',
    });

    return transaction;
  }

  async getStats(filters = {}) {
    const matchStage = this._buildMatchStage(filters);

    const [statusStats, providerStats, dailyStats] = await Promise.all([
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { ...matchStage, status: { $in: ['paid', 'succeeded'] } } },
        {
          $group: {
            _id: '$providerId',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    return {
      statusStats,
      providerStats,
      dailyStats,
    };
  }

  async processRefund(transactionId, amount, reason, actor) {
    const transaction = await Payment.findById(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    if (transaction.refundedAmount + amount > transaction.amount) {
      throw new Error('Refund amount exceeds remaining refundable amount');
    }

    if (!transaction.isPartialRefundAllowed && amount < transaction.amount) {
      throw new Error('Partial refunds are not allowed for this transaction');
    }

    const refund = await PaymentRefund.create({
      transactionId: transaction._id,
      paymentId: transaction._id,
      amount,
      currency: transaction.currency,
      reason,
      status: 'pending',
      requestedBy: actor,
    });

    transaction.refundedAmount = (transaction.refundedAmount || 0) + amount;
    if (transaction.refundedAmount >= transaction.amount) {
      transaction.status = 'refunded';
    } else {
      transaction.status = 'partially_refunded';
    }

    await transaction.save();

    await PaymentLog.log({
      module: 'transactions',
      action: 'refund_initiated',
      message: `Refund initiated for transaction ${transaction.transactionId || transaction._id}`,
      details: { transactionId: transaction._id, refundId: refund._id, amount, reason },
      actorId: actor,
      storeId: transaction.storeId,
      providerId: transaction.providerId,
      transactionId: transaction._id,
      level: 'warn',
    });

    if (transaction.storeId) {
      emitEvent('payment.updated', { storeId: transaction.storeId, entityId: transaction._id });
    }

    return refund;
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

module.exports = new PaymentTransactionService();
