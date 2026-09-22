const StorePaymentProvider = require('../../models/payment/StorePaymentProvider');
const StorePaymentProviderMethod = require('../../models/payment/StorePaymentProviderMethod');
const PaymentProvider = require('../../models/payment/PaymentProvider');
const PaymentMethod = require('../../models/payment/PaymentMethod');
const PaymentLog = require('../../models/payment/PaymentLog');
const PaymentRule = require('../../models/payment/PaymentRule');

class StorePaymentProviderService {
  async _getProviderAvailability(providerId, context = {}) {
    const provider = await PaymentProvider.findById(providerId).lean();
    if (!provider || provider.enabled === false || provider.status !== 'active') {
      return false;
    }

    const rules = await PaymentRule.find({
      paymentProviderId: providerId,
      status: 'active',
    }).lean();

    if (!rules.length) return true;

    return rules.some((rule) => {
      if (context.country && rule.countries?.length && !rule.countries.includes(context.country)) {
        return false;
      }
      if (context.currency && rule.currencies?.length && !rule.currencies.includes(context.currency)) {
        return false;
      }
      if (context.planId && rule.planIds?.length && !rule.planIds.some((id) => id.toString() === context.planId.toString())) {
        return false;
      }
      if (context.isSubscription && rule.supportsSubscription === false) {
        return false;
      }
      if (!context.isSubscription && rule.supportsOneTime === false) {
        return false;
      }
      return true;
    });
  }

  async _autoSeedStoreProviders(storeId) {
    const activeProviders = await PaymentProvider.find({ enabled: true, status: 'active' }).lean();
    if (!activeProviders.length) return [];

    const allMethods = await PaymentMethod.find({ status: 'active' }).lean();
    const methodById = new Map(allMethods.map((m) => [m._id.toString(), m]));

    const links = await PaymentMethodProviderLink.find({
      paymentProviderId: { $in: activeProviders.map((p) => p._id) },
      status: 'active',
    })
      .populate('paymentMethodId')
      .lean();

    const linksByProvider = new Map();
    for (const link of links) {
      const pid = link.paymentProviderId.toString();
      if (!linksByProvider.has(pid)) linksByProvider.set(pid, []);
      linksByProvider.get(pid).push(link);
    }

    const created = [];

    for (const provider of activeProviders) {
      const spp = new StorePaymentProvider({
        storeId,
        providerId: provider._id,
        enabled: true,
        settings: {
          testMode: provider.environment === 'sandbox',
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        },
      });
      await spp.save();

      const providerLinks = linksByProvider.get(provider._id.toString()) || [];
      const methodDocs = [];
      for (const link of providerLinks) {
        const method = link.paymentMethodId;
        if (!method || !methodById.has(method._id.toString())) continue;
        methodDocs.push({
          storePaymentProviderId: spp._id,
          paymentMethodId: method._id,
          enabled: true,
          sortOrder: method.displayOrder ?? 0,
        });
      }
      if (methodDocs.length) {
        await StorePaymentProviderMethod.insertMany(methodDocs, { ordered: false });
      }

      created.push(spp);
    }

    return created;
  }

  async getByStoreId(storeId) {
    let records = await StorePaymentProvider.find({ storeId })
      .populate('providerId', 'code name type status enabled compatibleCountries compatibleCurrencies supportsWebhook supportsRefund supportsCapture supportsAuthorization supportsSubscription')
      .sort({ createdAt: -1 })
      .lean();

    if (!records.length) {
      await this._autoSeedStoreProviders(storeId);
      records = await StorePaymentProvider.find({ storeId })
        .populate('providerId', 'code name type status enabled compatibleCountries compatibleCurrencies supportsWebhook supportsRefund supportsCapture supportsAuthorization supportsSubscription')
        .sort({ createdAt: -1 })
        .lean();
    }

    const providerIds = records.map((r) => r.providerId?._id).filter(Boolean);

    const links = await StorePaymentProviderMethod.find({
      storePaymentProviderId: { $in: records.map((r) => r._id) },
    })
      .populate('methodId', 'code name type status displayOrder icon')
      .sort({ sortOrder: 1 })
      .lean();

    return records.map((record) => {
      const methods = links
        .filter((link) => link.storePaymentProviderId.toString() === record._id.toString())
        .map((link) => ({
          id: link.methodId?._id,
          code: link.methodId?.code,
          name: link.methodId?.name,
          type: link.methodId?.type,
          icon: link.methodId?.icon,
          status: link.methodId?.status,
          enabled: link.enabled,
          sortOrder: link.sortOrder,
          config: link.config || {},
        }));

      return {
        id: record._id,
        storeId: record.storeId,
        providerId: record.providerId?._id,
        providerCode: record.providerId?.code,
        providerName: record.providerId?.name,
        providerType: record.providerId?.type,
        providerStatus: record.providerId?.status,
        providerEnabled: record.providerId?.enabled,
        enabled: record.enabled,
        settings: record.settings || {},
        methods,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
  }

  async getOne(storeId, providerId) {
    const record = await StorePaymentProvider.findOne({ storeId, providerId })
      .populate('providerId', 'code name type status enabled')
      .lean();

    if (!record) return null;

    const methods = await StorePaymentProviderMethod.find({
      storePaymentProviderId: record._id,
    })
      .populate('methodId', 'code name type status displayOrder icon')
      .sort({ sortOrder: 1 })
      .lean();

    return {
      id: record._id,
      storeId: record.storeId,
      providerId: record.providerId?._id,
      providerCode: record.providerId?.code,
      providerName: record.providerId?.name,
      providerType: record.providerId?.type,
      enabled: record.enabled,
      settings: record.settings || {},
      methods: methods.map((link) => ({
        id: link.methodId?._id,
        code: link.methodId?.code,
        name: link.methodId?.name,
        type: link.methodId?.type,
        icon: link.methodId?.icon,
        status: link.methodId?.status,
        enabled: link.enabled,
        sortOrder: link.sortOrder,
        config: link.config || {},
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(storeId, providerId, data, actor) {
    const existing = await StorePaymentProvider.findOne({ storeId, providerId }).lean();
    if (existing) {
      const error = new Error('Ce provider est déjà configuré pour ce store');
      error.name = 'DuplicateStoreProvider';
      throw error;
    }

    const provider = await PaymentProvider.findById(providerId).lean();
    if (!provider) {
      const error = new Error('Payment provider introuvable');
      error.name = 'PaymentProviderNotFound';
      throw error;
    }

    const record = new StorePaymentProvider({
      storeId,
      providerId,
      enabled: data.enabled ?? false,
      credentials: data.credentials || {},
      settings: data.settings || {},
      metadata: data.metadata || {},
      createdBy: actor,
      updatedBy: actor,
    });

    await record.save();

    if (Array.isArray(data.methods)) {
      await this._saveMethods(record._id, data.methods);
    }

    await PaymentLog.log({
      module: 'store_payment_providers',
      action: 'create',
      message: `Store payment provider created: ${provider.code} for store ${storeId}`,
      details: { storePaymentProviderId: record._id, storeId, providerId, providerCode: provider.code },
      actorId: actor || null,
      storeId,
      providerId,
    });

    return this.getOne(storeId, providerId);
  }

  async update(storeId, providerId, data, actor) {
    const record = await StorePaymentProvider.findOne({ storeId, providerId });
    if (!record) {
      const error = new Error('Configuration store/provider introuvable');
      error.name = 'StorePaymentProviderNotFound';
      throw error;
    }

    if (data.enabled !== undefined) record.enabled = data.enabled;
    if (data.settings) {
      record.settings = { ...record.settings, ...data.settings };
    }
    if (data.metadata) {
      record.metadata = { ...record.metadata, ...data.metadata };
    }
    if (data.credentials) {
      ENCRYPTED_FIELDS.forEach((field) => {
        if (data.credentials[field] !== undefined) {
          record.credentials[field] = data.credentials[field];
        }
      });
      if (data.credentials.custom) {
        record.credentials.custom = { ...record.credentials.custom, ...data.credentials.custom };
      }
    }
    record.updatedBy = actor;

    await record.save();

    if (Array.isArray(data.methods)) {
      await this._saveMethods(record._id, data.methods);
    }

    await PaymentLog.log({
      module: 'store_payment_providers',
      action: 'update',
      message: `Store payment provider updated: ${providerId} for store ${storeId}`,
      details: { storePaymentProviderId: record._id, storeId, providerId },
      actorId: actor || null,
      storeId,
      providerId,
    });

    return this.getOne(storeId, providerId);
  }

  async remove(storeId, providerId, actor) {
    const record = await StorePaymentProvider.findOne({ storeId, providerId });
    if (!record) {
      const error = new Error('Configuration store/provider introuvable');
      error.name = 'StorePaymentProviderNotFound';
      throw error;
    }

    await StorePaymentProviderMethod.deleteMany({ storePaymentProviderId: record._id });
    await record.deleteOne();

    await PaymentLog.log({
      module: 'store_payment_providers',
      action: 'delete',
      message: `Store payment provider removed: ${providerId} from store ${storeId}`,
      details: { storePaymentProviderId: record._id, storeId, providerId },
      actorId: actor || null,
      storeId,
      providerId,
    });

    return { deleted: true };
  }

  async _saveMethods(storePaymentProviderId, methods) {
    await StorePaymentProviderMethod.deleteMany({ storePaymentProviderId });

    const ops = methods.map((method, index) => ({
      storePaymentProviderId,
      methodId: method.methodId || method.id,
      enabled: method.enabled ?? true,
      sortOrder: method.sortOrder ?? index,
      config: method.config || {},
    }));

    if (ops.length) {
      await StorePaymentProviderMethod.insertMany(ops);
    }
  }

  async getAvailableMethods(storeId, context = {}) {
    let storeProviders = await StorePaymentProvider.find({ storeId, enabled: true })
      .populate('providerId', 'code name type status enabled compatibleCountries compatibleCurrencies')
      .lean();

    if (!storeProviders.length) {
      await this._autoSeedStoreProviders(storeId);
      storeProviders = await StorePaymentProvider.find({ storeId, enabled: true })
        .populate('providerId', 'code name type status enabled compatibleCountries compatibleCurrencies')
        .lean();
    }

    const available = [];

    for (const storeProvider of storeProviders) {
      const provider = storeProvider.providerId;
      if (!provider || provider.enabled === false || provider.status !== 'active') {
        continue;
      }

      const isAvailable = await this._getProviderAvailability(provider._id, context);
      if (!isAvailable) continue;

      const methods = await StorePaymentProviderMethod.find({
        storePaymentProviderId: storeProvider._id,
        enabled: true,
      })
        .populate('methodId', 'code name type status displayOrder icon description supportsRefund supportsPartialPayment supportsSubscription')
        .sort({ sortOrder: 1 })
        .lean();

      available.push({
        providerId: provider._id,
        providerCode: provider.code,
        providerName: provider.name,
        providerType: provider.type,
        settings: storeProvider.settings || {},
        methods: methods.map((link) => ({
          id: link.methodId?._id,
          code: link.methodId?.code,
          name: link.methodId?.name,
          type: link.methodId?.type,
          icon: link.methodId?.icon,
          description: link.methodId?.description,
          status: link.methodId?.status,
          sortOrder: link.sortOrder,
          config: link.config || {},
        })),
      });
    }

    return available;
  }

  async getCredentials(storeId, providerId, actor) {
    const record = await StorePaymentProvider.findOne({ storeId, providerId });
    if (!record) {
      const error = new Error('Configuration store/provider introuvable');
      error.name = 'StorePaymentProviderNotFound';
      throw error;
    }

    await PaymentLog.log({
      module: 'store_payment_providers',
      action: 'credentials_read',
      message: `Credentials accessed for provider ${providerId} on store ${storeId}`,
      details: { storePaymentProviderId: record._id, storeId, providerId },
      actorId: actor || null,
      storeId,
      providerId,
      level: 'warn',
    });

    return {
      credentials: {
        apiKey: record.getApiKey(),
        secretKey: record.getSecretKey(),
        webhookSecret: record.getWebhookSecret(),
        clientId: record.getClientId(),
        clientSecret: record.getClientSecret(),
        appToken: record.getAppToken(),
        appSecret: record.getAppSecret(),
        merchantId: record.getMerchantId(),
        terminalId: record.getTerminalId(),
        password: record.getPassword(),
        custom: record.credentials.custom || {},
      },
      settings: record.settings,
    };
  }

  async testConnection(storeId, providerId, actor) {
    const record = await StorePaymentProvider.findOne({ storeId, providerId })
      .populate('providerId', 'code name type endpoint')
      .lean();

    if (!record) {
      const error = new Error('Configuration store/provider introuvable');
      error.name = 'StorePaymentProviderNotFound';
      throw error;
    }

    const provider = record.providerId;
    if (!provider) {
      const error = new Error('Payment provider introuvable');
      error.name = 'PaymentProviderNotFound';
      throw error;
    }

    await PaymentLog.log({
      module: 'store_payment_providers',
      action: 'test_connection',
      message: `Connection test for ${provider.code} on store ${storeId}`,
      details: { storePaymentProviderId: record._id, storeId, providerId, providerCode: provider.code },
      actorId: actor || null,
      storeId,
      providerId,
    });

    return {
      success: true,
      message: `Connexion ${provider.code} OK (simulated)`,
      providerCode: provider.code,
      testedAt: new Date(),
    };
  }
}


