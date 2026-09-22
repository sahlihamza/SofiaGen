const PaymentRefund = require('../../models/payment/PaymentRefund');
const Payment = require('../../models/Payment');
const PaymentLog = require('../../models/payment/PaymentLog');

class PaymentRefundService {
  async create(data) {
    const refund = new PaymentRefund(data);
    await refund.save();

    await PaymentLog.log({
      module: 'refunds',
      action: 'create',
      message: `Refund created for transaction ${data.transactionId}`,
      details: { refundId: refund._id, transactionId: data.transactionId, amount: data.amount },
      refundId: refund._id,
      transactionId: data.transactionId,
    });

    return refund;
  }

  async getById(id) {
    return PaymentRefund.findById(id)
      .populate('transactionId', 'transactionId amount currency status')
      .populate('paymentId', 'transactionId amount currency status')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');
  }

  async getAll(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.transactionId) query.transactionId = filters.transactionId;
    if (filters.requestedBy) query.requestedBy = filters.requestedBy;

    const skip = ((filters.page || 1) - 1) * (filters.limit || 20);
    const total = await PaymentRefund.countDocuments(query);
    const data = await PaymentRefund.find(query)
      .populate('transactionId', 'transactionId amount currency status')
      .populate('paymentId', 'transactionId amount currency status')
      .populate('requestedBy', 'name email')
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

  async approve(id, approvedBy) {
    const refund = await PaymentRefund.findById(id);
    if (!refund) throw new Error('Refund not found');
    if (refund.status !== 'pending') throw new Error('Refund is not pending');

    refund.status = 'approved';
    refund.approvedBy = approvedBy;
    refund.processedAt = new Date();
    await refund.save();

    await PaymentLog.log({
      module: 'refunds',
      action: 'approve',
      message: `Refund approved: ${refund._id}`,
      details: { refundId: refund._id, transactionId: refund.transactionId, amount: refund.amount },
      actorId: approvedBy,
      refundId: refund._id,
      transactionId: refund.transactionId,
    });

    return refund;
  }

  async reject(id, rejectedBy, reason) {
    const refund = await PaymentRefund.findById(id);
    if (!refund) throw new Error('Refund not found');
    if (refund.status !== 'pending') throw new Error('Refund is not pending');

    refund.status = 'rejected';
    refund.rejectedBy = rejectedBy;
    refund.rejectionReason = reason;
    await refund.save();

    await PaymentLog.log({
      module: 'refunds',
      action: 'reject',
      message: `Refund rejected: ${refund._id}`,
      details: { refundId: refund._id, transactionId: refund.transactionId, reason },
      actorId: rejectedBy,
      refundId: refund._id,
      transactionId: refund.transactionId,
      level: 'warn',
    });

    return refund;
  }

  async updateStatus(id, status, metadata = {}, actor) {
    const refund = await PaymentRefund.findById(id);
    if (!refund) throw new Error('Refund not found');

    refund.status = status;
    if (metadata.providerRefundId) refund.providerRefundId = metadata.providerRefundId;
    if (metadata.gatewayResponse) refund.gatewayResponse = metadata.gatewayResponse;
    if (status === 'completed' || status === 'failed') refund.processedAt = new Date();

    await refund.save();

    await PaymentLog.log({
      module: 'refunds',
      action: 'update_status',
      message: `Refund status updated to ${status}: ${refund._id}`,
      details: { refundId: refund._id, status, metadata },
      actorId: actor,
      refundId: refund._id,
      transactionId: refund.transactionId,
    });

    return refund;
  }

  async getRefundsByTransaction(transactionId) {
    return PaymentRefund.find({ transactionId }).sort({ createdAt: -1 }).lean();
  }

  async getRefundHistory(filters = {}) {
    return this.getAll(filters);
  }
}

module.exports = new PaymentRefundService();
