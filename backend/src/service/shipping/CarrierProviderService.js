const CarrierProvider = require('../../models/shipping/CarrierProvider');
const StoreCarrierProvider = require('../../models/shipping/StoreCarrierProvider');
const Shipment = require('../../models/shipping/Shipment');

const sanitizeProvider = (provider) => {
  if (!provider) return provider;
  const sanitized = provider.toObject ? provider.toObject() : { ...provider };
  delete sanitized.webhookSecret;
  return sanitized;
};

class CarrierProviderService {
  async create(data, actor) {
    if (data.isInternalFleet) {
      const existingInternal = await CarrierProvider.findOne({ isInternalFleet: true });
      if (existingInternal) {
        throw new Error('Un seul transporteur "Livraison Personnelle" (isInternalFleet=true) peut exister  la fois');
      }
    }

    const provider = new CarrierProvider({
      ...data,
      createdBy: actor || undefined,
    });

    await provider.save();
    return sanitizeProvider(provider);
  }

  async getById(id) {
    const provider = await CarrierProvider.findById(id).lean();
    return sanitizeProvider(provider);
  }

  async getAll(filters = {}) {
    const query = {};

    if (filters.adapterKey) query.adapterKey = filters.adapterKey;
    if (filters.isActive !== undefined) query.isActive = filters.isActive === true || filters.isActive === 'true';
    if (filters.isInternalFleet !== undefined) {
      query.isInternalFleet = filters.isInternalFleet === true || filters.isInternalFleet === 'true';
    }
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
      ];
    }
    if (filters.country) {
      query.countriesCovered = filters.country;
    }

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      CarrierProvider.find(query)
        .select('-webhookSecret')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CarrierProvider.countDocuments(query),
    ]);

    return {
      data: providers.map(sanitizeProvider),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async update(id, data, actor) {
    const provider = await CarrierProvider.findById(id);
    if (!provider) throw new Error('Carrier provider not found');

    if (data.isInternalFleet === true && !provider.isInternalFleet) {
      const existingInternal = await CarrierProvider.findOne({ isInternalFleet: true, _id: { $ne: id } });
      if (existingInternal) {
        throw new Error('Un seul transporteur "Livraison Personnelle" (isInternalFleet=true) peut exister  la fois');
      }
    }

    const updatableFields = [
      'name', 'description', 'logoUrl', 'brandColor', 'countriesCovered',
      'mode', 'endpoint', 'webhookSecret', 'hasLabelGeneration', 'hasTracking',
      'adapterKey', 'isActive', 'isInternalFleet', 'metadata',
    ];

    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        provider[field] = data[field];
      }
    });

    if (actor) {
      provider.updatedBy = actor;
    }

    await provider.save();
    return sanitizeProvider(provider);
  }

  async toggleActive(id, isActive, actor) {
    const provider = await CarrierProvider.findById(id);
    if (!provider) throw new Error('Carrier provider not found');

    provider.isActive = Boolean(isActive);
    if (actor) {
      provider.updatedBy = actor;
    }
    await provider.save();

    return sanitizeProvider(provider);
  }

  async delete(id, actor) {
    const provider = await CarrierProvider.findById(id);
    if (!provider) throw new Error('Carrier provider not found');

    await CarrierProvider.findByIdAndDelete(id);
    return sanitizeProvider(provider);
  }

  async getStats(id) {
    const provider = await CarrierProvider.findById(id);
    if (!provider) throw new Error('Carrier provider not found');

    const storesUsingCount = await StoreCarrierProvider.countDocuments({
      carrierProviderId: id,
      isActive: true,
    });

    const totalShipments = await Shipment.countDocuments({
      carrierProviderId: id,
    });

    const failedShipments = await Shipment.countDocuments({
      carrierProviderId: id,
      status: { $in: ['failed_delivery', 'returned'] },
    });

    const failureRate = totalShipments > 0 ? (failedShipments / totalShipments * 100).toFixed(2) : 0;

    return {
      providerId: id,
      name: provider.name,
      activeStores: storesUsingCount,
      totalShipments,
      failedShipments,
      failureRate: parseFloat(failureRate),
    };
  }
}

module.exports = new CarrierProviderService();
