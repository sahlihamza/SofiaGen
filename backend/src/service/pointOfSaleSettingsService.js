const PointOfSaleSettings = require("../models/PointOfSaleSettings");
const auditLogService = require("./auditLogService");
const { diffFields, formatDiffSummary } = require("../utils/auditDiff");

class PointOfSaleSettingsService {
  async getByStoreId(storeId) {
    let settings = await PointOfSaleSettings.findOne({ storeId });

    if (!settings) {
      try {
        settings = await PointOfSaleSettings.create({ storeId });
      } catch (error) {
        // Two requests racing to create a brand-new store's document.
        if (error.code !== 11000) throw error;
        settings = await PointOfSaleSettings.findOne({ storeId });
        if (!settings) throw error;
      }
    }

    return settings;
  }

  async upsertByStoreId(storeId, updates = {}, actor = null) {
    const { storeName, physicalAddress, phone, email, refundPolicy } = updates;

    const current = await this.getByStoreId(storeId);
    const before = current.toObject();

    const merged = {
      storeName: storeName !== undefined ? storeName : current.storeName,
      physicalAddress:
        physicalAddress !== undefined ? physicalAddress : current.physicalAddress,
      phone: phone !== undefined ? phone : current.phone,
      email: email !== undefined ? email : current.email,
      refundPolicy: refundPolicy !== undefined ? refundPolicy : current.refundPolicy,
    };

    const settings = await PointOfSaleSettings.findOneAndUpdate(
      { storeId },
      { $set: merged, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const changes = diffFields(before, merged);
    if (changes.length > 0) {
      await auditLogService.log({
        storeId,
        action: "settings_updated",
        entityType: "PointOfSaleSettings",
        entityId: String(settings._id),
        summary: `Point de vente : ${formatDiffSummary(changes)}`,
        metadata: { changes },
        actor,
      });
    }

    return settings;
  }
}

module.exports = new PointOfSaleSettingsService();
