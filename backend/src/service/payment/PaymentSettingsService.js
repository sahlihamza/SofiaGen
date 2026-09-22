const PaymentGlobalSettings = require('../../models/payment/PaymentGlobalSettings');
const PaymentLog = require('../../models/payment/PaymentLog');

class PaymentSettingsService {
  async getByKey(key) {
    return PaymentGlobalSettings.findOne({ key });
  }

  async getAll(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;

    return PaymentGlobalSettings.find(query)
      .sort({ category: 1, key: 1 })
      .lean();
  }

  async getSettingsByCategory(category) {
    return PaymentGlobalSettings.find({ category }).sort({ key: 1 }).lean();
  }

  async set(key, value, type, category, description, actor) {
    const settings = new PaymentGlobalSettings({
      key,
      value,
      type,
      category,
      description,
      createdBy: actor,
      updatedBy: actor,
    });

    await settings.save();

    await PaymentLog.log({
      module: 'settings',
      action: 'create',
      message: `Payment global setting created: ${key}`,
      details: { key, value, type, category },
      actorId: actor,
    });

    return settings;
  }

  async upsert(key, value, type, category, description, actor) {
    let settings = await PaymentGlobalSettings.findOne({ key });

    if (!settings) {
      settings = new PaymentGlobalSettings({
        key,
        value,
        type,
        category,
        description,
        createdBy: actor,
        updatedBy: actor,
      });

      await PaymentLog.log({
        module: 'settings',
        action: 'create',
        message: `Payment global setting created: ${key}`,
        details: { key, value, type, category },
        actorId: actor,
      });
    } else {
      settings.value = value;
      settings.type = type;
      settings.category = category;
      if (description !== undefined) settings.description = description;
      settings.updatedBy = actor;

      await PaymentLog.log({
        module: 'settings',
        action: 'update',
        message: `Payment global setting updated: ${key}`,
        details: { key, value, type, category },
        actorId: actor,
      });
    }

    await settings.save();
    return settings;
  }

  async delete(key, actor) {
    const settings = await PaymentGlobalSettings.findOne({ key });
    if (!settings) throw new Error('Setting not found');

    await PaymentGlobalSettings.findOneAndDelete({ key });

    await PaymentLog.log({
      module: 'settings',
      action: 'delete',
      message: `Payment global setting deleted: ${key}`,
      details: { key },
      actorId: actor,
    });

    return settings;
  }
}

module.exports = new PaymentSettingsService();
