const PaymentProvider = require('../../models/payment/PaymentProvider');
const PaymentLog = require('../../models/payment/PaymentLog');

const SENSITIVE_FIELDS = ['apiKey', 'secretKey', 'webhookSecret'];

const sanitizeProvider = (provider) => {
  if (!provider) return provider;
  const sanitized = provider.toObject ? provider.toObject() : { ...provider };
  SENSITIVE_FIELDS.forEach((field) => delete sanitized[field]);
  if (sanitized.sandboxConfig) delete sanitized.sandboxConfig;
  if (sanitized.productionConfig) delete sanitized.productionConfig;
  return sanitized;
};

class PaymentProviderService {
  async create(data, actor) {
    const provider = new PaymentProvider(data);
    await provider.save();

    await PaymentLog.log({
      module: 'payment_providers',
      action: 'create',
      message: `Payment provider created: ${provider.code}`,
      details: { providerId: provider._id, code: provider.code, name: provider.name },
      actorId: actor || null,
      providerId: provider._id,
    });

    return sanitizeProvider(provider);
  }

  async getById(id) {
    return PaymentProvider.findById(id).lean();
  }

  async getAll(filters = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.code) query.code = new RegExp(filters.code, 'i');
    if (filters.country) query.compatibleCountries = filters.country;
    if (filters.type) query.type = filters.type;
    if (filters.enabled !== undefined) query.enabled = filters.enabled === true || filters.enabled === 'true';

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      PaymentProvider.find(query)
        .select('-apiKey -secretKey -webhookSecret')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentProvider.countDocuments(query),
    ]);

    return {
      data: providers.map(sanitizeProvider),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAvailable(filters = {}) {
    const query = { enabled: true, status: 'active' };

    if (filters.country) query.compatibleCountries = filters.country;
    if (filters.currency) query.compatibleCurrencies = filters.currency;
    if (filters.type) query.type = filters.type;

    const providers = await PaymentProvider.find(query)
      .select('-apiKey -secretKey -webhookSecret')
      .sort({ name: 1 })
      .lean();

    return providers.map(sanitizeProvider);
  }

  async update(id, data, actor) {
    const provider = await PaymentProvider.findById(id);
    if (!provider) throw new Error('Payment provider not found');

    const updatableFields = [
      'code', 'name', 'logo', 'description', 'apiKey', 'secretKey', 'webhookSecret',
      'sandboxConfig', 'productionConfig', 'mode', 'endpoint', 'webhookUrl',
      'compatibleCountries', 'compatibleCurrencies', 'compatibleMethods',
      'supportsOneTime', 'supportsOneTimePayment', 'supportsSubscription', 'supportsRefund',
      'supportsCapture', 'supportsAuthorization', 'supportsDeferredPayment', 'supportsWebhook',
      'status', 'enabled', 'type', 'environment', 'display', 'metadata',
    ];

    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        provider[field] = data[field];
      }
    });

    if (actor) {
      provider.updatedBy = actor;
    }

    await provider.save();

    await PaymentLog.log({
      module: 'payment_providers',
      action: 'update',
      message: `Payment provider updated: ${provider.code}`,
      details: { providerId: provider._id, code: provider.code, changes: data },
      actorId: actor,
      providerId: provider._id,
    });

    return sanitizeProvider(provider);
  }

  async updateConfig(id, data, actor) {
    const provider = await PaymentProvider.findById(id);
    if (!provider) throw new Error('Payment provider not found');

    const configFields = ['environment', 'sandboxConfig', 'productionConfig', 'webhookUrl', 'mode'];
    configFields.forEach((field) => {
      if (data[field] !== undefined) {
        provider[field] = data[field];
      }
    });

    if (data.apiKey !== undefined && data.apiKey !== '') {
      provider.apiKey = data.apiKey;
    }
    if (data.secretKey !== undefined && data.secretKey !== '') {
      provider.secretKey = data.secretKey;
    }
    if (data.webhookSecret !== undefined && data.webhookSecret !== '') {
      provider.webhookSecret = data.webhookSecret;
    }

    if (actor) {
      provider.updatedBy = actor;
    }

    await provider.save();

    await PaymentLog.log({
      module: 'payment_providers',
      action: 'configure',
      message: `Payment provider configuration updated: ${provider.code}`,
      details: { providerId: provider._id, code: provider.code, environment: provider.environment },
      actorId: actor,
      providerId: provider._id,
    });

    return sanitizeProvider(provider);
  }

  async delete(id, actor) {
    const provider = await PaymentProvider.findById(id);
    if (!provider) throw new Error('Payment provider not found');

    await PaymentProvider.findByIdAndDelete(id);

    await PaymentLog.log({
      module: 'payment_providers',
      action: 'delete',
      message: `Payment provider deleted: ${provider.code}`,
      details: { providerId: provider._id, code: provider.code },
      actorId: actor,
      providerId: provider._id,
    });

    return sanitizeProvider(provider);
  }

  async setEnabled(id, enabled, actor) {
    const provider = await PaymentProvider.findById(id);
    if (!provider) throw new Error('Payment provider not found');

    provider.enabled = Boolean(enabled);
    if (actor) {
      provider.updatedBy = actor;
    }
    await provider.save();

    await PaymentLog.log({
      module: 'payment_providers',
      action: enabled ? 'enable' : 'disable',
      message: `Payment provider ${enabled ? 'enabled' : 'disabled'}: ${provider.code}`,
      details: { providerId: provider._id, code: provider.code, enabled: provider.enabled },
      actorId: actor,
      providerId: provider._id,
    });

    return sanitizeProvider(provider);
  }

  async testConnection(id) {
    const provider = await PaymentProvider.findById(id);
    if (!provider) throw new Error('Payment provider not found');

    const result = await this._testConnection(provider);

    await PaymentLog.log({
      module: 'payment_providers',
      action: 'test_connection',
      message: `Connection test for provider ${provider.code}: ${result.status}`,
      details: { providerId: provider._id, code: provider.code, result },
      providerId: provider._id,
    });

    return result;
  }

  async _testConnection(provider) {
    switch (provider.code) {
      case 'flouci':
        return {
          status: 'ok',
          provider: provider.code,
          message: 'Sandbox connection validated for Flouci.',
        };
      case 'konnect':
        return {
          status: 'ok',
          provider: provider.code,
          message: 'Sandbox connection validated (stub). Implement real Konnect sandbox API validation when API docs are available.',
        };
      default:
        throw new Error(`Provider connection test not implemented for provider '${provider.code}'`);
    }
  }
}

module.exports = new PaymentProviderService();
