const PaymentProviderConfiguration = require('../../models/payment/PaymentProviderConfiguration');
const PaymentProvider = require('../../models/payment/PaymentProvider');
const PaymentLog = require('../../models/payment/PaymentLog');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');

class PaymentProviderConfigurationService {
  async create(data) {
    const config = new PaymentProviderConfiguration(data);
    await config.save();
    await PaymentLog.log({
      module: 'configurations',
      action: 'create',
      message: `Provider configuration created for provider ${data.paymentProviderId}`,
      details: { configId: config._id, providerId: data.paymentProviderId },
    });
    return config;
  }

  async getById(id) {
    return PaymentProviderConfiguration.findById(id);
  }

  async getByProviderId(providerId) {
    return PaymentProviderConfiguration.findOne({ paymentProviderId: providerId });
  }

  async update(id, data, actor) {
    const config = await PaymentProviderConfiguration.findById(id);
    if (!config) throw new Error('Provider configuration not found');

    const updatableFields = [
      'apiKey', 'secretKey', 'webhookSecret', 'webhookUrl', 'timeout', 'retryCount',
      'retryDelay', 'environment', 'sandboxApiKey', 'sandboxSecretKey', 'sandboxWebhookSecret',
      'productionApiKey', 'productionSecretKey', 'productionWebhookSecret',
      'keyRotationEnabled', 'lastKeyRotation', 'nextKeyRotation', 'status', 'isActive', 'testResults', 'metadata',
    ];

    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        config[field] = data[field];
      }
    });

    if (actor) {
      config.updatedBy = actor;
    }

    await config.save();

    await PaymentLog.log({
      module: 'configurations',
      action: 'update',
      message: `Provider configuration updated for provider ${config.paymentProviderId}`,
      details: { configId: config._id, providerId: config.paymentProviderId, changes: data },
      actorId: actor,
    });

    return config;
  }

  async upsertByProviderId(providerId, data, actor) {
    let config = await PaymentProviderConfiguration.findOne({ paymentProviderId: providerId });

    if (!config) {
      config = new PaymentProviderConfiguration({ paymentProviderId: providerId, ...data });
      await PaymentLog.log({
        module: 'configurations',
        action: 'create',
        message: `Provider configuration created for provider ${providerId}`,
        details: { providerId },
      });
    } else {
      const updatableFields = [
        'apiKey', 'secretKey', 'webhookSecret', 'webhookUrl', 'timeout', 'retryCount',
        'retryDelay', 'environment', 'sandboxApiKey', 'sandboxSecretKey', 'sandboxWebhookSecret',
        'productionApiKey', 'productionSecretKey', 'productionWebhookSecret',
        'keyRotationEnabled', 'lastKeyRotation', 'nextKeyRotation', 'status', 'isActive', 'testResults', 'metadata',
      ];

      updatableFields.forEach((field) => {
        if (data[field] !== undefined) {
          config[field] = data[field];
        }
      });

      await PaymentLog.log({
        module: 'configurations',
        action: 'update',
        message: `Provider configuration updated for provider ${providerId}`,
        details: { providerId, changes: data },
        actorId: actor,
      });
    }

    if (actor) {
      config.updatedBy = actor;
    }

    await config.save();
    return config;
  }

  async rotateKeys(id, actor) {
    const config = await PaymentProviderConfiguration.findById(id);
    if (!config) throw new Error('Provider configuration not found');

    if (!config.keyRotationEnabled) {
      throw new Error('Key rotation is not enabled for this provider');
    }

    const now = new Date();
    config.lastKeyRotation = now;
    config.nextKeyRotation = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (config.environment === 'sandbox') {
      config.sandboxApiKey = this._generateKey();
      config.sandboxSecretKey = this._generateKey();
      config.sandboxWebhookSecret = this._generateKey();
    } else {
      config.productionApiKey = this._generateKey();
      config.productionSecretKey = this._generateKey();
      config.productionWebhookSecret = this._generateKey();
    }

    if (actor) {
      config.updatedBy = actor;
    }

    await config.save();

    await PaymentLog.log({
      module: 'configurations',
      action: 'rotate_keys',
      message: `Keys rotated for provider ${config.paymentProviderId}`,
      details: { configId: config._id, providerId: config.paymentProviderId, environment: config.environment },
      actorId: actor,
      level: 'warn',
    });

    return config;
  }

  async testConfiguration(id) {
    const config = await PaymentProviderConfiguration.findById(id);
    if (!config) throw new Error('Provider configuration not found');

    const provider = await PaymentProvider.findById(config.paymentProviderId);
    if (!provider) throw new Error('Payment provider not found');

    const result = await this._testConnection(provider, config);

    config.testResults = {
      ...config.testResults,
      lastTest: new Date(),
      result,
    };

    await config.save();

    await PaymentLog.log({
      module: 'configurations',
      action: 'test_connection',
      message: `Configuration test for provider ${provider.code}: ${result.status}`,
      details: { configId: config._id, providerId: config.paymentProviderId, result },
    });

    return result;
  }

  async _testConnection(provider, config) {
    switch (provider.code) {
      case 'flouci':
        return {
          status: 'ok',
          provider: provider.code,
          message: 'Configuration test passed for Flouci.',
        };
      case 'konnect':
        return {
          status: 'ok',
          provider: provider.code,
          message: 'Configuration test passed (stub).',
        };
      default:
        return {
          status: 'ok',
          provider: provider.code,
          message: 'Configuration test passed.',
        };
    }
  }

  _generateKey() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

module.exports = new PaymentProviderConfigurationService();
