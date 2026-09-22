const PaymentSettings = require("../models/PaymentSettings");
const PaymentMethod = require("../models/payment/PaymentMethod");
const { DEFAULT_PAYMENT_METHODS } = require("../utils/paymentMethods");

class PaymentSettingsService {
  async getByStoreId(storeId) {
    let settings = await PaymentSettings.findOne({ storeId });

    if (!settings) {
      settings = await PaymentSettings.create({
        storeId,
        methods: DEFAULT_PAYMENT_METHODS,
      });

      return this._sorted(settings);
    }

    // A gateway added to the catalogue after this store was set up is absent
    // from its document, so the admin would never see it. It is appended
    // disabled, at the end, leaving the order the store chose untouched.
    const configured = new Set(settings.methods.map((method) => method.key));
    const missing = DEFAULT_PAYMENT_METHODS.filter(
      (method) => !configured.has(method.key)
    );

    if (missing.length > 0) {
      const lastOrder = settings.methods.reduce(
        (highest, method) => Math.max(highest, method.order),
        -1
      );

      missing.forEach((method, index) => {
        settings.methods.push({ ...method, order: lastOrder + 1 + index });
      });

      await settings.save();
    }

    return this._sorted(settings);
  }

  async upsertByStoreId(storeId, methods) {
    await this._validateMethods(storeId, methods);

    const settings = await PaymentSettings.findOneAndUpdate(
      { storeId },
      { $set: { methods }, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return this._sorted(settings);
  }

  async toggleMethod(storeId, key, enabled) {
    const settings = await this.getByStoreId(storeId);
    const validKeys = await this._getValidMethodKeys(settings.methods.map((m) => m.key));

    if (!validKeys.has(key)) {
      const error = new Error(`Moyen de paiement inconnu: ${key}`);
      error.name = "UnknownPaymentMethod";
      throw error;
    }

    const method = settings.methods.find((m) => m.key === key);

    if (!method) {
      const error = new Error(`Moyen de paiement introuvable: ${key}`);
      error.name = "PaymentMethodNotFound";
      throw error;
    }

    method.enabled = enabled;
    await settings.save();

    return this._sorted(settings);
  }

  async reorderMethods(storeId, orderedKeys) {
    const settings = await this.getByStoreId(storeId);
    const existingKeys = settings.methods.map((m) => m.key);
    const validKeys = await this._getValidMethodKeys(existingKeys);

    const unknownKey = orderedKeys.find((key) => !validKeys.has(key));
    if (unknownKey) {
      const error = new Error(`Moyen de paiement inconnu: ${unknownKey}`);
      error.name = "UnknownPaymentMethod";
      throw error;
    }

    const sameSet =
      orderedKeys.length === existingKeys.length &&
      existingKeys.every((k) => orderedKeys.includes(k));

    if (!sameSet) {
      const error = new Error(
        "La liste réordonné doit contenir exactement les mêmes moyens de paiement"
      );
      error.name = "InvalidReorder";
      throw error;
    }

    settings.methods.forEach((method) => {
      method.order = orderedKeys.indexOf(method.key);
    });

    await settings.save();

    return this._sorted(settings);
  }

  async _validateMethods(storeId, methods) {
    if (!Array.isArray(methods)) {
      const error = new Error("methods doit être un tableau");
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    const keys = methods.map((m) => m.key);
    const existingSettings = await PaymentSettings.findOne({ storeId }).lean();
    const existingKeys = existingSettings?.methods?.map((m) => m.key) || [];
    const validKeys = await this._getValidMethodKeys(existingKeys);

    const invalidKey = keys.find((key) => !validKeys.has(key));

    if (invalidKey) {
      const error = new Error(`Moyen de paiement inconnu: ${invalidKey}`);
      error.name = "UnknownPaymentMethod";
      throw error;
    }

    const hasDuplicates = new Set(keys).size !== keys.length;
    if (hasDuplicates) {
      const error = new Error("Les moyens de paiement doivent être uniques");
      error.name = "DuplicatePaymentMethod";
      throw error;
    }
  }

  async _getValidMethodKeys(existingKeys = []) {
    const catalogMethods = await PaymentMethod.find({ status: "active" }).select("code").lean();
    const activeKeys = catalogMethods.map((method) => method.code);
    return new Set([...activeKeys, ...existingKeys]);
  }

  async _getDefaultMethods() {
    const methods = await PaymentMethod.find({ status: "active" }).sort({ displayOrder: 1 }).lean();
    if (!methods.length) {
      return DEFAULT_PAYMENT_METHODS;
    }

    return methods.map((method, index) => ({
      key: method.code,
      title:
        typeof method.name === "object"
          ? method.name.en || method.code
          : method.name || method.code,
      description:
        typeof method.description === "object"
          ? method.description.en || ""
          : method.description || "",
      enabled: false,
      order: method.displayOrder ?? index,
      config: {},
    }));
  }

  _sorted(settings) {
    settings.methods = [...settings.methods].sort((a, b) => a.order - b.order);
    return settings;
  }
}

module.exports = new PaymentSettingsService();
