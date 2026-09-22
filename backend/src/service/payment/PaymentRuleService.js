const PaymentRule = require('../../models/payment/PaymentRule');
const PaymentLog = require('../../models/payment/PaymentLog');

class PaymentRuleService {
  async create(data) {
    const rule = new PaymentRule(data);
    await rule.save();
    await PaymentLog.log({
      module: 'rules',
      action: 'create',
      message: `Payment rule created for provider ${data.paymentProviderId}`,
      details: { ruleId: rule._id, providerId: data.paymentProviderId },
    });
    return rule;
  }

  async getById(id) {
    return PaymentRule.findById(id).populate('paymentProviderId', 'code name');
  }

  async getAll(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.paymentProviderId) query.paymentProviderId = filters.paymentProviderId;

    return PaymentRule.find(query)
      .populate('paymentProviderId', 'code name')
      .sort({ priority: 1, createdAt: -1 })
      .lean();
  }

  async update(id, data, actor) {
    const rule = await PaymentRule.findById(id);
    if (!rule) throw new Error('Payment rule not found');

    const updatableFields = [
      'paymentProviderId', 'countries', 'currencies', 'planIds', 'storeTypes', 'clientTypes',
      'minAmount', 'maxAmount', 'supportsOneTime', 'supportsSubscription', 'supportsRefund',
      'priority', 'status', 'metadata',
    ];

    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        rule[field] = data[field];
      }
    });

    await rule.save();

    await PaymentLog.log({
      module: 'rules',
      action: 'update',
      message: `Payment rule updated for provider ${rule.paymentProviderId}`,
      details: { ruleId: rule._id, providerId: rule.paymentProviderId, changes: data },
      actorId: actor,
    });

    return rule;
  }

  async delete(id, actor) {
    const rule = await PaymentRule.findById(id);
    if (!rule) throw new Error('Payment rule not found');

    await PaymentRule.findByIdAndDelete(id);

    await PaymentLog.log({
      module: 'rules',
      action: 'delete',
      message: `Payment rule deleted for provider ${rule.paymentProviderId}`,
      details: { ruleId: rule._id, providerId: rule.paymentProviderId },
      actorId: actor,
    });

    return rule;
  }

  async getRulesForProvider(providerId) {
    return PaymentRule.find({ paymentProviderId: providerId }).sort({ priority: 1 }).lean();
  }
}

module.exports = new PaymentRuleService();
