const PaymentMethod = require('../../models/payment/PaymentMethod');
const PaymentLog = require('../../models/payment/PaymentLog');

class PaymentMethodService {
  async create(data) {
    const method = new PaymentMethod(data);
    await method.save();
    await PaymentLog.log({
      module: 'methods',
      action: 'create',
      message: `Payment method created: ${method.code}`,
      details: { methodId: method._id, code: method.code },
    });
    return method;
  }

  async getById(id) {
    return PaymentMethod.findById(id);
  }

  async getAll(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.code) query.code = new RegExp(filters.code, 'i');

    return PaymentMethod.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
  }

  async update(id, data, actor) {
    const method = await PaymentMethod.findById(id);
    if (!method) throw new Error('Payment method not found');

    const updatableFields = [
      'code', 'name', 'description', 'type', 'icon', 'displayOrder', 'status',
      'visibility', 'compatibleCountries', 'compatibleCurrencies', 'compatiblePlans',
      'minAmount', 'maxAmount', 'additionalFees', 'supportsRefund',
      'supportsPartialPayment', 'supportsSubscription', 'metadata',
    ];

    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        method[field] = data[field];
      }
    });

    if (actor) {
      method.updatedBy = actor;
    }

    await method.save();

    await PaymentLog.log({
      module: 'methods',
      action: 'update',
      message: `Payment method updated: ${method.code}`,
      details: { methodId: method._id, code: method.code, changes: data },
      actorId: actor,
    });

    return method;
  }

  async delete(id, actor) {
    const method = await PaymentMethod.findById(id);
    if (!method) throw new Error('Payment method not found');

    await PaymentMethod.findByIdAndDelete(id);

    await PaymentLog.log({
      module: 'methods',
      action: 'delete',
      message: `Payment method deleted: ${method.code}`,
      details: { methodId: method._id, code: method.code },
      actorId: actor,
    });

    return method;
  }

  async getDefaultMethods() {
    return PaymentMethod.find({ status: 'active' }).sort({ displayOrder: 1 }).lean();
  }
}

module.exports = new PaymentMethodService();
