const ShippingZone = require("../models/ShippingZone");
const StoreCarrierProvider = require("../models/shipping/StoreCarrierProvider");

const REST_OF_WORLD_NAME = "Rest of the World";

const createShippingZone = async (storeId, data) => {
  const zoneCount = await ShippingZone.countDocuments({ storeId });

  const newShippingZone = new ShippingZone({
    storeId,
    name: data.name,
    countries: Array.isArray(data.countries) ? data.countries : [],
    zipCodes: Array.isArray(data.zipCodes) ? data.zipCodes : [],
    order: zoneCount,
  });
  return newShippingZone.save();
};

// Every store gets exactly one of these: the catch-all zone with no regions,
// matched only when nothing else does. Safe to call repeatedly  a no-op
// once the store already has one.
const seedDefaultZoneForStore = async (storeId) => {
  const existing = await ShippingZone.findOne({ storeId, isDefault: true });
  if (existing) return existing;

  return ShippingZone.create({
    storeId,
    name: REST_OF_WORLD_NAME,
    countries: [],
    zipCodes: [],
    order: Number.MAX_SAFE_INTEGER,
    isDefault: true,
  });
};

const getAllShippingZones = async (storeId) => {
  return ShippingZone.find({ storeId }).sort({ isDefault: 1, order: 1, _id: -1 });
};

const getShippingZoneById = async (id, storeId) => {
  return ShippingZone.findOne({ _id: id, storeId });
};

const updateShippingZone = async (id, storeId, data) => {
  const zone = await ShippingZone.findOne({ _id: id, storeId });
  if (!zone) return null;

  zone.name = data.name;

  if (!zone.isDefault) {
    zone.countries = Array.isArray(data.countries) ? data.countries : [];
    zone.zipCodes = Array.isArray(data.zipCodes) ? data.zipCodes : [];
  }

  if (data.mode !== undefined) {
    const mode = data.mode;
    if (!["manual", "live"].includes(mode)) {
      const error = new Error(`Invalid mode: ${mode}`);
      error.name = "InvalidShippingMode";
      throw error;
    }

    if (mode === "live") {
      if (!data.carrierProviderId) {
        const error = new Error("Carrier provider is required when mode is 'live'");
        error.name = "MissingCarrierProvider";
        throw error;
      }

      const carrierConnection = await StoreCarrierProvider.findOne({
        _id: data.carrierProviderId,
        storeId,
        isActive: true,
      });

      if (!carrierConnection) {
        const error = new Error("Carrier provider not found or not active for this store");
        error.name = "CarrierProviderNotFound";
        throw error;
      }

      zone.mode = mode;
      zone.carrierProviderId = data.carrierProviderId;
    } else {
      zone.mode = "manual";
      zone.carrierProviderId = undefined;
    }
  }

  await zone.save();
  return zone;
};

const deleteShippingZone = async (id, storeId) => {
  const zone = await ShippingZone.findOne({ _id: id, storeId });
  if (!zone) return null;
  if (zone.isDefault) {
    const error = new Error("The default \"Rest of the World\" zone can't be deleted");
    error.name = "CannotDeleteDefaultZone";
    throw error;
  }

  await ShippingZone.findOneAndDelete({ _id: id, storeId });
  return zone;
};

const reorderShippingZones = async (storeId, orderedIds) => {
  await Promise.all(
    orderedIds.map((id, index) =>
      ShippingZone.findOneAndUpdate(
        { _id: id, storeId, isDefault: { $ne: true } },
        { order: index }
      )
    )
  );
  return getAllShippingZones(storeId);
};

const FREE_SHIPPING_REQUIREMENTS = [
  "no_requirement",
  "coupon",
  "min_amount",
  "min_amount_or_coupon",
  "min_amount_and_coupon",
];

const buildMethodFields = (data) => ({
  type: data.type,
  title: data.title,
  enabled: data.enabled !== undefined ? !!data.enabled : true,
  cost: typeof data.cost === "number" ? data.cost : Number(data.cost) || 0,
  taxStatus: data.taxStatus === "none" ? "none" : "taxable",
  freeShippingRequirement: FREE_SHIPPING_REQUIREMENTS.includes(data.freeShippingRequirement)
    ? data.freeShippingRequirement
    : "no_requirement",
  minOrderAmount:
    data.minOrderAmount === null || data.minOrderAmount === undefined || data.minOrderAmount === ""
      ? null
      : Number(data.minOrderAmount),
  applyMinBeforeCouponDiscount: !!data.applyMinBeforeCouponDiscount,
});

const addShippingMethod = async (zoneId, storeId, data) => {
  const zone = await ShippingZone.findOne({ _id: zoneId, storeId });
  if (!zone) return null;

  zone.methods.push({ ...buildMethodFields(data), order: zone.methods.length });
  await zone.save();
  return zone;
};

const updateShippingMethod = async (zoneId, storeId, methodId, data) => {
  const zone = await ShippingZone.findOne({ _id: zoneId, storeId });
  if (!zone) return null;

  const method = zone.methods.id(methodId);
  if (!method) return null;

  Object.assign(method, buildMethodFields({ ...method.toObject(), ...data }));
  await zone.save();
  return zone;
};

const deleteShippingMethod = async (zoneId, storeId, methodId) => {
  const zone = await ShippingZone.findOne({ _id: zoneId, storeId });
  if (!zone) return null;

  const method = zone.methods.id(methodId);
  if (!method) return null;


  zone.methods.pull(methodId);
  await zone.save();
  return zone;
};

const reorderShippingMethods = async (zoneId, storeId, orderedMethodIds) => {
  const zone = await ShippingZone.findOne({ _id: zoneId, storeId });
  if (!zone) return null;

  const reordered = orderedMethodIds
    .map((methodId) => zone.methods.id(methodId))
    .filter(Boolean);

  reordered.forEach((method, index) => {
    method.order = index;
  });
  zone.methods = reordered;

  await zone.save();
  return zone;
};

module.exports = {
  createShippingZone,
  seedDefaultZoneForStore,
  getAllShippingZones,
  getShippingZoneById,
  updateShippingZone,
  deleteShippingZone,
  reorderShippingZones,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  reorderShippingMethods,
};
