const ProductSettings = require("../models/ProductSettings");

class ProductSettingsService {
  async getByStoreId(storeId) {
    return await ProductSettings.findOne({ storeId });
  }

  async upsertByStoreId(storeId, data) {
    const { storeId: _ignored, ...update } = data;

    return await ProductSettings.findOneAndUpdate(
      { storeId },
      { $set: update, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new ProductSettingsService();
