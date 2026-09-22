const StoreCarrierProvider = require('../../models/shipping/StoreCarrierProvider');
const CarrierProvider = require('../../models/shipping/CarrierProvider');

class StoreCarrierProviderService {
  /**
   * Connect (or update) a carrier for a store.
   * Upserts on {storeId, carrierProviderId} index.
   * Validates that the CarrierProvider is active at the platform level.
   */
  async connectCarrier(storeId, carrierProviderId, credentials, actor) {
    const carrierProvider = await CarrierProvider.findById(carrierProviderId);
    if (!carrierProvider) {
      throw new Error('Carrier provider not found');
    }
    if (!carrierProvider.isActive) {
      throw new Error('Cannot connect to an inactive carrier provider. Please ensure the carrier is enabled at the platform level.');
    }

    const storeCarrier = await StoreCarrierProvider.findOneAndUpdate(
      { storeId, carrierProviderId },
      {
        storeId,
        carrierProviderId,
        credentials,
        hasLabelGeneration: carrierProvider.hasLabelGeneration,
        hasTracking: carrierProvider.hasTracking,
        isActive: true,
        updatedBy: actor,
      },
      { upsert: true, new: true }
    );

    return this._sanitizeStoreCarrier(storeCarrier);
  }

  /**
   * Get all carrier providers for a store, merged with store-specific configuration.
   * Returns platform carriers (if active) with connected status.
   * "Livraison Personnelle" (isInternalFleet) always first, then alphabetical by name.
   */
  async getStoreCarriers(storeId) {
    // Fetch all active platform carriers
    const platformCarriers = await CarrierProvider.find({ isActive: true }).sort({ isInternalFleet: -1, name: 1 }).lean();

    // Fetch store's carrier connections
    const storeConnections = await StoreCarrierProvider.find({
      storeId,
      isActive: true,
    }).lean();

    const connectionMap = {};
    storeConnections.forEach((conn) => {
      connectionMap[conn.carrierProviderId.toString()] = conn;
    });

    // Merge: platform carriers with store-specific data
    const result = platformCarriers.map((carrier) => {
      const connection = connectionMap[carrier._id.toString()];
      return {
        _id: carrier._id,
        name: carrier.name,
        description: carrier.description,
        logoUrl: carrier.logoUrl,
        brandColor: carrier.brandColor,
        adapterKey: carrier.adapterKey,
        isInternalFleet: carrier.isInternalFleet,
        countriesCovered: carrier.countriesCovered,
        // From connection (if exists)
        connected: !!connection,
        hasLabelGeneration: connection ? connection.hasLabelGeneration : false,
        hasTracking: connection ? connection.hasTracking : false,
        storeCarrierProviderId: connection ? connection._id : null,
      };
    });

    return result;
  }

  /**
   * Disconnect a carrier for a store (sets isActive=false, keeps history).
   */
  async disconnectCarrier(storeId, carrierProviderId, actor) {
    const storeCarrier = await StoreCarrierProvider.findOne({ storeId, carrierProviderId });
    if (!storeCarrier) {
      throw new Error('Carrier connection not found');
    }

    storeCarrier.isActive = false;
    if (actor) {
      storeCarrier.updatedBy = actor;
    }
    await storeCarrier.save();

    return this._sanitizeStoreCarrier(storeCarrier);
  }

  /**
   * Update capabilities for a store's carrier connection.
   * Phase 2 limitation: these are set manually or via basic checks.
   * Real capability testing via adapter calls comes in Phase 5.
   */
  async updateCapabilities(storeId, carrierProviderId, { hasLabelGeneration, hasTracking }, actor) {
    const storeCarrier = await StoreCarrierProvider.findOne({ storeId, carrierProviderId });
    if (!storeCarrier) {
      throw new Error('Carrier connection not found');
    }

    if (hasLabelGeneration !== undefined) {
      storeCarrier.hasLabelGeneration = Boolean(hasLabelGeneration);
    }
    if (hasTracking !== undefined) {
      storeCarrier.hasTracking = Boolean(hasTracking);
    }

    if (actor) {
      storeCarrier.updatedBy = actor;
    }
    await storeCarrier.save();

    return this._sanitizeStoreCarrier(storeCarrier);
  }

  /**
   * Get a specific store's carrier connection (internal use, doesn't return full sanitized response).
   */
  async getStoreCarrierConnection(storeId, carrierProviderId) {
    return StoreCarrierProvider.findOne({ storeId, carrierProviderId });
  }

  /**
   * Sanitize response: mask credentials, remove sensitive fields.
   */
  _sanitizeStoreCarrier(storeCarrier) {
    if (!storeCarrier) return storeCarrier;
    const sanitized = storeCarrier.toObject ? storeCarrier.toObject() : { ...storeCarrier };
    // toObject already applies the transform with credential masking
    return sanitized;
  }
}

module.exports = new StoreCarrierProviderService();
