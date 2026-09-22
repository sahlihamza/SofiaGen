const GeneralSettings = require("../models/GeneralSettings");
const Store = require("../models/Store");
const Country = require("../models/Country");
const Currency = require("../models/Currency");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class GeneralSettingsService {
  async getByStoreId(storeId) {
    return await GeneralSettings.findOne({ storeId })
      .populate("countryId")
      .populate("currencyId")
      .populate("sellingCountries")
      .populate("shippingCountries");
  }

  async provisionDefaults(storeId) {
    const store = await Store.findById(storeId).select("name address");
    if (!store) return null;

    const [country, currency] = await Promise.all([
      Country.findOne({ iso2: "TN" }).then((found) => found || Country.findOne()),
      Currency.findOne(),
    ]);

    if (!country || !currency) return null;

    return await GeneralSettings.create({
      storeId,
      storeName: store.name || "My Store",
      addressLine1: store.address || "N/A",
      city: "N/A",
      postcode: "N/A",
      countryId: country._id,
      sellingCountries: [country._id],
      shippingCountries: [country._id],
      currencyId: currency._id,
      defaultCustomerAddress: "base",
      timezone: "UTC",
      weightUnit: "kg",
      dimensionUnit: "cm",
      dateFormat: "D MMM, YYYY",
    });
  }

  async upsertByStoreId(storeId, data) {
    const { storeId: _ignored, ...update } = data;

    if (update.storeName && update.storeName.trim()) {
      const name = update.storeName.trim();
      const conflict = await Store.findOne({
        _id: { $ne: storeId },
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      });

      if (conflict) {
        const error = new Error(
          `A store named "${name}" already exists. Please choose a different name.`
        );
        error.name = "DuplicateStoreName";
        throw error;
      }

      await Store.findByIdAndUpdate(storeId, { name });
    }

    return await GeneralSettings.findOneAndUpdate(
      { storeId },
      { $set: update, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )
      .populate("countryId")
      .populate("currencyId")
      .populate("sellingCountries")
      .populate("shippingCountries");
  }
}

module.exports = new GeneralSettingsService();
