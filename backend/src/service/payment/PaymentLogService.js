const PaymentLog = require('../../models/payment/PaymentLog');

class PaymentLogService {
  async log(data) {
    const logEntry = new PaymentLog(data);
    await logEntry.save();
    return logEntry;
  }

  async getLogs(filters = {}) {
    const query = {};
    if (filters.module) query.module = filters.module;
    if (filters.action) query.action = filters.action;
    if (filters.level) query.level = filters.level;
    if (filters.actorType) query.actorType = filters.actorType;
    if (filters.actorId) query.actorId = filters.actorId;
    if (filters.providerId) query.providerId = filters.providerId;
    if (filters.transactionId) query.transactionId = filters.transactionId;
    if (filters.refundId) query.refundId = filters.refundId;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const skip = ((filters.page || 1) - 1) * (filters.limit || 20);
    const total = await PaymentLog.countDocuments(query);
    const data = await PaymentLog.find(query)
      .populate('actorId', 'name email')
      .populate('providerId', 'code name')
      .populate('transactionId', 'transactionId amount status')
      .populate('refundId', 'amount status')
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

  async getLogsByModule(module, filters = {}) {
    return this.getLogs({ ...filters, module });
  }

  async getLogsByTransaction(transactionId) {
    return PaymentLog.find({ transactionId })
      .populate('actorId', 'name email')
      .populate('providerId', 'code name')
      .sort({ createdAt: -1 })
      .lean();
  }

  async clearOldLogs(days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await PaymentLog.deleteMany({ createdAt: { $lt: cutoffDate } });
    return result.deletedCount;
  }
}

module.exports = new PaymentLogService();
