const ShippingSettings = require("../models/ShippingSettings");

class ShippingSettingsService {
  async getByStoreId(storeId) {
    let settings = await ShippingSettings.findOne({ storeId });

    if (!settings) {
      try {
        settings = await ShippingSettings.create({ storeId });
      } catch (error) {
        if (error.code !== 11000) throw error;
        settings = await ShippingSettings.findOne({ storeId });
        if (!settings) throw error;
      }
    }

    return settings;
  }

  async upsertByStoreId(storeId, data) {
    const { storeId: _ignored, ...update } = data;

    return await ShippingSettings.findOneAndUpdate(
      { storeId },
      { $set: update, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new ShippingSettingsService();
