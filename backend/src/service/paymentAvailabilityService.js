const Store = require("../models/Store");
const Plan = require("../models/Plan");
const GeneralSettings = require("../models/GeneralSettings");
const PaymentSettingsService = require("./paymentSettingsService");
const PaymentMethod = require("../models/payment/PaymentMethod");
const PaymentMethodProviderLink = require("../models/payment/PaymentMethodProviderLink");
const PaymentRule = require("../models/payment/PaymentRule");
const StorePaymentProvider = require("../models/payment/StorePaymentProvider");
const StorePaymentProviderMethod = require("../models/payment/StorePaymentProviderMethod");

const buildProviderRuleMap = (rules) => {
  return rules.reduce((acc, rule) => {
    const providerId = rule.paymentProviderId?.toString();
    if (!providerId) return acc;
    acc[providerId] = acc[providerId] || [];
    acc[providerId].push(rule);
    return acc;
  }, {});
};

const isProviderActive = (provider) => provider && provider.status === "active" && provider.enabled !== false;

const ruleAllowsSubscription = (rule, isSubscription) => {
  if (isSubscription) return rule.supportsSubscription !== false;
  return rule.supportsOneTime !== false;
};

const ruleMatchesCountry = (rule, country) => {
  if (!Array.isArray(rule.countries) || rule.countries.length === 0) return true;
  return country && rule.countries.includes(country);
};

const ruleMatchesCurrency = (rule, currency) => {
  if (!Array.isArray(rule.currencies) || rule.currencies.length === 0) return true;
  return currency && rule.currencies.includes(currency);
};

const ruleMatchesPlan = (rule, planId) => {
  if (!Array.isArray(rule.planIds) || rule.planIds.length === 0) return true;
  if (!planId) return false;
  return rule.planIds.some((id) => id.toString() === planId.toString());
};

const isRuleActive = (rule) => rule.status === "active";

const isRuleAllowedForContext = (rule, context) => {
  return (
    isRuleActive(rule) &&
    ruleAllowsSubscription(rule, context.isSubscription) &&
    ruleMatchesCountry(rule, context.country) &&
    ruleMatchesCurrency(rule, context.currency) &&
    ruleMatchesPlan(rule, context.planId)
  );
};

const providerMatchesContext = (provider, rules, context) => {
  if (!isProviderActive(provider)) return false;
  if (context.isSubscription && provider.supportsSubscription === false) return false;
  if (!rules.length) return true;

  return rules.some((rule) => isRuleAllowedForContext(rule, context));
};

const getAvailablePaymentMethodsForStore = async (storeId, planId, options = {}) => {
  let store = null;
  let currency = "USD";
  let country = null;

  if (storeId) {
    store = await Store.findById(storeId).lean();
    if (!store) {
      const error = new Error("Store not found");
      error.name = "StoreNotFound";
      throw error;
    }
    const plan = planId ? await Plan.findById(planId).lean() : null;
    currency = plan?.pricing?.currency || store.currency || "USD";
    country = store.country || null;
  }
  const context = {
    planId: store?.planId,
    currency,
    country,
    isSubscription: options.isSubscription !== false,
  };

  const settings = storeId
    ? await PaymentSettingsService.getByStoreId(storeId)
    : { methods: [] };

  const enabledKeys = settings.methods
    .filter((method) => method.enabled)
    .map((method) => method.key);

  let methods;
  if (!enabledKeys.length && !storeId) {
    methods = await PaymentMethod.find({ status: "active" }).sort({ displayOrder: 1 }).lean();
  } else {
    methods = await PaymentMethod.find({
      code: { $in: enabledKeys },
      status: "active",
    })
      .sort({ displayOrder: 1 })
      .lean();
  }

  const methodKeysToSettings = settings.methods.reduce((acc, method) => {
    acc[method.key] = method;
    return acc;
  }, {});

  const links = await PaymentMethodProviderLink.find({
    paymentMethodId: { $in: methods.map((method) => method._id) },
    status: "active",
  })
    .populate("paymentProviderId")
    .lean();

  const providerIds = [...new Set(links.map((link) => link.paymentProviderId?._id?.toString()).filter(Boolean))];
  const rules = await PaymentRule.find({
    paymentProviderId: { $in: providerIds },
    status: "active",
  }).lean();
  const rulesByProvider = buildProviderRuleMap(rules);

  const methodsWithProviders = methods.map((method) => {
    const settingsForMethod = methodKeysToSettings[method.code] || {};
    const methodLinks = links.filter(
      (link) => link.paymentMethodId.toString() === method._id.toString()
    );

    const providers = methodLinks
      .map((link) => {
        const provider = link.paymentProviderId;
        if (!provider) return null;

        const providerRules = rulesByProvider[provider._id.toString()] || [];
        const providerIsValid = providerMatchesContext(provider, providerRules, context);
        if (!providerIsValid) {
          return null;
        }

        return {
          id: provider._id,
          code: provider.code,
          name: provider.name,
          logo: provider.logo,
          status: provider.status,
          supportsSubscription: provider.supportsSubscription,
          supportsRefund: provider.supportsRefund,
          priority: link.priority || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority);

    return {
      id: method._id,
      code: method.code,
      name: method.name,
      description: method.description,
      type: method.type,
      icon: method.icon,
      status: method.status,
      compatibleCountries: method.compatibleCountries,
      compatibleCurrencies: method.compatibleCurrencies,
      enabled: settingsForMethod.enabled || false,
      order: settingsForMethod.order ?? method.displayOrder,
      config: settingsForMethod.config || {},
      providers,
      isAvailable: providers.length > 0 || method.type === "offline",
    };
  });

  return methodsWithProviders.sort((a, b) => a.order - b.order);
};

const getStorePaymentProviders = async (storeId) => {
  return StorePaymentProvider.find({ storeId, enabled: true })
    .populate("providerId", "code name type status enabled")
    .lean();
};

const getStoreProviderMethods = async (storePaymentProviderIds) => {
  return StorePaymentProviderMethod.find({
    storePaymentProviderId: { $in: storePaymentProviderIds },
    enabled: true,
  })
    .populate("methodId", "code name type status displayOrder icon")
    .sort({ sortOrder: 1 })
    .lean();
};

const getAvailablePaymentMethodsForStoreModern = async (storeId, planId, options = {}) => {
  let store = null;
  let currency = "USD";
  let country = null;

  if (storeId) {
    store = await Store.findById(storeId).lean();
    if (!store) {
      const error = new Error("Store not found");
      error.name = "StoreNotFound";
      throw error;
    }
    const plan = planId ? await Plan.findById(planId).lean() : null;
    currency = plan?.pricing?.currency || store.currency || "USD";
    country = store.country || null;
  }
  const context = {
    planId: store?.planId,
    currency,
    country,
    isSubscription: options.isSubscription !== false,
  };

  const storeProviders = await getStorePaymentProviders(storeId);
  if (!storeProviders.length) {
    return getAvailablePaymentMethodsForStore(storeId, planId, options);
  }

  const availableMethods = new Map();
  const providerRulesMap = new Map();

  for (const storeProvider of storeProviders) {
    const provider = storeProvider.providerId;
    if (!provider || provider.enabled === false || provider.status !== "active") {
      continue;
    }

    const rules = await PaymentRule.find({
      paymentProviderId: provider._id,
      status: "active",
    }).lean();
    const providerRules = rules.filter((rule) => isRuleAllowedForContext(rule, context));
    if (!providerRules.length && rules.length > 0) {
      continue;
    }
    providerRulesMap.set(provider._id.toString(), providerRules);

    const sppMethods = await StorePaymentProviderMethod.find({
      storePaymentProviderId: storeProvider._id,
      enabled: true,
    })
      .populate("methodId")
      .sort({ sortOrder: 1 })
      .lean();

    for (const sppMethod of sppMethods) {
      const method = sppMethod.methodId;
      if (!method || method.status !== "active") continue;

      if (!availableMethods.has(method._id.toString())) {
        availableMethods.set(method._id.toString(), {
          id: method._id,
          code: method.code,
          name: method.name,
          description: method.description,
          type: method.type,
          icon: method.icon,
          status: method.status,
          compatibleCountries: method.compatibleCountries,
          compatibleCurrencies: method.compatibleCurrencies,
          enabled: true,
          order: sppMethod.sortOrder ?? method.displayOrder,
          config: sppMethod.config || {},
          providers: [],
          isAvailable: true,
        });
      }

      const methodEntry = availableMethods.get(method._id.toString());
      methodEntry.providers.push({
        id: provider._id,
        code: provider.code,
        name: provider.name,
        logo: provider.logo,
        status: provider.status,
        supportsSubscription: provider.supportsSubscription,
        supportsRefund: provider.supportsRefund,
        priority: 0,
      });
    }
  }

  return Array.from(availableMethods.values()).sort((a, b) => a.order - b.order);
};

module.exports = {
  getAvailablePaymentMethodsForStore,
  getAvailablePaymentMethodsForStoreModern,
};
