const StorePaymentProviderService = require('./payment/StorePaymentProviderService');
const PaymentSettingsService = require('./paymentSettingsService');
const PaymentMethod = require('../models/payment/PaymentMethod');
const { DEFAULT_PAYMENT_METHODS, isOfflinePaymentMethod, publicPaymentConfig } = require('../utils/paymentMethods');

const buildLegacyMethod = (method) => ({
  key: method.key,
  title: method.title,
  description: method.description,
  enabled: method.enabled,
  order: method.order,
  config: publicPaymentConfig(method.config || {}),
  isOffline: isOfflinePaymentMethod(method.key),
});

const buildModernMethod = (method, provider) => ({
  key: method.code,
  title: typeof method.name === 'object' ? method.name.en || method.code : method.name || method.code,
  description: typeof method.description === 'object' ? method.description.en || '' : method.description || '',
  enabled: method.enabled !== false,
  order: method.sortOrder ?? 0,
  config: publicPaymentConfig(method.config || {}),
  isOffline: isOfflinePaymentMethod(method.code),
  provider: provider ? {
    id: provider.id,
    code: provider.code,
    name: provider.name,
    type: provider.type,
  } : undefined,
});

class CheckoutPaymentService {
  async getAvailableMethodsForStore(storeId, context = {}) {
    try {
      const available = await StorePaymentProviderService.getAvailableMethods(storeId, context);
      if (available.length > 0) {
        const methods = [];
        const seen = new Set();
        for (const provider of available) {
          for (const method of provider.methods || []) {
            const key = method.code;
            if (seen.has(key)) continue;
            seen.add(key);
            methods.push(buildModernMethod(method, {
              id: provider.providerId,
              code: provider.providerCode,
              name: provider.providerName,
              type: provider.providerType,
            }));
          }
        }
        return methods.sort((a, b) => a.order - b.order);
      }
    } catch (err) {
      console.warn(`[CheckoutPaymentService] Modern path failed, falling back to legacy: ${err.message}`);
    }

    const legacySettings = await PaymentSettingsService.getByStoreId(storeId);
    const enabledMethods = (legacySettings.methods || [])
      .filter((method) => method.enabled)
      .map(buildLegacyMethod);

    return enabledMethods.sort((a, b) => a.order - b.order);
  }

  async getPaymentMethodByKey(storeId, key) {
    const methods = await this.getAvailableMethodsForStore(storeId);
    return methods.find((method) => method.key === key) || null;
  }

  async getCheckoutPaymentContext(storeId, context = {}) {
    const methods = await this.getAvailableMethodsForStore(storeId, context);
    return {
      paymentMethods: methods.map((method) => ({
        key: method.key,
        title: method.title,
        description: method.description,
        isOffline: method.isOffline,
        config: method.config,
        provider: method.provider,
      })),
      enabledMethods: methods,
    };
  }
}

const checkoutPaymentService = new CheckoutPaymentService();

module.exports = checkoutPaymentService;
